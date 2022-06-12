// run me with `pnpm exec mkjson -o makefile -s ''`

{
    'build/cli.js': {
        dependencies: ['src/*.ts', 'locale/*.ts'],
        run: [
            "mkdir -p build",
            "ln -f cli.js build/cli.js",
            "$npm_execpath exec esbuild src/index.ts --outdir=build --bundle --sourcemap --splitting --platform=node --format=esm"
        ]
    },
    check: {
        phony: true,
        run: "$npm_execpath exec tsc -p tsconfig.json && $npm_execpath run build"
    },
    'build/ts/*.js': {
        dependencies: ['src/*.ts', 'locale/*.ts'],
        run: "$npm_execpath exec tsc -p tsconfig.json"
    },
    'package.json': {
        dependencies: ['tsconfig.json'],
        run: "touch package.json"
    }
}
