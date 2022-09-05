import rl from "node:readline";

import glob, * as path from '../build/ts/src/core/path.js';

const q = rl.createInterface(process.stdin, process.stdout);
while (true)
    console.log(await new Promise(ok => q.question("$ ", ans => ok(path.toAbs(ans)))));