import StateManager from '@j-cake/jcake-utils/state';
import * as iterSync from '@j-cake/jcake-utils/iterSync';
import * as Format from '@j-cake/jcake-utils/args';

import { Makefile } from './makefile.js';
import findMakefile from './makefile.js';
import buildArtifacts from './run.js';
import initVars from './vars.js';

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
    env: Record<string, string>
}

export const config = new StateManager<Args>({
    force: Force.None,
    logLevel: 'info',
    synchronous: false,
    artifacts: [],
    env: {}
});

export default async function main(argv: string[]) {
    const logLevel = Format.oneOf(['err', 'info', 'verbose', 'debug'] as const, false);

    for (const { current: i, skip: next } of iterSync.peekable(argv))
        if (i === '--makefile' || i == '-m')
            config.setState({ makefile: await findMakefile(next()) });
        else if (i === '--log-level')
            config.setState({ logLevel: logLevel(next()) });
        else if (i === '--force' || i == '-B' || i == '-f')
            config.setState({ force: Force.Superficial });
        else if (i == '--force-absolute')
            config.setState({ force: Force.Absolute });
        else if (i === '--synchronous' || i == '-S')
            config.setState({ synchronous: true });
        else
            config.setState(prev => ({ artifacts: [...prev.artifacts, i] }));

    if (!config.get().makefile)
        config.setState({ makefile: await findMakefile() });

    config.setState({ env: await initVars(config.get().makefile.variables) });
    await buildArtifacts(config.get().artifacts)

    return 0;
}