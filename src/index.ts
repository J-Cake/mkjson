import parse from "./config.js";
import parseMakefile from './make.js';

export default async function main(argv: string[]): Promise<number> {
    const config = await parse(argv.slice(2));

    const makefile = await parseMakefile(config);

    makefile.runTarget(...config.targets);

    return 0;
}