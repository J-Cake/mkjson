import _ from 'lodash';
import * as mkjson from '#core';

/**
 * Defines a mkjson target
 * @param target The pattern defining which file or resource the rule applies to
 * @param rule A mkjson rule
 */
export function target(target: string | string[], rule: Partial<mkjson.Makefile.Rule>);
/**
 * Defines a mkjson target
 * @param target The pattern defining which file or resource the rule applies to
 * @param handler The function which runs when the pattern is matched
 * @param options Additional options for the run step
 */
export function target(target: string | string[], handler?: mkjson.Makefile.Rule['run'], options?: Partial<Omit<mkjson.Makefile.Rule, 'run'>>)
export function target(target: string | string[], rule?: Partial<mkjson.Makefile.Rule> | mkjson.Makefile.Rule['run'], options?: Partial<Omit<mkjson.Makefile.Rule, 'run'>>) {
    const handler: Partial<mkjson.Makefile.Rule> = {
        ...options ?? {},
        ...(typeof rule == 'function' ? { run: rule } : {})
    };

    if (target?.length > 0)
        mkjson.Makefile.targets.setState(prev => ({
            ...prev,
            ..._.fromPairs((Array.isArray(target) ? target : [target]).map(i => [i, {
                ...handler,
                async run(target: string, env: Record<string, string>) {
                    try {
                        if (!handler.run)
                            return true;

                        return await handler.run(target, env) !== false;
                    } catch (err) {
                        mkjson.log.err(err);
                        return false;
                    }
                }
            }]))
        }));
    else throw `Target target must be a string or an array of strings`;
}

export default target;

export {shell} from './shell.js';
export * as Shell from './shell.js'