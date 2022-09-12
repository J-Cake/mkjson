import target from 'mkjson';

target("build/*.js", async function(target, env) {
    console.log(target, env);

    return false; // fail
})