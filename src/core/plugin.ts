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
    parseGlob(glob: string): (value: string) => boolean,
}>

export const schemes: Map<string, Partial<SchemeHandler>> = new Map();
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


export interface SchemeHandler {
    getMTime(file: string): Promise<Date | number>,

    getSize(file: string): Promise<number>,

    lsDir(dir: string): AsyncIterable<string>
}

/**
 * Register a file scheme. This is useful if mkjson is supposed to target files outside a typical filesystem, such as HTTP or SFTP
 * @param scheme The scheme identifier - must be unique, and match /^[a-zA-Z][a-zA-Z0-9]*$/
 * @param handlers {SchemeHandler}
 */
export function registerScheme(scheme: string, handlers: Partial<SchemeHandler>) {
    if (schemes.has(scheme))
        throw `Scheme name is already in use`;

    return schemes.set(scheme, handlers)
        .get(scheme);
}

export * as API from './plugin-api.js';