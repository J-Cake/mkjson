import os from 'node:os';
import {iterSync as iter} from '@j-cake/jcake-utils/iter';

import log from "./log.js";
import * as plugin from './plugin.js';

/**
 * Tidy up and resolve relative paths into absolute ones
 * @param path
 */
export const toAbs = (path: string): string => (path.startsWith('/') ? path : (`./${path}`
    .replace(/^\.\.\//g, process.cwd() + '/../')
    .replace(/^\.\//g, process.cwd() + '/')
    .replace(/^~\//g, os.homedir() + '/')))
    .replaceAll(/[^\/]*\/\.\./g, '')
    .replaceAll('./', '')
    .replaceAll(/\/+/g, '/');

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

    console.log("wildcards: insertWildcards", wildcards);
    return decodeURIComponent(result);
}