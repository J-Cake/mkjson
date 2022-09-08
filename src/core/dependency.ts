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
    // let didRun = false;
    // for (const rule of rules) {
    //
    //     const depList = rule.rule.dependencies ?? [];
    //     const dependencies = await Iter<{ file: string, wildcards: string[] }>([])
    //         .interleave(...depList
    //             .map(i => lsGlob(path.toAbs(i))))
    //         .concat(await Promise
    //             .all(depList
    //                 .map(i => getRule(i)))
    //             .then(res => res
    //                 .flat()))
    //         .filter(i => !!i)
    //         .collect();
    //
    //     // TODO: This is a good place for optimisation
    //
    //     const uniqueDependencies: { file: string, wildcards: string[], rule?: Rule }[] = [];
    //
    //     for (const i of dependencies.flat())
    //         if (!uniqueDependencies.some(j => j.file == i.file))
    //             uniqueDependencies.push(i);
    //
    //     log.debug(`Dependencies`, uniqueDependencies.map(i => i.file));
    //
    //     let isUpToDate = true;
    //
    //     for (const i of uniqueDependencies) {
    //         const wasModified = await fs.stat(i.file)
    //             .then(stat => stat.mtime)
    //             .catch(() => 0) < await fs.stat(rule.file)
    //             .then(stat => stat.mtime)
    //             .catch(() => Infinity);
    //
    //         log.debug(wasModified ? `${chalk.yellow(i.file)} was modified` : `${chalk.yellow(i.file)} has not been modified`);
    //
    //         if (wasModified)
    //             if (i.rule)
    //                 if (await run(i as MatchResult))
    //                     didRun = true;
    //     }
    //
    //     // const isUpToDate = await Iter(uniqueDependencies)
    //     //     .map(async i => ({
    //     //         isUpToDate: await fs.stat(i)
    //     //             .then(stat => stat.mtime)
    //     //             .catch(() => Infinity) > await fs.stat(rule.file)
    //     //             .then(stat => stat.mtime)
    //     //             .catch(() => 0),
    //     //         dependency: i
    //     //     }))
    //     //     .await()
    //     //     .map(i => (i.isUpToDate ? log.debug(`${chalk.yellow(i.dependency)} hasn't been modified`) : log.debug(`${chalk.yellow(i.dependency)} was modified`), i))
    //     //     .map(async i => (i.isUpToDate ? true : await run(await getRule(i.dependency)), false) as boolean)
    //     //     .await()
    //     //     .collect()
    //     //     .then(dependencies => !dependencies.includes(false));
    //
    //     if (isUpToDate) // TODO: Run rule
    //         log.info(`Target ${chalk.yellow(rule.file)} is up-to-date`);
    //
    //     if (!isUpToDate || config.get().force || rule.rule.phony) {
    //         log.verbose(`Running target ${chalk.yellow(rule.file)}`);
    //
    //         const wildcards = _.chain(rule.wildcards)
    //             .map((i, a) => [`wildcard-${a}`, i])
    //             .fromPairs()
    //             .value()
    //
    //         const env: Record<string, string> = _.chain({})
    //             .merge(process.env)
    //             .merge(rule.rule.env)
    //             .pickBy(i => i)
    //             .merge(wildcards)
    //             .value()
    //
    //         const didSucceed = await rule.rule.run?.(rule.file, env);
    //
    //         if (['debug', 'verbose'].includes(config.get().logLevel))
    //             if (!didSucceed)
    //                 log.err(`Failed to build ${chalk.yellow(rule.file)}`);
    //     }
    // }
    //
    // return didRun;

    let didRun = false;
    const force = config.get().force;
    for (const {file, wildcards, rule} of rules) {
        log.verbose(`Building ${chalk.blue(file)}`);
        let isUpToDate = true;
        if (rule?.dependencies)
            for await (const dep of Iter(rule.dependencies).map(i => path.toAbs(i))) { // TODO: allow wildcards to be used in dependencies using \n syntax
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
                    .merge(_.chain(wildcards)
                        .map((i, a) => [`target_${a}`, i] as [string, string])
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