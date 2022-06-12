import assert from 'node:assert';
import { promises as fs } from 'node:fs';

import { matches, toAbs } from '../build/ts/src/make.js';

// ./build/cli.js build/cli.js 

// *.js -> all.js src/all.js
// src/*.js -> src/all.js ! src/index.js, all.js

const origin = await fs.realpath('package.json').then(path => path.split('/').slice(0, -1).join('/'));

assert(matches(toAbs('./build/cli.js', origin), toAbs('./build/cli.js', origin)));
assert(matches(toAbs('./build/+.js', origin),   toAbs('./build/+.js', origin)));
assert(matches(toAbs('./build/cli.js', origin), toAbs('./build/+.js', origin)));
assert(matches(toAbs('./build/+.js', origin),   toAbs('./build/cli.js', origin)));
