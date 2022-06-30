import util from 'node:util';
import chalk from 'chalk';

import { Args, config } from './index.js';

export const print = (tag: string, ...msg: any[]): any[] => (process.stdout.write(chalk.grey(`[${tag}] `) + msg.map(i => ['object', 'function'].includes(typeof i) ? util.inspect(i, false, null, true) : i).join(' ').trim().replaceAll(/(\r?\n)+/g, chalk.grey(`[${tag}] `)) + '\n'), msg);

export const log: Record<Args['logLevel'], (...msg: any[]) => any> = {
    err: (...args: any[]) => ['err', 'info', 'verbose', 'debug'].includes(config.get().logLevel) ? print(chalk.red('error'), ...args) : void 0,
    info: (...args: any[]) => ['info', 'verbose', 'debug'].includes(config.get().logLevel) ? print(chalk.blue('info'), ...args) : void 0,
    verbose: (...args: any[]) => ['verbose', 'debug'].includes(config.get().logLevel) ? print(chalk.cyan('verbose'), ...args) : void 0,
    debug: (...args: any[]) => ['debug'].includes(config.get().logLevel) ? print(chalk.yellow('debug'), ...args) : void 0,
};