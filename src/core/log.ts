import util from 'node:util';
import chalk from 'chalk';

import {config} from './index.js';

/**
 * Remove all ANSI control codes from a string - returning plain text
 * @param str
 */
export const stripAnsi = (str: string): string => str.replace(/[\u001b\u009b][[()#;?]*(?:\d{1,4}(?:;\d{0,4})*)?[\dA-ORZcf-nqry=><]/g, '');
/**
 * Return a string of length `width` with `text` in the exact middle
 * @param text
 * @param width
 */
export const centre = (text: string, width: number) => {
    const colourless = stripAnsi(text);
    const pad = Math.floor((width - colourless.length) / 2);
    return `${' '.repeat(pad)}${text}${' '.repeat(pad)}`.padStart(width, ' ');
}

/**
 * Write the given content to stderr (pretty much console.log)
 * @param tag
 * @param msg
 */
export function stdout(tag: string, ...msg: any[]): void {
    const log = msg
        .map(i => ['string', 'number', 'bigint', 'boolean'].includes(typeof i) ? i : util.inspect(i, false, null, true))
        .join(' ')
        .split('\n')
        .map((i, a) => `${a ? centre('\u2502', stripAnsi(tag).length) : tag} ${i}\n`);

    for (const i of log)
        process.stdout.write(i);
}

/**
 * Write the given content to stderr (pretty much console.error)
 * @param tag
 * @param msg
 */
export function stderr(tag: string, ...msg: any[]): void {
    const log = msg
        .map(i => ['string', 'number', 'bigint', 'boolean'].includes(typeof i) ? i : util.inspect(i, false, null, true))
        .join(' ')
        .split('\n')
        .map((i, a) => `${a ? centre('\u2502', stripAnsi(tag).length) : tag} ${i}\n`);

    for (const i of log)
        process.stderr.write(i);
}

export const log = {
    err: (...arg: any[]) => void (['err', 'info', 'verbose', 'debug'].includes(config.get().logLevel) && stderr(chalk.grey(`[${chalk.red('Error')}]`), ...arg.map(i => config.get().logLevel == 'debug' ? new Error(i) : i))),
    info: (...arg: any[]) => void (['info', 'verbose', 'debug'].includes(config.get().logLevel) && stdout(chalk.grey(`[${chalk.blue('Info')}]`), ...arg)),
    verbose: (...arg: any[]) => void (['verbose', 'debug'].includes(config.get().logLevel) && stdout(chalk.grey(`[${chalk.yellow('Verbose')}]`), ...arg)),
    debug: (...arg: any[]) => void (['debug'].includes(config.get().logLevel) && stdout(chalk.grey(`[${chalk.cyan('Debug')}]`), ...arg))
}
export default log;