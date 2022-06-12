import chalk from 'chalk';

import main from './index.js';

await main(process.argv)
    .catch(err => (err instanceof Error ?
        console.error(chalk.grey(`[${chalk.red('err')}]`), err) :
        console.error(chalk.grey(`[${chalk.red('err')}]`), err), -1));
