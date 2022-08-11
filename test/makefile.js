import target, {shell} from 'mkjson';

target("build/cli.js", shell(`mkdir -p build`));