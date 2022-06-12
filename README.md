# MKJSON

MKJSON is a make-like build tool that lives in your `package.json`. It is similar in function to how many other `make` tools work, except that it doesn't rely on shell-like sytax to develop a project map. Using a JSON format is much clearer and yields less ambiguous target and rule patterns which may interfere with certain edge cases. 

## Usage

If you're familiar with traditional `makefile`s, you'll feel right at home here. 

By default MKJSON reads from `package.json/targets` (the `/` notation refers to a JSON subobject, rather than a directory. Note this convention is used throughout the document.). Take the following example file:

```json
{
    "name": "some-awesome-project",
    "main": "build/cli.js",
    "version": "0.0.1",
    "dependencies": {
        "chalk": "latest",
        "lodash": "latest"
        // ... many, many more
    },
    "@devDependencies": {
        "@types/node": "latest",
        "@types/lodash": "latest",
        "@j-cake/mkjson": "latest",
        "esbuild": "latest",
        "typescript": "latest",
        // ... many, many more
    },
    "targets": {
        "build/cli.js": {
            "dependencies": ["./cli.js"],
            "run": [
                "mkdir -p build",
                "ln -s ./cli.js build/cli.js"
            ]
        },
        "build/index.js": {
            "dependencies": ["src/*.ts"],
            "run": [
                "esbuild src/index.ts --outdir=build --bundle --sourcemap --splitting --format=esm --platform=node"
            ]
        },
        "clean": {
            "run": "rm -rf build node_modules *lock*",
            "phony": true
        },
        "check": {
            "dependencies": ["src/*.ts"],
            "run": "tsc -b tsconfig.json",
            "phony": true
        },
        "rebuild": {
            "dependencies": ["clean", "check", "build/index.js"],
            "phony": true
        }
    }
}
```

Whew, bit of a mouthful. The important thing is the `targets` section. Note that each target (like with true `makefile`s) represent actual files on disk. Those that don't are marked with `phony`.
MKJSON will analyse the filesystem to figure out which targets need to be rebuilt depending on its dependencies. 

As a rule-of-thumb, you should be aware that any target that isn't marked `phony` is attempted to be read from the filesystem, to fetch a modified date. If the file doesn't exist, it is assumed to be new and will be rebuilt. 

A target with a dependency which was more recently modified than it was will be rebuilt, regardless of whether it is marked `phony` (this is actually how `phony` is implemented).

## Best Pracices and dos-and-don'ts.

Projects warranting the use of `make` (especially for JavaScript/TypeScript projects) generally tend to be quite large. `makefile`s are designed for large projects (such as Linux, KDE, etc), and are very efficient to use, however, the program must be designed around the use of `makefile`s.

In JavaScript land, features such as bundling with code-splitting enabled makes apps very light on clients. It is encouraged to split apps into multiple pieces which can be lazy-loaded at runtime. Building two separate resources allows smaller bundles to be built more quickly, making the development, deployment and end user-experience generally more pleasant. 

With `esbuild`, this can be achieved using `--splitting` and `--format=esm` flags. 
Any lazy-loaded module can then be used through dynamic imports. 

```json
{
    // ...
    "targets": {
        "build/core.js": {
            "dependencies": ["core/*.ts", "build/page_+.js"],
            "run": [
                "esbuild core/index.ts --outdir=build --bundle --sourcemap --splitting --format=esm --platform=node"
            ]
        },
        "build/page_dashboard.js" {
            "dependencies": ["src/dashboard/*.ts", "src/dashboard/*.tsx"],
            "run": [
                "esbuild src/dashboard/index.tsx --outdir=build --bundle --sourcemap --splitting --format=esm --platform=node"
            ]
        },
        "build/page_profile.js" {
            "dependencies": ["src/profile/*.ts", "src/profile/*.tsx"],
            "run": [
                "esbuild src/profile/index.tsx --outdir=build --bundle --sourcemap --splitting --format=esm --platform=node"
            ]
        }
        // ...
    }
}
```

Bundles under `/core/` can be imported asynchronously, yielding a a split bundle.

```typescript
// import ...

export default async function App(page: 'dashboard' | 'profile') {
    if (page == 'dashboard')
        return await import('../src/dashboard/index.tsx')
    else if (page == 'profile')
        return await import('../src/profile/index.tsx');
}
```

The resulting build looks like this:

```
/build
    - core.js
    - page_dashboard*.js
    - page_profile*.js
```

and BAM! lazy-loading achieved.