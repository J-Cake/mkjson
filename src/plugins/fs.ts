import {promises as fs} from 'node:fs';

import {Plugin} from '#core';
import {toAbs} from "../core/path.js";

const handlers: Plugin.SchemeHandler = {} as any;
Plugin.registerScheme('file:', Object.assign({
    getMTime: async (file: string) => await fs
        .stat(file)
        .then(stat => stat.mtime),

    getSize: async (file: string) => await fs
        .stat(file)
        .then(stat => stat.size),

    async* lsDir(dir: string): AsyncGenerator<string> {
        const path = toAbs(dir);
        if (await fs.stat(path).then(stat => stat.isDirectory())) {
            const dirContents = await fs.readdir(path);
            for (const i of dirContents) {
                const dir = `${path}/${i}`;
                yield dir;

                if (await fs.stat(dir).then(stat => stat.isDirectory()))
                    if (handlers)
                        yield* handlers.lsDir(dir) as AsyncGenerator<string>;
            }
        } else yield path;
    }
}, handlers));