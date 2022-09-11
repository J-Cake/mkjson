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
    .replaceAll(/\/+/g, '/'
    )

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