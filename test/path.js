import {promises as rl} from "node:readline";

// import glob, * as path from '../build/ts/src/core/path.js';
import target, {core} from 'mkjson';

const state = core.config.setState(prev => ({
    makefilePath: [...prev.makefilePath, process.cwd() + '/bin/makefile.json5']
}));

const q = rl.createInterface(process.stdin, process.stdout);
while (true)
    console.log(await q.question('$ ').then(path => core.Path.toAbs(path)));
    // console.log(await new Promise(ok => q.question("$ ", ans => ok(path.toAbs(ans)))));