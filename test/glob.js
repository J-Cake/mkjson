import {promises as rl} from 'node:readline';

import {core} from 'mkjson';

await core.loadPlugin('../build/fs.js');
await core.loadPlugin('../build/glob.js');

const state = core.config.setState(prev => ({
    makefilePath: [...prev.makefilePath, process.cwd() + '/bin/makefile.json5']
}));

const glob = core.lsGlob;
const wildcards = core.Path.insertWildcards;
const lines = rl.createInterface(process.stdin, process.stdout)

const prevWildcards = [];

while (true)
    for await (const file of glob(await lines.question('$ ').then(res => wildcards(core.Path.toAbs(res), prevWildcards)))) {
        prevWildcards.splice(0, prevWildcards.length, ...file.wildcards);
        console.log(file.file, prevWildcards);
    }