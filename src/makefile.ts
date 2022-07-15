/**
 * Locate, parse and validate the requested makefile
 * Host and export types
 */

import fss, { promises as fs } from 'node:fs';
import stream from 'node:stream';
import os from 'node:os';
import chalk from 'chalk';
import * as iter from '@j-cake/jcake-utils/iter';

import { log } from './log.js';
import { config } from './index.js';

export interface Rule {
    dependencies?: string[],
    orderOnly?: string[],
    run?: string[],
    phony?: boolean,
    parallel?: boolean,
    ignoreFailed?: boolean,
    isolate?: boolean
}

export interface Makefile {
    targets: Record<string, Rule>,
    variables: Record<string, string>,
};

export default async function findMakefile(path?: string): Promise<Makefile> {
    if (path == '--') {
        log.verbose(`Reading makefile from stdin`);
        config.setState({ makefilePath: process.cwd() });
        return loadMakefile(process.stdin);
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

        config.setState({ makefilePath: location });
        return await loadMakefile(fss.createReadStream(location));
    } else {
        const segments = process.cwd().split('/');
        let error: any;

        while (segments.length > 0) {
            log.debug(`Searching for makefile in ${chalk.yellow(segments.join('/'))}`);
            const dir = segments.join('/');

            searchFile: for (const location of [`${dir}/makefile.json`, `${dir}/makefile.json5`, `${dir}/makefile`, `${dir}/Makefile`, `${dir}/package.json`])
                if (await fs.stat(location).then(stat => stat.isFile()).catch(() => false))
                    try {
                        log.verbose(`Trying Makefile ${chalk.yellow(location)}`);
                        config.setState({ makefilePath: location });
                        return await loadMakefile(fss.createReadStream(location))
                            .then(function (makefile) {
                                log.verbose(`Loaded Makefile ${chalk.yellow(location)}`);
                                return makefile;
                            });
                    } catch (err) {
                        if (config.get().logLevel == 'debug')
                            log.err(error = err);

                        continue searchFile;
                    }

            segments.pop();
        }

        if (error)
            throw void log.err(error);
    }

    throw void log.err(`No makefile found`);
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

export async function loadMakefile(handle: stream.Readable): Promise<Makefile> {
    try {

        const { default: JSON } = await import('json5').catch(err => ({ default: JSON })) as { default: typeof global.JSON };
        const file = JSON.parse(Buffer.concat(await iter.collect(handle)).toString('utf8'));

        if (!('targets' in file))
            throw `Expected ${chalk.yellow('targets')} section in makefile`;
        else if (!Object.entries(file.targets).every(([a, i]) => [log.debug(`Checking Target: ${chalk.yellow(a)}`), isTarget(i)][1]))
            throw `Invalid Makefile`;

        if ('variables' in file)
            if (typeof file.variables !== 'object' || Array.isArray(file.variables))
                throw `Expected named variable map`;
            else if (!Object.entries(file.variables).every(([a, i]) => typeof i == 'string' || (Array.isArray(i) && i.every(i => typeof i == 'string'))))
                throw `Expected string or list of strings`;

        log.verbose(`Loaded Makefile`);

        return {
            targets: file.targets,
            variables: file.variables
        } as Makefile;
    } catch (err) {
        throw `Invalid Makefile: ${chalk.grey(err instanceof Error ? err.message : err?.toString())}`;
    }
}