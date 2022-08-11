import target, {shell} from 'mkjson';

target("build/run.js", shell(`echo hi`));