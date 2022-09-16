import {strict as assert} from 'node:assert';
import module from 'node:module';
import * as core from '#core';

const dirname = import.meta.url.match(/^file:\/\/(\/.*\/)[^\/]*$/)?.[1];
const require = module.createRequire(dirname);
const ls_dir = require('../build/lsdir.node').ls_dir;

await core.loadPlugin(core.Path.toAbs(`${dirname}/../../build/fs.js`));
await core.loadPlugin(core.Path.toAbs(`${dirname}/../../build/glob.js`));

const dir = core.Path.toAbs(`${dirname}/../..`);
const contents = ls_dir(dir);
for await (const i of core.Plugin.API.lsDir(dir))
    assert.equal(contents.shift(), i);
