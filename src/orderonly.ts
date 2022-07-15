/**
 * Checks and updates dependencies as necessary
 */
import { promises as fs } from 'node:fs';
import chalk from 'chalk';
import _ from 'lodash';
import IterSync from '@j-cake/jcake-utils/iterSync';

import { config, Force } from './index.js';
import { Rule as Rule } from "./makefile.js";
import { run, matches, toAbs } from './run.js';
import { log } from './log.js';
import updateDependencies from './dependency.js';

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
        log.verbose(`Checking order-only ${chalk.green(i)}`);

        const absTarget = toAbs(i, origin);
        const targets = Object.entries(makefile.targets);
        const dependencies = IterSync(targets)
            .filtermap(function ([target, rule]) {
                const match = matches(target, absTarget, origin);
                if (match)
                    return {
                        target,
                        rule,
                        targetNames: match
                    };
                else return null;
            })
            .collect();

        log.debug(`Resolved order-only-dependency to ${chalk.green(absTarget)}.`);

        if (dependencies.length > 0) { // the dependency exist in the makefile
            for (const { target, rule, targetNames } of dependencies) {
                log.debug(`Updating order-only dependent ${chalk.green(target)}`);

                if (await updateDependencies(target, rule) || force == Force.Absolute)
                    await run(rule, _.fromPairs(targetNames.map((i, a) => [`target_${a}`, i])));
            }
        }
    }
}