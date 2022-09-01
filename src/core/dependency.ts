import {promises as fs} from 'node:fs';
import chalk from 'chalk';
import {Iter} from "@j-cake/jcake-utils/iter";

import {getRule, MatchResult} from "./targetList.js";
import log from "./log.js";

/**
 * Recursively run a build step, and ensure its dependencies are up-to-date.
 * @param rules a list of rules to run
 */
export default async function run(rules: MatchResult[]): Promise<boolean> {
    let didRun = false;
    for (const rule of rules) {
        const dependencies = await Iter(rule.rule.dependencies ?? [])
            .map(i => getRule(i))
            .await()
            .collect();

        const uniqueDependencies: string[] = [];

        for (const i of dependencies.flat().map(i => i.file))
            if (!uniqueDependencies.includes(i))
                uniqueDependencies.push(i);

        const isUpToDate = await Iter(uniqueDependencies)
            .map(async i => ({
                isUpToDate: await fs.stat(i)
                    .then(stat => stat.mtime)
                    .catch(() => Infinity) > await fs.stat(rule.file)
                    .then(stat => stat.mtime)
                    .catch(() => 0),
                dependency: i
            }))
            .await()
            .map(async i => (i.isUpToDate ? true : await run(await getRule(i.dependency)), false) as boolean)
            .await()
            .collect()
            .then(dependencies => !dependencies.includes(false));

        if (isUpToDate)
            log.info(`Target ${chalk.yellow(rule.file)} is up-to-date`);
        else
            log.verbose(`Target ${chalk.yellow(rule.file)} is out-of-date`);
    }

    return didRun;
}