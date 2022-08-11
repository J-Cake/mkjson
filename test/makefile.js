import target, {shell} from 'mkjson';

target("build/cli.js", shell(`echo hi`));