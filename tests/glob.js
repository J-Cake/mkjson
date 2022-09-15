import {strict as assert} from 'node:assert';
import * as core from '#core';

// Load default glob plugin
await core.loadPlugin(core.Path.toAbs(`${import.meta.url.match(/^file:\/\/(\/.*\/)[^\/]*$/)?.[1] ?? process.cwd()}../build/glob.js`));

const glob = core.API.createGlob;

assert.equal(typeof glob, 'function');

{
    const matcher = glob('/*.js');
    assert.equal(typeof matcher, 'object');
    assert.equal(typeof matcher.exec, 'function');
    assert.equal(typeof matcher.matches, 'function');
    assert.equal(matcher.matches('/file.js'), true);
    assert.deepEqual(matcher.exec('/file.js'), {
        file: '/file.js',
        wildcards: ['file'],
        glob: '/*.js',
        raw: '/file.js'
    });
}

{
    const matcher = glob('/code/+.d.ts');
    for (const i of ['/code/index.d.ts', '/code/melanie.test.d.ts', '/code/no\\test.d.ts'])
        assert.ok(matcher.matches(i));

    for (const i of ['/code/test/index.d.ts', '/code/index.ts', '/code/nope.D.ts'])
        assert.ok(!matcher.matches(i));
}

// Weird behaviour checks ahead:

{
    const matcher = glob('/+/+');
    assert.deepEqual(matcher.exec('/code/file').wildcards, ['code', 'file']);
    assert.deepEqual(matcher.exec('/egg/plant.ts').wildcards, ['egg', 'plant.ts']);
    assert.deepEqual(matcher.exec('/file/').wildcards, ['file', '']);
    assert.deepEqual(matcher.exec('/file').wildcards, ['']);
}

{
    const matcher = glob('/*/dir/*');
    assert.deepEqual(matcher.exec('/file/dir/file').wildcards, ['file', 'file']);
    assert.deepEqual(matcher.exec('/file/folder/dir/file').wildcards, ['file/folder', 'file']);
    assert.deepEqual(matcher.exec('/file/folder/dir/file/dir/file').wildcards, ['file/folder/dir/file', 'file']);
    assert.notDeepEqual(matcher.exec('/file/folder/dir/file/dir/file').wildcards, ['file/folder', 'file/dir/file']);
}

{
    const matcher = glob('/*/*/*');
    assert.deepEqual(matcher.exec('/file/folder/dir').wildcards, ['file', 'folder', 'dir']);
    assert.deepEqual(matcher.exec('/a/b/c').wildcards, ['a', 'b', 'c']);
    assert.deepEqual(matcher.exec('/a/b/c/d/e/f').wildcards, ['a/b/c/d', 'e', 'f']) // regexp weirdness... You need a degree for this shit lmfao

}