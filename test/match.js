import assert from 'node:assert';
import { promises as fs } from 'node:fs';

import { matches, toAbs } from '../build/ts/src/make.js';

// ./build/run.js build/run.js

// *.js -> all.js src/all.js
// src/*.js -> src/all.js ! src/index.js, all.js

const origin = await fs.realpath('package.json').then(path => path.split('/').slice(0, -1).join('/'));

assert(matches(toAbs('./build/run.js', origin), toAbs('./build/run.js', origin)));
assert(matches(toAbs('./build/+.js', origin),   toAbs('./build/+.js', origin)));
assert(matches(toAbs('./build/run.js', origin), toAbs('./build/+.js', origin)));
assert(matches(toAbs('./build/+.js', origin),   toAbs('./build/run.js', origin)));
