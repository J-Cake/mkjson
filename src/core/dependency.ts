import chalk from 'chalk';
import _ from 'lodash';
import {iter, Iter} from "@j-cake/jcake-utils/iter";

import {getRule, MatchResult, Rule} from "./targetList.js";
import {config} from "./config.js";
import log from "./log.js";
import lsGlob, * as path from "./path.js";
import * as plugin from './plugin.js';

/**
 * Recursively run a build step, and ensure its dependencies are up-to-date.
 * @param rules a list of rules to run
 * @returns whether the rule build step was run
 */
export default async function run(...rules: MatchResult[]): Promise<boolean> {
    let didRun = false;
    const force = config.get().force;
    for (const {file, wildcards, rule} of rules) {
        log.verbose(`Building ${chalk.blue(file)}`);
        log.debug("File:", file, "Wildcards:", wildcards);
        let isUpToDate = true;
        if (rule?.dependencies)
            for await (const dep of Iter(rule.dependencies)
                .map(i => path.toAbs(i))
                .map(i => path.insertWildcards(i, wildcards))) { // TODO: allow wildcards to be used in dependencies using \n syntax

                const glob: { file: string, wildcards: string[], rule?: Rule }[] = [...await getRule(dep), ...await iter.collect(lsGlob(dep))]

                const dependencies: { file: string, wildcards: string[], rule?: Rule }[] = [];
                for (const i of glob) // remove duplicates
                    if (!dependencies.some(j => i.file == j.file))
                        dependencies.push(i);

                const fileMtime = await plugin.API.getMTime(file).catch(_ => 0);
                let hasModifiedDependency = await Iter(dependencies)
                    .map(async i => await plugin.API.getMTime(i.file).catch(_ => Infinity))
                    .await()
                    .filter(i => i > fileMtime)
                    .collect();

                // TODO: Order-only dependencies

                log.debug("Dep", dep);

                if (hasModifiedDependency.length > 0) {
                    log.debug(`Dependency ${chalk.blue(dep)} is out-of-date`);
                    isUpToDate = false;
                    await run(...dependencies.filter(i => i.rule) as MatchResult[]);
                } else
                    log.debug(`Dependency ${chalk.blue(dep)} is up-to-date`);
            }

        if (!isUpToDate || rule.phony || force)
            if ((didRun = true) && rule?.run)
                if (!await rule.run(file, _.chain({})
                    .merge(process.env as Record<string, string>)
                    .merge(rule.env)
                    .merge(_.chain([file, ...wildcards])
                        .map((i, a) => [`target_${a}`, i] as [`target_${number}`, string])
                        .fromPairs()
                        .value())
                    .value()))
                    log.err(`Run step for ${chalk.yellow(file)} failed.`);
                else
                    log.verbose(`Run step for ${chalk.yellow(file)} succeeded`);
            else
                log.debug(`Rule for ${chalk.yellow(file)} did not specify a run step.`);
        else log.info(`Target ${chalk.yellow(file)} is up-to-date`);
    }

    return didRun;
}