import StateManager from '@j-cake/jcake-utils/state';

export {default as findMakefile, Makefile} from './makefile.js';
export {default as buildArtifacts} from './run.js';
export {default as initVars} from './vars.js';

export {run} from "./run.js";
export {log} from "./log.js";

export type {Rule} from './makefile.js';

import type {Makefile} from './makefile.js';

export enum Force {
    None,
    Superficial,
    Absolute
}

export interface Args {
    makefile: Makefile,
    artifacts: string[],
    force: Force,
    synchronous: boolean,
    logLevel: 'err' | 'info' | 'verbose' | 'debug',
    makefilePath: string,
    env: Record<string, string>,
    blockScripts: boolean
}

export const config = new StateManager<Args>({
    force: Force.None,
    logLevel: 'info',
    synchronous: false,
    artifacts: [],
    env: {},
    blockScripts: false
});