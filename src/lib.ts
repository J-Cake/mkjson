import _ from 'lodash';
import type {Rule} from "#core";
import {config, run} from '#core';

/**
 * Represents the action to perform when a dependency is outdated.
 * If function:
 *  - Run function as normal
 * If string:
 * - Run string as command
 * - Recommended approach is the [shell](#shell) function
 */
export declare type TargetHandler = string | string[] | (() => Promise<void>);

/**
 * Represents a rule configuration
 * @property dependencies - The dependencies of the rule
 * @property orderOnly - The order-only dependencies of the rule
 * @property phony - Whether the rule is a phony rule
 * @property cwd - The working directory of the rule
 * @property env - The environment variables of the rule
 */
export declare interface TargetOptions {
    phony: boolean,
    cwd: string,
    env: Record<string, string>,
    dependencies: string[],
    orderOnly: string[]
}

/**
 * Defines a Make target
 * @param specifier The target specifier: A string representing a file on disk, or a PHONY target.
 * @param handler The action to perform when the target is outdated.
 * @param options: {Partial<TargetOptions>} Target configurations
 */
export default function target(specifier: string | string[], handler?: TargetHandler, options?: Partial<TargetOptions>) {
    if (specifier?.length > 0)
        config.setState(prev => ({
            makefile: {
                ...prev.makefile,
                targets: {
                    ...prev.makefile?.targets ?? {},
                    ..._.fromPairs((Array.isArray(specifier) ? specifier : [specifier]).map(i => [i, {run: handler}]))
                }
            }
        }));
    else throw `Target specifier must be a string or an array of strings`;
};

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
export const shell = (command: string | string[], options?: Partial<ShellOptions>): TargetHandler => async (): Promise<void> => void await run(_.merge({run: command} as Rule, options ?? {}));