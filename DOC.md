# mkjson

> The make-like build tool that lives in your `package.json`.

## Synopsis

```mkjson [options]... [targets]...```

### Options
* `-B`, `--force`: Unconditionally make all targets.
* `--log-level [err | info | verbose | debug]`: Set the log level.
* `-V`, `--version`: Print the version number.

---

mkjson is a make-like build tool but without shell syntax. With mkjson you can use familiar `makefile` setups with great
efficiency, without worrying about weird shell interpretation issues.

## Using

mkjson recursively searches for any one of five files in the current directory and any of its parent directories in the
given order;

* `makefile.js`
* `makefile.json`
* `makefile.json5`
* `makefile`
* `Makefile`
* `package.json`

> **Note:** JSON5 is supported. Even if `package.json` doesn't support json5, it is valid from `mkjson`'s perspective.

if any are found in any parent directory, it is considered the project's `makefile`. Alternatively, one can be
explicitely specified using the `--makefile` flag.

All targets must be placed inside the `targets` section in the file regardless of its name.

```json5
{
    "name": "myproject",
    // ...
    "targets": {
        // ...
    }
}
```

## Targets and Rules

Targets are the names of files or build steps. These are any _key_ in the `targets` map in the makefile. They may
represent one or multiple files on disk, or a generic name for a _phony_ target, such as `clean`.

A rule is the list of properties defined on the target key. These include its dependencies, run steps and other options.

A rule's build step is executed if any of the following conditions are met:

* The `--force` (-B) option is present
* The rule is `phony`
* Any of the target's dependencies were updated
    * If the dependency represents a file on disk, the target and dependency's modification times are compared.
      If the dependency's is greater (the dependency was modified more recently than the target), the target is rebuilt.
    * If the dependency represents a target, the steps listed above are run recursively.

### Target options

A target may define any combination of the following properties:

* `dependencies`: Defines a list of targets which must be updated before the build step continues
* `orderOnly`: Dependencies which are specified purely to retain
  order. [See GNU make order-only](https://www.gnu.org/software/make/manual/html_node/Prerequisite-Types.html#Prerequisite-Types)
* `run`:
    * If string: run as command as build step
    * If array of strings: run each string as command separately
    * If anything else: **Error**
* `parallel`: Whether the `run` steps should be run in parallel
* `isolate`: Whether each `run` step should be run in its own shell
* `cwd`: The directory from which the `run` steps are executed
* `env`: A list of environment variables to pass to the `run` steps.

## Environment Variables

Variables are useful for holding and retrieving information from the environment. This is useful if for instance you
wish to allow compilers to be hot-plugged or to easily swap interpreter versions etc.

Variables are declared in the makefile's `env` section. Keys are exported to environment variables, with values set to
the `stdout` stream when its value is run as a child process.

If the value is an array, each is interpreted as a child process and each's stdout is piped into the next's stdin, where
the last stdout is captured and used as the value. Analogous to UNIX shell's piping system.

```json5
{
    "name": "myproject",
    // ...
    "env": {
        "value1": [
            "cat package.json",
            "jq -r '.'"
        ]
    },
    "targets": {
        "test": {
            "phony": true,
            "run": "echo $value1"
        }
    }
}
```

## Scriptable Makefiles

`Makefile`s just tell mkjson what to do when a condition is met, this is usually in the form of some sort of command or
CLI invocation, however it is also possible to define targets dynamically using regular JavaScript files. This is useful
if your build step requires interacting with tools in non-standard ways, or if you require more fine-grained control
over how your build step is executed.

```javascript
import target, {shell} from "mkjson";

target("test", shell('echo hi'));
```

and run it as normal

```bash
$ mkjson --makefile ./makefile.js test
```

Note the use of the `--makefile` flag requires the `.js` extension to work.

> **Note**: Scripted makefiles can be blocked using the `--no-script` flag.