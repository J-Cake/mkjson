import {strict as assert} from 'node:assert';
import os from 'node:os';
import * as core from '#core';

const toAbs = core.Path.toAbs;

assert.equal(typeof toAbs, 'function');

assert.equal(toAbs('/code/file.js'), '/code/file.js');
assert.equal(toAbs('~/'), os.homedir() + '/')
assert.equal(toAbs('#/'), process.cwd() + '/');
core.config.setState(prev => ({
    makefilePath: ['/code/bin/makefile.json5', ...prev.makefilePath]
}));
assert.equal(toAbs('#/'), '/code/bin/');
assert.equal(toAbs('./file1.js'), process.cwd() + '/file1.js');
assert.equal(toAbs('./file1.js', '/code'), '/code/file1.js');
assert.equal(toAbs('/'), '/')
assert.equal(toAbs('/../'), '/');
assert.equal(toAbs('/./'), '/');
assert.equal(toAbs('//'), '/');
assert.equal(toAbs('/code/file/folder/dir/../../directory'), '/code/file/directory');