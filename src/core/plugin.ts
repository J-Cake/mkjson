import {promises as fs} from 'node:fs';
import StateManager from "@j-cake/jcake-utils/state";

import {TargetList, targets} from "./targetList.js";
import log from "./log.js";
import chalk from "chalk";
import {config} from "./config.js";

export type Plugin = Partial<{
    /**
     * Finds and loads a makefile from a (usually provided by CLI) hint used to locate it.
     * @param hint Where the makefile is to be loaded from
     */
    loadMakefile(hint: string): Promise<Nullable<TargetList>>,

}>

export const plugins = new StateManager<Record<string, Plugin>>({});

/**
 * Loads a plugin - Add any compatible functionality to a list of loaded sources
 * @param source
 */
export async function loadPlugin(source: string): Promise<Plugin> {
    const fileDir = `${import.meta.url.match(/^file:\/\/(\/.*)\/[^\/]*$/)?.[1]}/${source}`
        .replaceAll('/./', '/')
        .replaceAll(/\/[^\/]*\/\.\./g, '/');

    if (!await fs.stat(fileDir).then(res => res.isFile() || res.isSymbolicLink()).catch(() => false))
        throw log.err(`Invalid plugin format: Plugins must be real files`);

    log.verbose(`Loading plugin: ${chalk.yellow(fileDir)}`);

    const plugin = await import(fileDir);

    plugins.setState({[fileDir]: plugin})

    log.verbose(`Plugin successfully loaded`);

    return plugin;
}

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