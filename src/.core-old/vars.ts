import cp from 'node:child_process';
import {iter} from '@j-cake/jcake-utils/iter';

export default async function initVars(vars: Record<string, string | string[]>): Promise<Record<string, string>> {
    const names: Record<string, string> = {};

    if (!vars)
        return names;

    for (const [a, i] of Object.entries(vars))
        if (Array.isArray(i))
            await iter.collect(i
                .map(i => cp.spawn('bash', ['-c', i], {
                    env: {
                        ...names,
                        ...process.env,
                    }
                }))
                .map(i => i.stderr.pipe(process.stderr, { end: false }) && i)
                .reduce((a, i) => a.stdout.pipe(i.stdin) && i)
                .stdout)
                .then(data => names[a] = Buffer.concat(data).toString('utf8'));
        else {
            const cmd = cp.spawn('bash', ['-c', i], {
                env: {
                    ...names,
                    ...process.env,
                }
            });
            cmd.stderr.pipe(process.stderr, { end: false });
            await iter.collect(cmd.stdout)
                .then(data => names[a] = Buffer.concat(data).toString('utf8'));
        }

    return names;
}