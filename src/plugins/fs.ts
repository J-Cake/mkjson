import {promises as fs} from 'node:fs';
import {Iter} from '@j-cake/jcake-utils/iter';

import {Plugin} from '#core';
import {toAbs} from "../core/path.js";

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
        const path = toAbs(dir);
        if (await fs.stat(path).then(stat => stat.isDirectory()).catch(_ => false)) {
            const dirContents = await fs.readdir(path);
            for (const i of dirContents) {
                const dir = `${path}/${i}`;
                yield dir;

                if (await fs.stat(dir).then(stat => stat.isDirectory()))
                    if (handlers)
                        for await (const i of handlers.lsDir(dir))
                            yield i;
            }
        } else yield path;
    },
});