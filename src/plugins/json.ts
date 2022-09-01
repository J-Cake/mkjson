import {promises as fs} from 'node:fs';
import chalk from "chalk";
import {iter} from '@j-cake/jcake-utils/iter';

import {log, TargetList} from "#core";
import * as shell from '../shell.js';

export type JSONRule = Partial<{
    dependencies?: string[],
    orderOnly?: string[],
    run?: string | string[],
    phony?: boolean,
    parallel?: boolean,
    ignoreFailed?: boolean,
    isolate?: boolean,
    env?: Record<string, string | string[]>,
    cwd?: string
}>
export type JSONMakefile = {
    env?: Record<string, string | string[]>,
    targets?: Record<string, JSONRule>
}

/**
 * Check whether a rule matches the schema for rules
 * @param obj
 * @param artifact
 */
export function isRule(obj: any, artifact: string): obj is JSONRule {
    if (typeof obj != 'object')
        return false;

    if ('dependencies' in obj)
        if (!Array.isArray(obj.dependencies))
            return false;
        else if (!obj.dependencies.every(i => typeof i == 'string'))
            return false;
    log.debug(`${chalk.blue(`${artifact}/dependencies`)} schema looks good`);

    if ('orderOnly' in obj)
        if (!Array.isArray(obj.orderOnly))
            return false;
        else if (!obj.orderOnly.every(i => typeof i == 'string'))
            return false;
    log.debug(`${chalk.blue(`${artifact}/orderOnly`)} schema looks good`);

    if ('run' in obj)
        if (typeof obj.run != 'string' && !(Array.isArray(obj.run) && obj.run.every(i => typeof i == 'string')))
            return false;
    log.debug(`${chalk.blue(`${artifact}/run`)} schema looks good`);

    if ('phony' in obj)
        if (typeof obj.phony != 'boolean')
            return false;
    log.debug(`${chalk.blue(`${artifact}/phony`)} schema looks good`);

    if ('parallel' in obj)
        if (typeof obj.parallel != 'boolean')
            return false;
    log.debug(`${chalk.blue(`${artifact}/parallel`)} schema looks good`);

    if ('ignoreFailed' in obj)
        if (typeof obj.ignoreFailed != 'boolean')
            return false;
    log.debug(`${chalk.blue(`${artifact}/ignoreFailed`)} schema looks good`);

    if ('isolate' in obj)
        if (typeof obj.isolate != 'boolean')
            return false;
    log.debug(`${chalk.blue(`${artifact}/isolate`)} schema looks good`);

    if ('env' in obj)
        if (typeof obj.env != 'object')
            return false;
        else
            for (const [a, i] of Object.entries(obj.env))
                if (typeof a != 'string')
                    return false;
                else if (typeof i != 'string' && !(Array.isArray(i) && i.every(i => typeof i == 'string')))
                    return false;
    log.debug(`${chalk.blue(`${artifact}/env`)} schema looks good`);

    if ('cwd' in obj)
        if (typeof obj.cwd != 'string')
            return false;
    log.debug(`${chalk.blue(`target/cwd`)} schema looks good`);

    return true;
}

/**
 * Check whether the given object matches the JSON schema
 * @param obj
 */
export function isMakefile(obj: any): obj is JSONMakefile {
    if (typeof obj != 'object')
        return false;

    if ('env' in obj)
        for (const [a, i] of Object.entries(obj.env))
            if (typeof a != 'string')
                return false;
            else if (typeof i != 'string')
                return false;
    log.debug(`${chalk.blue('env')} schema looks good`);

    if ('targets' in obj)
        for (const [a, i] of Object.entries(obj.targets))
            if (typeof a != 'string')
                return false;
            else if (!isRule(i, a))
                return false;
    log.debug(`${chalk.blue('targets')} schema looks good`);

    return true;
}

/**
 * Convert the JSON Makefile into the internal representation
 * @param makefile
 */
export async function buildMakefile(makefile: JSONMakefile): Promise<TargetList> {
    const env = {};

    if (makefile.env)
        for (const [a, i] of Object.entries(makefile.env))
            env[a] = await shell.pipe(i, env);

    const targets: TargetList = {};

    if (makefile.targets)
        for (const [a, i] of Object.entries(makefile.targets))
            targets[a] = {
                dependencies: i.dependencies ?? [],
                orderOnly: i.orderOnly ?? [],

                run: i.run ? shell.shell(i.run) : async () => true,

                phony: i.phony ?? false,

                cwd: i.cwd ?? process.cwd(),
                env: {
                    ...process.env,
                    ...env,
                    ...i.env ?? {}
                },
            };

    return targets;
}

/**
 * Load a JSON makefile
 * @param hint Can be any file ending in `.json` or `.json5`
 */
export async function loadMakefile(hint: string): Promise<TargetList> {
    if (!['json', 'json5'].some(i => hint.toLowerCase().endsWith(i)))
        throw `${chalk.blue('.json')} or similar extensions are required`;

    if (!await fs.stat(hint).then(stat => stat.isFile() || stat.isSymbolicLink()).catch(() => false))
        throw `Expected real file`;

    const {default: json} = await import('json5').catch(err => ({default: JSON}));

    const file = await fs.open(hint, 'r');
    const chunks = await iter.collect(file.createReadStream() as AsyncIterable<Buffer>);
    const buffer = Buffer.concat(chunks).toString('utf8');
    const makefile = json.parse(buffer);

    if (isMakefile(makefile))
        return await buildMakefile(makefile);

    else throw `Unexpected makefile schema`;
}