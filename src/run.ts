/**
 * Handles user-input and steps through necessary process to update all requested dependencies
 */

import os from 'node:os';
import cp from 'node:child_process';
import chalk from 'chalk';
import IterSync from '@j-cake/jcake-utils/iterSync';

import { Rule } from './makefile.js';
import { config } from './index.js';
import { log } from './log.js';
import * as dependency from './dependency.js';

export const select = <T>(obj: any, selector: string[]): T => obj && (selector.length > 0 ? select(obj[selector[0]], selector.slice(1)) : obj);
export const toAbs = (target: string, origin: string): string => (target.startsWith('/') ? target : target.startsWith('~?') ? `${os.homedir()}/${target.slice(2)}` : (`${origin}/${target}`.replaceAll('//', '/'))).replaceAll(/\.\.\/[^\/]*/g, '').replaceAll(/\.\//g, '/').replaceAll('//', '/');

export function matches(target: string, request: string): boolean {
    const targets = target.split(/[\s;,\|]/g);

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

export default async function buildArtifacts(artifacts: string[]): Promise<void> {
    const { makefile, makefilePath, force } = config.get();
    const origin = makefilePath.split('/').slice(0, -1).join('/');

    for (const i of artifacts.length >= 1 ? artifacts : [Object.keys(config.get().makefile.targets)[0]]) {
        log.verbose(`Resolving artifact: ${i}`);

        const absTarget = toAbs(i, origin);
        const rules = IterSync(Object.entries(makefile.targets))
            .filtermap(([target, rule]) => matches(toAbs(target, origin), absTarget) ? [target, rule] as [string, Rule] : null)
            .collect();

        if (rules.length <= 0) {
            log.err(`No rule found for ${i}`);
            continue;
        }

        for (const [target, rule] of rules)
            if (force || await dependency.updateDependencies(target, rule) || rule.phony)
                // move `|| rule.phony` to the end so that dependencies are updated regardless of whether the rule is phony,
                // otherwise dependencies would _never_ run (that's how phony works after all).
                await run(rule);
            else
                log.info(`Target ${chalk.yellow(target)} is up-to-date`);

    }
}

/**
 * 
 * @param rule Instructions on how to build the artifact, as well as its dependencies
 * @returns Whether the commands completed successfully
 */
export function run(rule: Rule): Promise<boolean> {
    if (!rule)
        return Promise.resolve(true);

    return new Promise(async function (resolve, reject) {
        if (!rule.run)
            return resolve(true);

        const run = typeof rule.run == 'string' ? [rule.run] : rule.run;

        const env = {
            'mkjson': `${process.argv[0]} ${process.argv[1]}`,
            ...process.env
        };

        if (rule.parallel)
            if (rule.isolate ?? true) {
                log.info(`Running: ${chalk.grey(run.join(', '))}`);

                return await Promise.all(run.map(i => new Promise<number>(ok => cp.spawn('bash', ['-c', i], { stdio: 'inherit', env }).once('exit', ok))))
                    .then(codes => (rule.ignoreFailed || codes.every(i => i == 0)) ? resolve(codes.every(i => i == 0)) : reject(false))
            } else {
                log.info(`Running: ${chalk.grey(`bash -c ${run.join(' & ')} & wait`)}`);

                return cp.spawn('bash', ['-c', run.join(' & ') + ' & wait'], { stdio: 'inherit', env })
                    .once('exit', code => (rule.ignoreFailed || code == 0) ? resolve(code == 0) : reject(false));
            }
        else
            if (rule.isolate ?? true)
                for (const i of run) {
                    log.info(`Running: ${chalk.grey(i)}`);
                    await new Promise(ok => cp.spawn('bash', ['-c', i], { stdio: 'inherit', env }).once('exit', ok));
                }
            else {
                log.info(`Running: ${chalk.grey(`bash -c ${run.join(' && ')}`)}`);
                await new Promise(ok => cp.spawn('bash', ['-c', run.join(' && ')], { stdio: 'inherit', env }).once('exit', ok))
                    .then(code => (rule.ignoreFailed || code == 0) ? resolve(code == 0) : reject(false));
            }

        resolve(true);
    });
}