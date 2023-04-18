import os from 'node:os';
import {iterSync as iter} from '@j-cake/jcake-utils/iter';

import log from "./log.js";
import {config} from "./config.js";
import * as plugin from './plugin.js';

/**
 * Convert a canonical Windows path to the UNIX equivalent.
 * @param path
 * @returns the given drive letter is considered a root-level primitive.
 */
export const unixify = (path: string): string => path.replace(/(^[a-z]):/i, '/$1').replaceAll('\\', '/');

/**
 * Convert a unix path back to Windows only if actually on Windows
 * @param path
 */
export const deunixify = (path: string): string => ["cygwin", "win32"].includes(os.platform()) ? path.slice(1).replaceAll('/', '\\') : path;

/**
 * remove all
 * @param path
 */
export function traverse(path: string): string {
    let str = `/${path}`;
    const regex = /(^|\/[^\/]*)\/\.\.(?=\/|$)/;

    while (str.indexOf('..') > -1)
        str = str.replace(regex, '');

    return str
        .replaceAll(/\.\//g, '')
        .replaceAll(/\/+/g, '/');
}

/**
 * Tidy up and resolve relative paths into absolute ones
 * @param path {string} The path to convert to absolute
 * @param cwd {string} The directory from which relative paths are resolved
 */
export const toAbs = (path: string, cwd: string = process.cwd()): string => deunixify(traverse((unixify(path).startsWith('/') ? path : (`./${path}`
    .replace(/^\.\/~\//g, os.homedir() + '/'))
    .replace(/^\.\/#\//g, config.get().makefilePath[0]?.match(/^(.*\/)[^\/]*/)?.[1] ?? (cwd + '/'))

    .replace(/^\.\/\.\.\//g, cwd + '/../')
    .replace(/^\.\//g, cwd + '/'))));

/**
 * List all files which match a particular glob pattern.
 * Valid globs are `*` and `+`
 * * `*` is any file - recursively
 * * `+` is any file - flat
 *
 * @param globString The glob pattern
 */
export default async function* lsGlob(globString: string): AsyncGenerator<ReturnType<plugin.Glob['exec']>> {
    try {
        // TODO: This function can be sped up immensely by parsing the glob string first,
        //  rather than listing everything and _filtering_ what doesn't match the glob pattern

        const split = toAbs(globString)
            .split('/');
        const matcher = plugin.API.createGlob(globString);

        const path = split.slice(0, split.findIndex(i => i.includes('*') || i.includes('+'))).join('/');
        for await (const i of plugin.API.lsDir(path)) {
            const match = matcher.exec(i) ?? [];

            if (match?.file)
                yield match;
        }
    } catch (err) {
        log.err(err);
    }
}

/**
 * Replace all wildcard aliases with wildcard values.
 * @param dep
 * @param wildcards
 */
export const insertWildcards = function (dep: string, wildcards: string[]): string {
    let result: string = dep;

    for (const [a, i] of iter.collect([dep, ...wildcards].entries()).reverse())
        result = result.replaceAll(`\\${a}`, i);

    return decodeURIComponent(result);
}