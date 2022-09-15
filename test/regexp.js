import {promises as rl} from 'node:readline';

import * as mkjson from 'mkjson';

const toAbs = mkjson.core.Path.toAbs;

const regExp = new RegExp('^' + decodeURIComponent(process.argv[2]
    .replaceAll(/([.\-\/^$?\[\]{}])/g, '\\$1')
    .replaceAll('*', '(.*)')
    .replaceAll('+', '([^\/]*)')) + '$', 'g');

const q = rl.createInterface(process.stdin, process.stdout);

while (true) {
    const raw = await q.question('$ ');
    const [file, ...wildcards] = regExp.exec(toAbs(raw)) ?? ['', ''];

    console.log({file, wildcards, raw});
}