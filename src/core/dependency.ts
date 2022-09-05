import {promises as fs} from 'node:fs';
import chalk from 'chalk';
import _ from 'lodash';
import {iter, Iter} from "@j-cake/jcake-utils/iter";

import {getRule, MatchResult} from "./targetList.js";
import log from "./log.js";
import {config} from "./config.js";
import * as path from "./path.js";
import lsGlob from "./path.js";

/**
 * Recursively run a build step, and ensure its dependencies are up-to-date.
 * @param rules a list of rules to run
 */
export default async function run(rules: MatchResult[]): Promise<boolean> {
    let didRun = false;
    for (const rule of rules) {

        const depList = rule.rule.dependencies ?? [];
        const dependencies = await Iter<{ file: string, wildcards: string[] }>([])
            .interleave(...depList
                    .map(i => lsGlob(path.toAbs(i))))
            .concat(await Promise
                .all(depList
                    .map(i => getRule(i)))
                .then(res => res
                    .flat()))
            .filter(i => !!i)
            .collect();

        // TODO: This is a good place for optimisation

        console.log(rule.rule.dependencies?.map(i => path.toAbs(i)), dependencies);

        const uniqueDependencies: string[] = [];

        for (const i of dependencies.flat().map(i => i.file))
            if (!uniqueDependencies.includes(i))
                uniqueDependencies.push(i);

        log.debug(`Dependencies`, uniqueDependencies);

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
            .map(i => (i.isUpToDate ? log.debug(`${chalk.yellow(i.dependency)} hasn't been modified`) : log.debug(`${chalk.yellow(i.dependency)} was modified`), i))
            .map(async i => (i.isUpToDate ? true : await run(await getRule(i.dependency)), false) as boolean)
            .await()
            .collect()
            .then(dependencies => !dependencies.includes(false));

        if (isUpToDate) // TODO: Run rule
            log.info(`Target ${chalk.yellow(rule.file)} is up-to-date`);

        if (!isUpToDate || config.get().force || rule.rule.phony) {
            log.verbose(`Running target ${chalk.yellow(rule.file)}`);

            const wildcards = _.chain(rule.wildcards)
                .map((i, a) => [`wildcard-${a}`, i])
                .fromPairs()
                .value()

            const env: Record<string, string> = _.chain({})
                .merge(process.env)
                .merge(rule.rule.env)
                .pickBy(i => i)
                .merge(wildcards)
                .value()

            const didSucceed = await rule.rule.run?.(rule.file, env);

            if (['debug', 'verbose'].includes(config.get().logLevel))
                if (!didSucceed)
                    log.err(`Failed to build ${chalk.yellow(rule.file)}`);
        }
    }

    return didRun;
}