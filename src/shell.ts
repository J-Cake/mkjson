import cp from 'node:child_process';
import stream from "node:stream";
import chalk from 'chalk';
import {Iter, iter} from "@j-cake/jcake-utils/iter";

import {log, config} from '#core';

/**
 * Represents the action to perform when a dependency is outdated.
 * If function:
 *  - Run function as normal
 * If string:
 * - Run string as command
 * - Recommended approach is the [shell](#shell) function
 */
export declare type TargetHandler = string | string[] | (() => Promise<void>);

export declare interface ShellOptions {
    isolate: boolean,
    parallel: boolean,
    ignoreFailure: boolean,
    cwd: string,
    env: Record<string, string>
}

/**
 * Runs a shell command
 * @param command The command/s to run
 * @param options The options to run the command with
 */
export function shell(command: string | string[], options?: Partial<ShellOptions>) {
    return function (target: string, env: Record<string, string>): Promise<boolean> {
        return new Promise(async function (resolve, reject) {
            const cmd = Array.isArray(command) ? command : [command];
            const cwd = options?.cwd ?? process.cwd();
            const args = config.get();
            const procenv = {
                ...process.env,
                ...options?.env ?? {},
                ...env,
                mkjson: [
                    process.argv[0],
                    process.argv[1],
                    args.force ? '--force' : '',
                    args.synchronous ? '--synchronous' : '',
                    args.blockScripts ? '--no-scripts' : '',
                    `--log-level ${args.logLevel}`
                ].filter(i => i.length > 0).join(' ')
            };

            if (options?.parallel)
                if (options?.isolate ?? true) {
                    log.info(`Running: ${chalk.grey(cmd.join(', '))}`);

                    return await Promise.all(cmd.map(i => new Promise<number>(ok => cp.spawn('bash', ['-c', i], {
                        stdio: 'inherit',
                        env: procenv,
                        cwd
                    }).once('exit', ok))))
                        .then(codes => (options?.ignoreFailure || codes.every(i => i == 0)) ? resolve(codes.every(i => i == 0)) : reject(false))
                } else {
                    log.info(`Running: ${chalk.grey(`bash -c ${cmd.join(' & ')} & wait`)}`);

                    return cp.spawn('bash', ['-c', cmd.join(' & ') + ' & wait'], {stdio: 'inherit', env: procenv, cwd})
                        .once('exit', code => (options?.ignoreFailure || code == 0) ? resolve(code == 0) : reject(false));
                }
            else if (options?.isolate ?? true)
                for (const i of cmd) {
                    log.info(`Running: ${chalk.grey(i)}`);
                    await new Promise(ok => cp.spawn('bash', ['-c', i], {
                        stdio: 'inherit',
                        env: procenv,
                        cwd
                    }).once('exit', ok));
                }
            else {
                log.info(`Running: ${chalk.grey(`bash -c ${cmd.join(' && ')}`)}`);
                await new Promise(ok => cp.spawn('bash', ['-c', cmd.join(' && ')], {
                    stdio: 'inherit',
                    env: procenv,
                    cwd
                }).once('exit', ok))
                    .then(code => (options?.ignoreFailure || code == 0) ? resolve(code == 0) : reject(false));
            }

            resolve(true);
        });
    }
}

// export const shell = (command: string | string[], options?: Partial<ShellOptions>): TargetHandler => async (): Promise<void> => void await run(_.merge({run: command} as Makefile.Rule, options ?? {}));

/**
 * Run a list of command-line programs and pipe the outputs of the previous into the input of the enxt.
 * @param command The list of command-line programs to run
 * @param env A set of environment variables to invoke the CLI programs with
 * @returns Iterator over the last stdout stream of the list of programs.
 */
export function pipe(command: string | string[], env?: Record<string, string>): iter.Iter<Buffer> {
    const commands = Array.isArray(command) ? command : [command];

    const out = commands
        .map(i => cp.exec(i, {
            encoding: 'utf8',
            env
        }))
        .reduce((a, i) => (a?.stdout?.pipe(i.stdin ??= new stream.Writable()), i));

    return Iter(out.stdout ?? []);
}