import StateManager from "@j-cake/jcake-utils/state";

export interface Args {
    artifacts: string[],
    force: boolean,
    all: boolean,
    synchronous: boolean,
    logLevel: 'err' | 'info' | 'verbose' | 'debug',
    makefilePath: string[],
    env: Record<string, string>,
    blockScripts: boolean
}

export const config = new StateManager<Args>({
    force: false,
    all: false,
    logLevel: 'info',
    synchronous: false,
    artifacts: [],
    env: {},
    blockScripts: false,
    makefilePath: []
});