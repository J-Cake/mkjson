import _ from 'lodash';
import * as mkjson from '#core';

import * as Shell from './shell.js';

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
export default function target(specifier: string | string[], handler?: Shell.TargetHandler, options?: Partial<TargetOptions>) {
    if (specifier?.length > 0)
        mkjson.Makefile.targets.setState(prev => ({
            ...prev,
            targets: {
                ...prev.makefile ?? {},
                ..._.fromPairs((Array.isArray(specifier) ? specifier : [specifier]).map(i => [i, {run: handler}]))
            }
        }));
    else throw `Target specifier must be a string or an array of strings`;
};

export {shell} from './shell.js';
export * as Shell from './shell.js'