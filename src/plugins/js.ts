import chalk from 'chalk';
import * as core from '#core';
import {log} from "#core";

export async function loadMakefile(hint: string): Promise<Nullable<{ path: string, hint: string, targets: core.TargetList }>> {
    const path = core.Path.toFileURL(core.Path.toAbs(hint));

    log.debug("Path:", path);

    const makefile = await import(path)
        .catch(err => (['debug'].includes(core.config.get().logLevel) && core.log.err(err), null)); // the rest is handled by ../lib.ts

    if (makefile)
        return {
            path,
            hint,
            targets: core.Makefile.targets.get()
        };

    else throw `Invalid makefile: ${chalk.blue(path)}`;
}