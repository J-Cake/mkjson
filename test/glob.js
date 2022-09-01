// import {iter} from '@j-cake/jcake-utils/iter';

import rl from 'node:readline';
import glob, * as path from '../build/ts/src/core/path.js';

// const fileDir = `${import.meta.url.match(/^file:\/\/(\/.*)\/[^\/]*$/)?.[1]}`;
// console.log(await iter.collect(glob(`${process.cwd()}/build/*.js`)));
//
// console.log(await iter.collect(glob(`${process.cwd()}/build/+.js`)));

for await (const i of path.lsDir(process.cwd() + '/build/index.js')) console.log(i);

const q = rl.createInterface(process.stdin, process.stdout);
while (true)
    console.log(await new Promise(ok => q.question("$ ", ans => ok(path.toAbs(ans)))));