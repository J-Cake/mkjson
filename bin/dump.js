import fs from 'node:fs/promises';
import chalk from "chalk";
import State from '@j-cake/jcake-utils/state';
import {iterSync} from "@j-cake/jcake-utils/iter";

const config = new State({
    force: false,
    file: process.argv[2]
});

for (const { current: i, skip: next } of iterSync.peekable(process.argv.slice(3)))
    if (i === '-f' || i === '--force')
        config.setState({force: true});

    else
        throw `Option ${chalk.yellow(i)} was not recognised`;

process.stdin.pipe(await fs.open(config.get().file, config.get().force ? 'w' : 'wx')
    .then(file => file.createWriteStream()));