import {promises as fs} from 'node:fs';
import chalk from "chalk";
import StateManager from "@j-cake/jcake-utils/state";

import {Rule, TargetList} from "./targetList.js";
import log from "./log.js";
import * as API from './plugin-api.js';
import * as Path from './path.js';
import os from "node:os";

export type {TargetList} from './targetList.js';

export type Plugin = Partial<{
    /**
     * Finds and loads a makefile from a (usually provided by CLI) hint used to locate it.
     * @param hint Where the makefile is to be loaded from
     */
    loadMakefile(hint: string): Promise<Nullable<{ targets: TargetList, path: string, hint: string }>>,
    /**
     * Creates a function which returns whether a string matches a globbing pattern
     * @param glob The glob string understood by the returned function
     */
    createGlob(glob: string): Glob,
}>

export const schemes: Map<string, Partial<SchemeHandler>> = new Map();
export const plugins = new StateManager<Record<string, Plugin>>({});
export let glob: Plugin['createGlob'];

/**
 * Loads a plugin - Add any compatible functionality to a list of loaded sources
 * @param source
 */
export async function loadPlugin(source: string): Promise<Plugin> {
    const fileDir = Path.toAbs(source, ["cygwin", "win32"].includes(os.platform()) ?
        import.meta.url.match(/^file:\/\/\/([a-z]:\/.*\/)[^\/]*$/i)?.[1] :
        import.meta.url.match(/^file:\/\/(\/.*\/)[^\/]*$/)?.[1]);

    log.debug(source, fileDir);
    // log.debug(await fs.stat(fileDir));

    if (!await fs.stat(fileDir).then(res => res.isFile() || res.isSymbolicLink()).catch(() => false))
        throw log.err(`Invalid plugin format: Plugins must be real files`);

    log.verbose(`Loading plugin: ${chalk.yellow(fileDir)}`);

    const plugin = await import(["cygwin", "win32"].includes(os.platform()) ? Path.toFileURL(fileDir) : fileDir);

    const createGlob = plugins.setState({[fileDir]: plugin})[fileDir].createGlob;
    if (createGlob)
        glob = createGlob;

    log.verbose(`Plugin successfully loaded`);

    return plugin;
}

export interface Glob {
    matches(str: string): boolean,
    exec(str: string): { file: string, wildcards: string[], raw: string, glob: string }
}

export interface SchemeHandler {
    /**
     * Get the time (in milliseconds) a file or resource was last modified.
     * @param file
     * @param target The target the rule was called from.
     */
    getMTime(file: string, target?: Rule): Promise<Date | number>,

    /**
     * Get the size of the file or resource in bytes
     * @param file
     * @param target The target the rule was called from.
     */
    getSize(file: string, target?: Rule): Promise<number>,

    /**
     * An iterator which lists all files in the specified directory recursively.
     * * The expected format is an absolute path from the volume root.
     * @param dir
     */
    lsDir(dir: string): AsyncIterable<string>,

    /**
     * Fetch the contents of a file in raw binary format
     * @param path
     */
    fetch(path: string): Promise<Buffer>,

    /**
     * Fetch the contents of a file using a given encoding format
     * @param path
     * @param encoding
     */
    fetch(path: string, encoding: API.Encoding): Promise<string>
    fetch(path: string, encoding?: API.Encoding): Promise<Buffer | string>
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
