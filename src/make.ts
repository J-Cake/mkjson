import { promises as fs } from 'node:fs';
import os from 'node:os';
import cp from 'node:child_process';
import stream, { Stream } from 'node:stream';
import rl from 'node:readline';
import Iter from "@j-cake/jcake-utils/iter";
import chalk from 'chalk';
import json5 from 'json5';

import { Config } from "./config.js";
import * as log from './log.js';
import needsUpdating from './modified.js';
import _ from 'lodash';

export interface Rule {
    phony?: boolean,
    dependencies?: string[],
    run?: string[] | string,
}

export interface Makefile {
    runTarget(...target: string[]): Promise<boolean>
}

export const select = <T>(obj: any, selector: string[]): T => obj && (selector.length > 0 ? select(obj[selector[0]], selector.slice(1)) : obj);
export const toAbs = (target: string, origin: string): string => (target.startsWith('/') ? target : target.startsWith('~?') ? `${os.homedir()}/${target.slice(2)}` : (`${origin}/${target}`.replaceAll('//', '/'))).replaceAll(/\.\.\/[^\/]*/g, '').replaceAll(/\.\//g, '/').replaceAll('//', '/');

export function matches(target: string, request: string): boolean {
    const targets = target.split(/\s;,/g);

    for (const t of targets) {
        if (t == request)
            return true;

        const toRegExp = (str: string) =>
            new RegExp(decodeURIComponent(str.replaceAll(/([.\-\/^$?\(\)\[\]\{\}])/g, '\\$1').replaceAll('*', '.*').replaceAll('+', '[^\/]*')), 'g')

        if (toRegExp(t).test(request) || toRegExp(request).test(t))
            return true;
    }

    return false;
}

export async function getRule(this: Record<string, Rule>, target: string, origin: string): Promise<Rule | null> {
    // 1. Convert `target` to an absolute path
    const absTarget = toAbs(target, origin);
    log.debug('getRule', { abs: chalk.yellow(absTarget), rel: chalk.yellow(target) })
    // 2. Find the list of targets that match the `target`
    for (const [target, rule] of Object.entries(this))
        if (matches(absTarget, toAbs(target, origin)))
            return rule;

    return null;
}

export default async function parseMakefile(config: Config): Promise<Makefile> {
    if (!config.origin)
        log.verbose('parsing', { origin: `${chalk.yellow('stdin')}/${config.selector.join('.')}` });
    else
        log.verbose('parsing', { origin: `${config.origin}/${config.selector.join('.')}` });

    const targets = select<Record<string, Rule> | undefined>(await Iter(config.origin ? (await fs.open(config.origin, 'r')).createReadStream() : process.stdin)
        .collect()
        .then((data: Buffer[]) => data.map(i => i.toString('utf8')).join(''))
        .then((data: string) => json5.parse(data)), config.selector);

    if (typeof targets !== 'object')
        throw `Invalid makefile: ${config.origin ? chalk.yellow(config.origin) : chalk.blue('stdin')}. Expected Target Map.`;

    return {
        async runTarget(...run: string[]): Promise<boolean> { // indicates whether the rule ran (may not have if the target wasn't modified)
            log.verbose('runningTargets', { targets: chalk.yellow(run.join(', ')) });

            for (const target of run) {
                log.verbose('runningTarget', { target: chalk.yellow(target) });

                const makefile = config.origin ? await fs.realpath(config.origin).then(path => path.split('/').slice(0, -1).join('/')) : process.cwd();
                const rule = await getRule.bind(targets)(target, makefile);

                if (!rule) {
                    log.err('noTarget', { target: chalk.yellow(target) });
                    continue;
                }

                if (!config.force && !await needsUpdating.bind(targets)(rule, target, makefile)) {
                    log.info('upToDate', { target: chalk.yellow(target) });
                    continue;
                }

                const run = (cmd: string) => new Promise(ok => {
                    log.info('running', { cmd: chalk.grey(cmd) });
                    const sh = cp.spawn(config.shell ?? 'sh', ['-c', cmd], { env: _.merge({}, process.env, config.env) }).once('exit', code => ok(code));
                    // optionally prefix lines with something
                    
                    if (config.logLevel !== 'err')
                        stream.Readable.from(Iter([] as Buffer[]).interleave(sh.stdout, sh.stderr).filter(i => !!i)).pipe(process.stdout, { end: false });
                    else
                        sh.stderr.pipe(process.stdout);
                });

                if (rule.run)
                    if (typeof rule.run == 'string') 
                        await run(rule.run);
                    else for (const cmd of rule.run)
                        await run(cmd);
            }

            return true;
        },
    }
}