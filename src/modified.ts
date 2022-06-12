import { promises as fs } from 'node:fs';

import { getRule, Makefile, Rule, toAbs } from "./make.js";
import * as log from './log.js';
import chalk from 'chalk';

export async function* lsdir(path: string): AsyncGenerator<string> {
    for (const file of await fs.readdir(path))
        if (await fs.stat(`${path}/${file}`).then(stat => stat.isDirectory()))
            yield* lsdir(`${path}/${file}`);
        else yield `${path}/${file}`;
}

export async function isOlder(selector: string, target: number): Promise<boolean> {
    const pathSegments = selector.split('/');
    const wildcard = pathSegments.findIndex(i => i.includes('*') || i.includes('+'));

    if (wildcard <= 0) {
        if (await fs.stat(selector).then(stat => stat.mtime.getTime()).catch(() => Infinity) > target) {
            log.debug('isOlder', { selector: chalk.yellow(selector) });
            return true;
        }
    } else for await (const i of lsdir(pathSegments.slice(0, wildcard).join('/')))
        if (await fs.stat(i).then(stat => stat.mtime.getTime()).catch(() => Infinity) > target) {
            log.debug('isOlder', { selector: chalk.yellow(i) });
            return true;
        }

    
    return false;
}

export default async function needsUpdating(this: Record<string, Rule>, rule: Rule, target: string, makefile: string): Promise<boolean> {
    console.log(rule, target, makefile);
    const targetModified = rule.phony ? 0 : await fs.stat(toAbs(target, makefile)).then(stat => stat.mtime.getTime()).catch(err => 0);

    for (const i of rule.dependencies ?? []) {
        const rule = await getRule.bind(this)(i, makefile);

        if (!rule)
            if (await isOlder(toAbs(i, makefile), targetModified))
                return true;

    }

    return false;
}