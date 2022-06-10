import chalk from 'chalk';

import main from './index.js';

await main(process.argv)
    .catch(err => (err instanceof Error ?
        console.error(chalk.red('[error]'), err.message) :
        console.error(chalk.red('[error]'), err), -1));