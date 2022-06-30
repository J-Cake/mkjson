import chalk from 'chalk';

import main from './index.js';

await main(process.argv.slice(2))
    .catch(err => err && (err instanceof Error ?
        console.error(chalk.grey(`[${chalk.red('err')}]`), err.message) :
        console.error(chalk.grey(`[${chalk.red('err')}]`), err), -1));