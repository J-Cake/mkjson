import {strict as assert} from 'node:assert';
import * as core from '#core';

assert.equal(typeof core, 'object');

for (const i of ['Path', 'Makefile', 'Config', 'Plugin', 'Log', 'Dependency', 'API', 'config', 'loadMakefile', 'loadPlugin', 'log', 'lsGlob', 'run'])
    assert(core[i]);