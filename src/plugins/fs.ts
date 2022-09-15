import {promises as fs} from 'node:fs';
import {Iter} from '@j-cake/jcake-utils/iter';

import ls_dir from "lsdir";
import {Plugin, Path} from '#core';

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

let handlers: Plugin.SchemeHandler;// = {} as any;
Plugin.registerScheme('file:', handlers = {
    fetch,
    getMTime: (file: string) => fs
        .stat(file)
        .then(stat => stat.mtime),

    getSize: (file: string) => fs
        .stat(file)
        .then(stat => stat.size),

    async* lsDir(dir: string): AsyncGenerator<string> {
        for (const i of ls_dir(Path.toAbs(dir)))
            yield i;
    },
});