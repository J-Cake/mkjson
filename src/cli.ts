import chalk from "chalk";

import * as Format from '@j-cake/jcake-utils/args';
import {iterSync} from '@j-cake/jcake-utils/iter';

import {buildArtifacts, config, findMakefile, Force, initVars, log} from "#core";

export const help = (pkg: typeof import('../package.json')) => `Usage: ${chalk.whiteBright(pkg.name)} [options] [artifacts]

Options:
    --makefile, -m ${chalk.yellow('<path>')}   Path to the makefile to use
    --log-level ${chalk.yellow('<level>')}     Set the log level (err, info, verbose, debug)
    --force                 Update dependencies even if they haven't changed
    --force-absolute        Update dependencies even if they haven't changed
    --synchronous           Run commands synchronously
    --no-scripts            Don't run scripts
    --version, -v           Print the version
    --help                  Print this message

Artifacts:
    The artifacts to build. If not specified, the first defined artifact will be built.
`;

export default async function main(argv: string[], pkg: typeof import('../package.json')) {
    const logLevel = Format.oneOf(['err', 'info', 'verbose', 'debug'] as const, false);

    for (const {current: i, skip: next} of iterSync.peekable(argv))
        if (i === '--makefile' || i == '-m')
            await findMakefile(next());
        else if (i === '--log-level')
            config.setState({logLevel: logLevel(next())});
        else if (i === '--force' || i == '-B' || i == '-f')
            config.setState({force: Force.Superficial});
        else if (i == '--force-absolute')
            config.setState({force: Force.Absolute});
        else if (i === '--synchronous' || i == '-S')
            config.setState({synchronous: true});
        else if (i === '--no-scripts')
            config.setState({blockScripts: true});
        else if (i === '--version' || i == '-v')
            return void log.info(`Version: ${chalk.whiteBright(pkg.version)}`);
        else if (i === '--help')
            return void log.info(help(pkg));
        else
            config.setState(prev => ({artifacts: [...prev.artifacts, i]}));

    if (!config.get().makefile)
        await findMakefile();
    // config.setState({makefile: await findMakefile()});

    config.setState({env: await initVars(config.get().makefile.env)});
    await buildArtifacts(config.get().artifacts)

    return 0;
}