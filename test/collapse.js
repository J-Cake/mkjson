import {promises as rl} from 'node:readline'

export function traverse(path) {
    let str = `/${path}`;
    const regex = /(^|\/[^\/]*)\/\.\.(?=\/|$)/;

    while (str.indexOf('..') > -1)
        str = str.replace(regex, '');

    return str
        .replaceAll(/\/+/g, '/');
}

const q = rl.createInterface(process.stdin, process.stdout);

while (true)
    console.log(traverse(await q.question('$ ')));