import os from 'node:os';
import log from "./log.js";

import * as plugin from './plugin.js';

/**
 * Tidy up and resolve relative paths into absolute ones
 * @param path
 */
export const toAbs = (path: string): string => (path.startsWith('/') ? path : `./${path}`)
    .replace(/^\.\.\//g, process.cwd() + '/../')
    .replace(/^\.\//g, process.cwd() + '/')
    .replace(/^~\//g, os.homedir() + '/')
    .replaceAll(/[^\/]*\/\.\./g, '')
    .replaceAll('./', '')
    .replaceAll(/\/+/g, '/')

/**
 * Convert a glob string into a regular expression
 * @param str
 */
export const glob = str => new RegExp('^' + decodeURIComponent(str
    .replaceAll(/([.\-\/^$?\[\]{}])/g, '\\$1')
    .replaceAll('*', '(.*)')
    .replaceAll('+', '([^\/]*)')) + '$', 'g')

/**
 * List all files which match a particular glob pattern.
 * Valid globs are `*` and `+`
 * * `*` is any file - recursively
 * * `+` is any file - flat
 *
 * @param globString The glob pattern
 */
export default async function* lsGlob(globString: string): AsyncGenerator<{ file: string, wildcards: string[] }> {
    try {
        // TODO: This function can be sped up immensely by parsing the glob string first,
        //  rather than listing everything and _filtering_ what doesn't match the glob pattern

        const split = toAbs(globString)
            .split('/');
        const matcher = glob(globString);

        const path = split.slice(0, split.findIndex(i => i.includes('*') || i.includes('+'))).join('/');
        for await (const i of plugin.API.lsDir(path)) {
            matcher.lastIndex = 0;
            const [file, ...wildcards] = matcher.exec(i) ?? [];

            if (file)
                yield {file, wildcards};
        }
    } catch (err) {
        log.err(err);
    }
}