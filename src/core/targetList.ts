import chalk from "chalk";
import StateManager from "@j-cake/jcake-utils/state";

import log from "./log.js";
import {config} from "./config.js";

export const targets: StateManager<TargetList> = new StateManager({});

export declare type TargetList = Record<string, Rule>;
export declare type Rule = Partial<{
    dependencies: string[],
    orderOnly: string[],
    phony: boolean,
    env: Record<string, string>,
    cwd: string,
    run(target: string, env: Record<string, string>): Promise<boolean>,
}>;

export type MatchResult = { rule: Rule, file: string, wildcards: string[] };

export async function* lsGlob(glob: string): AsyncGenerator<string> {
    const segments = glob.split('/');
}

export async function getRule(artifact: string): Promise<MatchResult[]> {
    // const artifact = toAbs(artifactHint, process.cwd());
    for (const [target, rule] of Object.entries(targets.get())) {
        const matchers = target.split(';').map(target => new RegExp('^' + decodeURIComponent(target
            .replaceAll(/([.\-\/^$?\[\]{}])/g, '\\$1')
            .replaceAll('*', '(.*)')
            .replaceAll('+', '([^\/]*)')) + '$', 'g'));

        const valid = matchers
            .map(function (i) {
                const [file, ...wildcards] = i.exec(artifact) ?? [];
                return {file, wildcards};
            })
            .filter(i => i.file);

        if (valid.length > 0)
            if (config.get().all)
                return valid.map(i => ({
                    ...i,
                    rule
                }));
            else
                return [{
                    ...valid[0],
                    rule,
                }]
    }

    return [];
}