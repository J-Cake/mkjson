import app from '#app';

await app(process.argv, process.env)
    .then(function(code) {
        console.error(`Process exited with code ${code}`);
        process.exit(code);
    }).catch(function (err) {
        console.error(err instanceof Error ? err.stack : err);
        process.exit(-1);
    });