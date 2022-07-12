/**
 * Checks and updates dependencies as necessary
 */
import { promises as fs } from 'node:fs';
import chalk from 'chalk';
import IterSync from '@j-cake/jcake-utils/iterSync';
import Iter from '@j-cake/jcake-utils/iter';

import { config, Force } from './index.js';
import { Rule as Rule } from "./makefile.js";
import { run, matches, toAbs } from './run.js';
import { log } from './log.js';
import { orderOnly } from './orderonly.js';

/**
 * 
 * @param path The path whose contents are to be listed
 */
export async function* lsdir(path: string): AsyncGenerator<string> {
    for (const file of await fs.readdir(path))
        if (await fs.stat(`${path}/${file}`).then(stat => stat.isDirectory()))
            yield* lsdir(`${path}/${file}`);
        else yield `${path}/${file}`;
}

/**
 * Compare the modification time of a file to a target time
 * @param selector The selector is a string that possibly contains wildcards
 * @param target Target is the file on disk / or makefile target
 * @returns whether the selector returned a value which was more recent than the target
 */
export async function isOlder(selector: string, target: number): Promise<boolean> {
    const pathSegments = selector.split('/');
    const wildcard = pathSegments.findIndex(i => i.includes('*') || i.includes('+'));

    if (wildcard <= 0) {
        if (await fs.stat(selector).then(stat => stat.mtime.getTime()).catch(() => 0) > target) {
            log.debug('isOlder', { selector: chalk.yellow(selector) });
            return true;
        }
    } else for await (const i of lsdir(pathSegments.slice(0, wildcard).join('/')))
        if (await fs.stat(i).then(stat => stat.mtime.getTime()).catch(() => 0) > target) {
            log.debug('isOlder', { selector: chalk.yellow(i) });
            return true;
        }


    return false;
}


export default updateDependencies;
/**
 * 
 * @param target The name of the artifact (filename) being produced
 * @param rule Instructions on how to build the artifact, as well as its dependencies
 * @returns Whether the artifact was updated
 */
export async function updateDependencies(target: string, rule: Rule): Promise<boolean> {
    const { makefile, makefilePath, force } = config.get();
    const origin = makefilePath.split('/').slice(0, -1).join('/');
    const mtime = await fs.stat(toAbs(target, origin))
        .then(stat => stat.mtime.getTime())
        .catch(() => 0);

    log.debug(`dependencies:`, rule.dependencies);

    let didUpdate: boolean = false;

    for (const i of rule.dependencies ?? []) {
        log.verbose(`Checking ${i}`);

        const absTarget = toAbs(i, origin);
        const targets = Object.entries(makefile.targets);
        const dependencies = IterSync(targets)
            .filtermap(([target, rule]) => matches(toAbs(target, origin), absTarget) ? [target, rule] as [string, Rule] : null)
            .collect();

        log.debug(`Resolved dependency to ${chalk.green(absTarget)}.`);

        if (dependencies.length > 0) { // the dependency exist in the makefile
            for (const [a, i] of dependencies) {
                log.debug(`Updating ${a}`, i);
                
                if (await updateDependencies(a, i) || force == Force.Absolute)
                    didUpdate = !void await run(i);
            }
        } else if (await isOlder(absTarget, mtime))// the dependency does not exist in the makefile, so it must be a file
            didUpdate = true;
    }

    log.debug(`${didUpdate ? 'Updated' : 'Unchanged'} ${target}`);
    log.verbose(`Running Order-Only dependencies`);

    await orderOnly(target, rule);

    return didUpdate;
}