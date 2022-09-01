import target, {shell} from 'mkjson';

// target("build/run.js", shell(`echo hi`));

target("build/*.js", function(env) {
    console.log(env);
})