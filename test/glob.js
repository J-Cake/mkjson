import rl from 'node:readline/promises';

import {Iter} from "@j-cake/jcake-utils/iter";
import glob, * as path from '../build/ts/src/core/path.js';

console.log(await Iter([])
    .interleave(...[
        glob('/home/jcake/Code/Personal/mkjson/test'),
        glob('/home/jcake/Code/Personal/mkjson/src'),
        glob('/home/jcake/Code/Personal/mkjson/example/package.json'),
    ])
    .filter(i => !!i)
    .map(i => i.file)
    .collect());

const lines = rl.createInterface(process.stdin, process.stdout)

while (true)
    for await (const file of glob(await lines.question('$ ').then(res => path.toAbs(res))))
        console.log(file.file);