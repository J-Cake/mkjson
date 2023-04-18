#!/usr/bin/env node

import os from 'node:os';
import fs from 'node:fs/promises';
import chalk from 'chalk';

import main from '#cli';

console.log(import.meta.url);

export const unixify = path => path.replace(/(^[a-z]):/i, '/$1').replaceAll('\\', '/');

const fileDir = `${unixify(import.meta.url).match(/^file:\/\/(\/.*)\/[^\/]*$/)?.[1]}/package.json`;

const success = await main(process.argv.slice(2), await fs.readFile(fileDir, 'utf8').then(JSON.parse))
    .catch(err => (err && console.error(chalk.grey(`[${chalk.red('err')}]`), err), false));

process.exit(success ? 0 : 1);