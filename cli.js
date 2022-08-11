#!/usr/bin/env node

import fs from 'node:fs/promises';
import chalk from 'chalk';

import main from '#cli';

await main(process.argv.slice(2), await fs.readFile('./package.json', 'utf8').then(JSON.parse))
    .catch(err => err && (err instanceof Error ?
        console.error(chalk.grey(`[${chalk.red('err')}]`), err.message) :
        console.error(chalk.grey(`[${chalk.red('err')}]`), err), -1));
