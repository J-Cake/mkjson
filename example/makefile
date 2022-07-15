.PHONY: clean configure run

./build/index.js: src/*.ts build/package.json build/run.js
	pnpm exec esbuild src/index.ts --outdir=build --bundle --sourcemap --splitting --platform=node --format=esm

./build/run.js: run.js
	ln -f run.js build/run.js

./build/package.json: package.json f1
	cat package.json | jq -r '{name} + {version, type, typings, main: "./run.js", "imports": "./index.js"}' > build/package.json

f1:
	echo "Hi"

run: build/index.json
	node ./build

clean: 
	rm -rf build node_modules *lock*

configure:
	pnpm install
	pnpm exec tsc --project ./tsconfig.json
	$(mkjson) ./build/index.js