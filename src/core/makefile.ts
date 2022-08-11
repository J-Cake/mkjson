/**
 * Locate, parse and validate the requested makefile
 * Host and export types
 */

import fss, {promises as fs} from 'node:fs';
import stream from 'node:stream';
import os from 'node:os';
import chalk from 'chalk';
import _ from 'lodash';
import {iter} from '@j-cake/jcake-utils/iter';

import {config} from './index.js';
import {log} from './log.js';
import type {TargetHandler} from '../lib.js'

export interface Rule {
    dependencies?: string[],
    orderOnly?: string[],
    run?: TargetHandler,
    phony?: boolean,
    parallel?: boolean,
    ignoreFailed?: boolean,
    isolate?: boolean,
    env?: Record<string, string | string[]>,
    cwd?: string
}

export interface Makefile {
    targets: Record<string, Rule>,
    env: Record<string, string>,
}

export default async function findMakefile(path?: string): Promise<void> {
    const find = async function (path?: string): Promise<{ mk: Makefile, location: string }> {
        if (path == '--') {
            log.verbose(`Reading makefile from stdin`);
            return {
                mk: await constructFromJSON(process.stdin),
                location: process.cwd()
            };
        } else if (path) {
            const location = await fs.realpath((path.startsWith('/') ? path :
                path.startsWith('~/') ? os.homedir() + path.slice(2) :
                    path.startsWith('./') ? process.cwd() + path.slice(2) :
                        path)
                .replaceAll('/./', '/')
                .replaceAll(/[^\/]+\/\.\.\//g, ''));

            log.verbose(`Resolving Makefile: ${path} => ${location}`);

            if (await fs.stat(location).then(stat => !stat.isFile()).catch(() => true))
                throw void log.err(`Invalid makefile: ${chalk.yellow(location)}`);

            if (location.split('/')?.pop()?.split('.').find(i => i == 'js') && !config.get().blockScripts) {
                log.verbose(`Loading as script`);
                return {
                    location,
                    mk: {
                        targets: {},
                        env: await import(location) ?? {}
                    }
                }
            } else
                return {
                    location,
                    mk: await constructFromJSON(fss.createReadStream(location))
                }
        } else {
            const segments = process.cwd().split('/');
            let error: any;

            while (segments.length > 0) {
                log.debug(`Searching for makefile in ${chalk.yellow(segments.join('/'))}`);
                const dir = segments.join('/');

                searchFile: for (const location of [`${dir}/makefile.js`, `${dir}/makefile.json`, `${dir}/makefile.json5`, `${dir}/makefile`, `${dir}/Makefile`, `${dir}/package.json`])
                    if (await fs.stat(location).then(stat => stat.isFile()).catch(() => false))
                        try {
                            log.verbose(`Trying Makefile ${chalk.yellow(location)}`);
                            return {
                                location,
                                mk: await constructFromJSON(fss.createReadStream(location))
                                    .then(function (makefile) {
                                        log.verbose(`Loaded Makefile ${chalk.yellow(location)}`);
                                        return makefile;
                                    })
                            }
                        } catch (err) {
                            if (config.get().logLevel == 'debug')
                                log.err(error = err);

                            continue searchFile;
                        }

                segments.pop();
            }

            if (error)
                throw void log.err(error);

            throw void log.err(`No makefile found`);
        }
    }

    const mk = await find(path);
    config.setState(prev => ({
        makefilePath: mk.location,
        makefile: _.merge({}, prev.makefile, mk)
    }));
}

export function isTarget(t: any): t is Rule {
    if ('dependencies' in t) {
        if (!Array.isArray(t.dependencies)) {
            log.err(`Expected array for ${chalk.yellow('dependencies')}`);
            log.debug(`dependencies: ${chalk.red('FAIL')}`);
            return false;
        } else if (!(t.dependencies as any[]).every(i => typeof i == 'string')) {
            log.err(`Expected string for value of ${chalk.yellow('dependencies')}`);
            log.debug(`dependencies: ${chalk.red('FAIL')}`);
            return false;
        }
        log.debug(`dependencies: ${chalk.green('OK')}`);
    }

    if ('orderOnly' in t) {
        if (!Array.isArray(t.orderOnly)) {
            log.err(`Expected array for ${chalk.yellow('orderOnly')}`);
            log.debug(`orderOnly: ${chalk.red('FAIL')}`);
            return false;
        } else if (!(t.orderOnly as any[]).every(i => typeof i == 'string')) {
            log.err(`Expected string for value of ${chalk.yellow('orderOnly')}`);
            log.debug(`orderOnly: ${chalk.red('FAIL')}`);
            return false;
        }
        log.debug(`orderOnly: ${chalk.green('OK')}`);
    }

    if ('run' in t) {
        if (!Array.isArray(t.run)) {
            if (typeof t.run != 'string') {
                log.err(`Expected array or string for ${chalk.yellow('run')}`);
                log.debug(`run: ${chalk.red('FAIL')}`);
                return false;
            }
        } else if (!(t.run as any[]).every(i => typeof i == 'string')) {
            log.err(`Expected string for value of ${chalk.yellow('orderOnly')}`);
            log.debug(`orderOnly: ${chalk.red('FAIL')}`);
            return false;
        }
        log.debug(`run: ${chalk.green('OK')}`);
    }

    if ('phony' in t) {
        if (typeof t.phony != 'boolean') {
            log.err(`Expected boolean for ${chalk.yellow('phony')}`);
            log.debug(`phony: ${chalk.red('FAIL')}`);
            return false;
        }
        log.debug(`phony: ${chalk.green('OK')}`);
    }
    log.debug(`Makefile: ${chalk.green('OK')}`);

    return true;
}

export async function constructFromJSON(handle: stream.Readable): Promise<Makefile> {
    try {
        const {default: JSON} = await import('json5').catch(err => ({default: JSON})) as { default: typeof global.JSON };
        const file = JSON.parse(Buffer.concat(await iter.collect(handle)).toString('utf8'));

        if (!('targets' in file))
            throw `Expected ${chalk.yellow('targets')} section in makefile`;
        else if (!Object.entries(file.targets).every(([a, i]) => [log.debug(`Checking Target: ${chalk.yellow(a)}`), isTarget(i)][1]))
            throw `Invalid Makefile`;

        if ('env' in file)
            if (typeof file.env !== 'object' || Array.isArray(file.env))
                throw `Expected named variable map`;
            else if (!Object.entries(file.env).every(([a, i]) => typeof i == 'string' || (Array.isArray(i) && i.every(i => typeof i == 'string'))))
                throw `Expected string or list of strings`;

        log.verbose(`Loaded Makefile`);

        return {
            targets: file.targets,
            env: file.env
        } as Makefile;
    } catch (err: any) {
        throw `Invalid Makefile: ${chalk.grey(err instanceof Error ? err.message : err?.toString())}`;
    }
}