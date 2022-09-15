import chalk from "chalk";

import log from "./log.js";
import {config} from "./config.js";
import {targets} from "./targetList.js";
import * as plugins from "./plugin.js";

/**
 * Uses loaded plugins to find and load makefiles from a user-provided hint
 * @param hint A string which indicates where to locate or how to load a particular makefile
 */
export async function loadMakefile(hint: string): Promise<void> {
    const loaded = Object.entries(plugins.plugins.get());

    log.verbose(`Loading ${hint}`);

    for (const [a, i] of loaded) {
        if (!i.loadMakefile)
            continue;

        log.debug(`Attempting loader: ${chalk.yellow(a)}`);
        const makefile = await i.loadMakefile(hint)
            .catch(err => void log.debug(err));

        if (makefile?.targets) {
            config.setState(prev => ({makefilePath: [...prev.makefilePath, makefile.path]}));

            return void targets.setState(prev => ({
                ...prev,
                ...makefile.targets
            }));
        } else
            log.debug(`Loader returned nothing`);
    }

    throw `No makefile found for ${chalk.yellow(hint)}`;
}

/**
 * Gets the time a file (or other resource) was last modified.
 * @param path {string}
 * @returns {number} a UNIX timestamp (including milliseconds)
 */
export function getMTime(path: string): Promise<Date | number> {
    const schemeName = path.match(/^[a-zA-Z][a-zA-Z0-9]*:(?=.*)/)?.[0] ?? 'file:';
    const scheme = plugins.schemes.get(schemeName);

    if (!scheme?.getMTime)
        throw `No scheme defined for ${schemeName}`;

    return scheme.getMTime(path);
}

/**
 * Get the size of a file or resource
 * @param path {string}
 * @returns {number} The size of the resource in bytes
 */
export function getSize(path: string): Promise<number> {
    const schemeName = path.match(/^[a-zA-Z][a-zA-Z0-9]*:(?=.*)/)?.[0] ?? 'file:';
    const scheme = plugins.schemes.get(schemeName);

    if (!scheme?.getSize)
        throw `No scheme defined for ${schemeName}`;

    return scheme.getSize(path);
}

/**
 * List the contents of a directory (or analogous construct)
 * @param path
 * @returns {AsyncIterable<string>} An async iterator over every **absolute** path inside `path`
 */
export function lsDir(path: string): AsyncIterable<string> {
    const schemeName = path.match(/^[a-zA-Z][a-zA-Z0-9]*:(?=.*)/)?.[0] ?? 'file:';
    const scheme = plugins.schemes.get(schemeName);

    if (!scheme?.lsDir)
        throw `No scheme defined for ${schemeName}`;

    return scheme.lsDir(path);
}

export type Encoding = 'utf8' | 'utf-8' | 'base64' | 'hex';

/**
 * Fetch the contents of a file or resource
 * @param path {string}
 * @returns {Buffer | string}
 */
export function fetch(path: string): Promise<Buffer>;
export function fetch(path: string, encoding: Encoding): Promise<string>;
export function fetch(path: string, encoding?: Encoding): Promise<Buffer | string> {
    const schemeName = path.match(/^[a-zA-Z][a-zA-Z0-9]*:(?=.*)/)?.[0] ?? 'file:';
    const scheme = plugins.schemes.get(schemeName);

    if (!scheme?.fetch)
        throw `No scheme defined for ${schemeName}`;

    return scheme.fetch(path);
}

/**
 * Create a function which matches against a glob string
 * @param globString
 * @returns {(str: string) => boolean} A function which returns whether the given string matches the glob
 */
export function createGlob(globString: string): plugins.Glob {
    if (plugins.glob)
        return plugins.glob(globString);

    throw `No glob handler defined`;
}