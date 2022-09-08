import chalk from "chalk";

import log from "./log.js";
import {config} from "./config.js";
import {targets} from "./targetList.js";
import {plugins, schemes} from "./plugin.js";

/**
 * Uses loaded plugins to find and load makefiles from a user-provided hint
 * @param hint A string which indicates where to locate or how to load a particular makefile
 */
export async function loadMakefile(hint: string): Promise<void> {
    const loaded = Object.entries(plugins.get());

    log.verbose(`Loading ${hint}`);

    for (const [a, i] of loaded) {
        log.debug(`Attempting loader: ${chalk.yellow(a)}`);
        const makefile = await i.loadMakefile?.(hint)
            .catch(err => (log.debug(err), null));

        if (makefile) {
            config.setState(prev => ({makefilePath: [...prev.makefilePath, hint]}));

            return void targets.setState(prev => ({
                ...prev,
                ...makefile
            }));
        } else
            log.debug(`Loader returned nothing`);
    }

    throw `No makefile found for ${chalk.yellow(hint)}`;
}

export async function getMTime(path: string): Promise<Date | number> {
    const schemeName = path.match(/^[a-zA-Z][a-zA-Z0-9]*:(?=.*)/)?.[0] ?? 'file:';
    const scheme = schemes.get(schemeName);

    if (!scheme?.getMTime)
        throw `No scheme defined for ${schemeName}`;

    return await scheme.getMTime(path);
}

export function lsDir(path: string): AsyncIterable<string> {
    const schemeName = path.match(/^[a-zA-Z][a-zA-Z0-9]*:(?=.*)/)?.[0] ?? 'file:';
    const scheme = schemes.get(schemeName);

    if (!scheme?.lsDir)
        throw `No scheme defined for ${schemeName}`;

    return scheme.lsDir(path);
}