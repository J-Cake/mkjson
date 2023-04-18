import os from 'node:os';
import cp from 'node:child_process';
import fs from 'node:fs/promises';
import * as rl from "node:readline";
import chalk from 'chalk';
import {iterSync} from '@j-cake/jcake-utils/iter';
import StateManager from '@j-cake/jcake-utils/state';
import * as Format from '@j-cake/jcake-utils/args';

const platform = Format.oneOf(['win32', 'posix'], false);

const argv = new StateManager({
    platform: ['cygwin', 'win32'].includes(os.platform()) ? 'win32' : 'posix',
    win32: 'bin/build_win32.json',
    posix: 'bin/build_posix.json',
    script: process.argv[2],
    pkg: await fs.open('package.json'),
    shell: process.env.ComSpec ?? process.env.SHELL ?? {
        win32: 'cmd.exe',
        posix: 'sh'
    }[['cygwin', 'win32'].includes(os.platform()) ? 'win32' : 'posix']
});

for (const {current: i, skip: next} of iterSync.peekable(process.argv.slice(3)))
    if (i === '--force-platform')
        argv.setState({platform: platform(next())});
    else if (i === '--win32')
        argv.setState({win32: next()});
    else if (i === '--posix')
        argv.setState({posix: next()});
    else if (i === '--package')
        argv.setState({pkg: await fs.open(next())});
    else if (i === '--shell')
        argv.setState({shell: next()});
    else
        throw `Option ${chalk.yellow(i)} was not recognised`;

const pkg = await (argv
    .get()["pkg"]
    .readFile('utf8'))
    .then(pkg => JSON.parse(pkg));

const cmd_line = await fs.readFile(argv.get()[argv.get().platform], 'utf8')
    .then(res => JSON.parse(res))
    .then(json => json[argv.get().script]);

if (typeof cmd_line == 'string') {

    const cmd = {
        executable: argv.get().shell,
        args: [['cmd', 'cmd.exe'].some(i => argv.get().shell.endsWith(i)) ? '/c' : '-c', cmd_line]
    };

    const status = Number(await new Promise(ok => cp.spawn(cmd.executable, cmd.args, {stdio: [process.stdin, process.stdout, process.stderr]})
        .once('exit', code => ok(code))));

    process.exit(status);

} else if (Array.isArray(cmd_line)) {
    const cmd = cmd_line.reduce((a, i) => typeof i == 'string' ? [...a.slice(0, -1), {
        ...a.at(-1),
        cmd: [...a.at(-1).cmd, i],
    }] : [...a, {...i, cmd: []}], [{op: "with", cmd: []}]);

    const replace = (list, vars, cb) => {
        const env = {...process.env, ...vars};
        const keys = Object.keys(env).sort((a, b) => a.length > b.length ? -1 : 1);

        return cb(list.map(i => keys.reduce((a, j) => a.replaceAll(`$${j}`, env[j]), i)));
    }

    /**
     * @type {cp.ChildProcess[]}
     */
    const processes = [];
    for (const stmt of cmd) {
        if (stmt.op === 'with') {
            const proc = cp.spawn(stmt.cmd.shift(), stmt.cmd);
            processes.push(proc);
        }
        else if (stmt.op === 'after')
            processes.at(-1).once('exit', code => {
                const proc = cp.spawn(stmt.cmd.shift(), stmt.cmd);
                processes.push(proc);
            });
        else if (stmt.op === 'pipe') {
            const proc = cp.spawn(stmt.cmd.shift(), stmt.cmd);
            processes.at(-1).piped = true;
            processes.at(-1).stdout.pipe(proc.stdin);
            processes.push(proc);
        } else if (stmt.op === 'for')
            for await (const line of rl.createInterface(processes.at(-1).stdout))
                replace(stmt.cmd, {[stmt.value]: line}, (cmd) => {
                    const proc = cp.spawn(cmd.shift(), cmd);
                    return processes.push(proc);
                })
    }

    const status = await Promise.all(processes.map(i => new Promise(function (ok, err) {
        if (i.exitCode)
            return i.exitCode === 0 ? Promise.resolve(0) : Promise.reject(i.exitCode);

        if (!i.piped)
            i.stdout.pipe(process.stdout);
        i.stderr.pipe(process.stderr);

        i.once('exit', code => code === 0 ? ok(0) : err(code));
    }))).catch(err => [err]);

    process.exit(status.every(i => i === 0) ? 0 : 1);
} else throw `Expected string or array of strings`;