import {promises as fs} from 'node:fs';
import {Iter} from '@j-cake/jcake-utils/iter';

import ls_dir from "lsdir";
import {Path, Plugin, Rule} from '#core';

export async function fetch(path: string, encoding: Plugin.API.Encoding): Promise<string>;
export async function fetch(path: string): Promise<Buffer>;
export async function fetch(path: string, encoding?: Plugin.API.Encoding): Promise<Buffer | string> {
    const file = await fs.open(path, 'r');

    const buf = await Iter(file.createReadStream())
        .collect();

    if (encoding)
        return Buffer.concat(buf).toString(encoding);
    else
        return Buffer.concat(buf);
}

export async function getMTime(dir: string): Promise<Date> {
    const dirs = await fs.readdir(dir);

    let newest = 0;
    for (const i of dirs.map(i => Path.toAbs(i, dir))) {
        const stat = await fs.stat(i);
        if (stat.isDirectory())
            newest = Math.max(newest, await getMTime(i).then(mtime => mtime.getTime()));
        else
            newest = Math.max(newest, stat.mtime.getTime());
    }

    return new Date(newest);
}

type FSRule = Rule & {
    /**
     * If the target is a directory and `directMTime` is not set to true, the directory will report its MTime to be that of its most recently modified child.
     */
    directMTime?: boolean
};

let handlers: Plugin.SchemeHandler;// = {} as any;
Plugin.registerScheme('file:', handlers = {
    fetch,
    getMTime: (file: string, target: FSRule) => fs
        .stat(file)
        .then(stat => target?.directMTime ? stat.mtime : stat.isDirectory() ? getMTime(file) : stat.mtime),

    getSize: (file: string) => fs
        .stat(file)
        .then(stat => stat.size),

    async* lsDir(dir: string): AsyncGenerator<string> {
        for (const i of ls_dir(Path.toAbs(dir)))
            yield i;
    },
});
