import assert from 'node:assert';

export function resolveDependency(target, request) {
    for (const str of target.split(';')) {
        const matcher = new RegExp('^' + decodeURIComponent(str.replaceAll(/([.\-\/^$?()\[\]{}])/g, '\\$1').replaceAll('*', '(.*)').replaceAll('+', '([^\/]*)')) + '$', 'g');

        const result = matcher.exec(request);

        if (result)
            return [...result];
    }

    return null;
}

assert.deepEqual(resolveDependency("src/*.ts", "src/json.ts"), ['src/json.ts', 'index']);
assert.deepEqual(resolveDependency("src/*.ts", "core/json.ts"), null);

assert.deepEqual(resolveDependency('src/*.ts;test/*.ts', 'test/core1.ts'), ['test/core1.ts', 'core1']);