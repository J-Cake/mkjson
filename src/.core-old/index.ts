import StateManager from '@j-cake/jcake-utils/state';

export {default as findMakefile} from './makefile.js';
export {default as buildArtifacts} from './run.js';
export {default as initVars} from './vars.js';

export * as Makefile from './makefile.js';
export * as Run from './run.js';
export * as Vars from './vars.js';
export * as Log from './log.js';

export {log} from './log.js';
export {run} from './run.js';

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