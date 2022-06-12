import chalk from 'chalk';

import { config } from './config.js';

export type Locale = { [R in typeof localeString[number]]: string };
const localeString = [
    'noTarget',
    'runningTargets',
    'runningTarget',
    'parsing',
    'getRule',
    'upToDate',
    'running',
    'isOlder'
] as const;

export const locale = (locale: Locale): Locale => locale; // for strict typing

function println(tag: string, key: keyof Locale, args: Record<string, any>): void {
    const {locale: localeMgr, preferredLocale} = config.get();
    const locale = localeMgr.get()[preferredLocale];
    
    if (!locale)
        throw `Locale ${config.get().locale} not found`;

    const lines = locale[key]!
        .split('\n')
        .map(i => i.replace(/\$(\w+)/g, (_, key) => args[key] || ''))
        .map(i => `${chalk.grey(`[${tag}]`)}: ${i}`)
        .join('\n') + '\n';

    process.stderr.write(lines);
}

export function debug(key: keyof Locale, args: Record<string, any>): void {
    if (['debug'].includes(config.get().logLevel))
        println(chalk.yellow('debug'), key, args);
}

export function verbose(key: keyof Locale, args: Record<string, any>): void {
    if (['verbose', 'debug'].includes(config.get().logLevel))
        println(chalk.cyan('verbose'), key, args);
}

export function info(key: keyof Locale, args: Record<string, any>): void {
    if (['info', 'verbose', 'debug'].includes(config.get().logLevel))
        println(chalk.blueBright('info'), key, args);
}

export function err(key: keyof Locale, args: Record<string, any>): void {
    if (['err', 'info', 'verbose', 'debug'].includes(config.get().logLevel))
        println(chalk.red('err'), key, args);
}
