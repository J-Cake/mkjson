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
import updateDependencies, { isOlder, lsdir } from './dependency.js';

export default updateDependencies;
/**
 * 
 * @param target The name of the artifact (filename) being produced
 * @param rule Instructions on how to build the artifact, as well as its dependencies
 * @returns Whether the artifact was updated
 */
export async function orderOnly(target: string, rule: Rule): Promise<void> {
    const { makefile, makefilePath, force } = config.get();
    const origin = makefilePath.split('/').slice(0, -1).join('/');
    const mtime = await fs.stat(toAbs(target, origin))
        .then(stat => stat.mtime.getTime())
        .catch(() => 0);

    log.debug(`orderOnly:`, rule.orderOnly);

    for (const i of rule.orderOnly ?? []) {
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
                    await run(i);
            }
        }
    }
}