import {promises as fs} from 'node:fs';
import os from 'node:os';

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

        for await (const dir of lsDir(split.slice(0, split.findIndex(i => i.includes('*') || i.includes('+'))).join('/'))) {
            const [file, ...wildcards] = matcher.exec(dir) ?? [];

            if (file)
                yield {file, wildcards};
        }
    } catch(err) {}
}

/**
 * List the contents of a directory recursively
 * @param root
 */
export async function* lsDir(root: string): AsyncGenerator<string> {
    const path = toAbs(root);
    if (await fs.stat(path).then(stat => stat.isDirectory()))
        for (const i of await fs.readdir(path, {})) {
            const dir = `${path}/${i}`;
            yield dir;

            if (await fs.stat(dir).then(stat => stat.isDirectory()))
                yield* lsDir(dir);
        }
    else yield path;
}