import cp from 'node:child_process';
import stream from "stream";
import {Iter, iter} from "@j-cake/jcake-utils/iter";

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
    cwd: boolean,
    env: boolean
}

/**
 * Runs a shell command
 * @param command The command/s to run
 * @param options The options to run the command with
 */
export function shell(command: string | string[], options?: Partial<ShellOptions>) {
    return async function (target: string, env: Record<string, string>): Promise<boolean> {
        return false;
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