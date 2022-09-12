import {promises as rl} from "node:readline";

// import glob, * as path from '../build/ts/src/core/path.js';
import target, {core} from 'mkjson';

const q = rl.createInterface(process.stdin, process.stdout);
while (true)
    console.log(await q.question('$ ').then(path => core.Path.toAbs(path)));
    // console.log(await new Promise(ok => q.question("$ ", ans => ok(path.toAbs(ans)))));