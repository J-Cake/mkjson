import chalk from "chalk";

import * as Format from '@j-cake/jcake-utils/args';
import {iterSync} from '@j-cake/jcake-utils/iter';

import * as mkjson from "#core";
import log from "./core/log.js";

export const help = (pkg: typeof import('../package.json')) => `Usage: ${chalk.whiteBright(pkg.name)} [options] [...artifacts]

Options:
    --makefile, -m ${chalk.yellow('<path>')}   Path to the makefile to use
    --log-level ${chalk.yellow('<level>')}     Set the log level (err, info, verbose, debug)
    --force, -B             Update dependencies even if they haven't changed
    --load-plugin           Loads a plugin
    --version, -v           Print the version
    --help                  Print this message

Artifacts:
    The artifacts to build. If not specified, the first defined artifact will be built.
`;

export default async function main(argv: string[], pkg: typeof import('../package.json')) {
    const logLevel = Format.oneOf(['err', 'info', 'verbose', 'debug'] as const, false);

    process.title = 'mkjson';

    mkjson.log.debug(`Loading plugins`);
    for (const i of pkg.plugins)
        await mkjson.Plugin.loadPlugin(i);

    for (const {current: i, skip: next} of iterSync.peekable(argv))
        if (i == '--makefile' || i == '-m')
            await mkjson.API.loadMakefile(next());
        else if (i == '--log-level')
            mkjson.config.setState({logLevel: logLevel(next())});
        else if (i == '--force' || i == '-B' || i == '-f')
            mkjson.config.setState({force: true});
        else if (i == '--load-plugin')
            await mkjson.Plugin.loadPlugin(mkjson.Path.toAbs(next()));
        else if (i == '--version' || i == '-v')
            return void mkjson.log.info(`Version: ${chalk.whiteBright(pkg.version)}`);
        else if (i == '--help')
            return void mkjson.log.info(help(pkg));
        else
            mkjson.config.setState(prev => ({artifacts: [...prev.artifacts, i]}));

    mkjson.log.debug(`Loading Makefile`)

    if (mkjson.config.get().makefilePath.length <= 0)
        await mkjson.API.loadMakefile('makefile.json')
            .catch(() => mkjson.API.loadMakefile('makefile.json5'))
            .catch(() => mkjson.API.loadMakefile('makefile.js'))
            .catch(() => mkjson.API.loadMakefile('package.json')) // gotta get the slogan right!
            .catch(() => mkjson.log.err(`No makefile was found.`));

    const artifacts = mkjson.config.get().artifacts;
    for (const i of artifacts) {
        const rules = await mkjson.Makefile.getRule(i);

        if (rules.length <= 0)
            throw log.err(`No rule found for ${chalk.blue(i)}`);

        await mkjson.run(...rules);
    }

    return true;
}
