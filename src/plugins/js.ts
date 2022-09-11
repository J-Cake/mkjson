import chalk from 'chalk';
import * as core from '#core';

export async function loadMakefile(hint: string): Promise<core.TargetList> {
    const path = core.Path.toAbs(hint);

    const makefile = await import(path)
        .catch(err => (console.error(err), null)); // the rest is handled by ../lib.ts

    if (makefile)
        return core.Makefile.targets.get();

    else throw `Invalid makefile: ${chalk.blue(path)}`;
}