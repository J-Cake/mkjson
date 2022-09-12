import chalk from "chalk";
import StateManager from "@j-cake/jcake-utils/state";
import {Iter} from '@j-cake/jcake-utils/iter';

import {config} from "./config.js";
import lsGlob, {toAbs} from "./path.js"
import * as plugins from "./plugin.js";
import log from "./log.js";

export const targets: StateManager<TargetList> = new StateManager({});

export declare type TargetList = Record<string, Rule>;
/**
 * The valid properties which are used internally
 */
export declare type Rule = Partial<{
    dependencies: string[],
    orderOnly: string[],
    phony: boolean,
    env: Record<string, string>,
    cwd: string,
    run(target: string, env: Record<string, string>): Promise<boolean>,
}>;

/**
 * The list of rules which a glob string matches
 */
export type MatchResult = { rule: Rule, file: string, wildcards: string[] };

/**
 * Search for a rule matching a target in the received list of rules
 * @param artifactHint
 */
export async function getRule(artifactHint: string): Promise<MatchResult[]> {
    const artifact = toAbs(artifactHint);
    for (const [target, rule] of Object.entries(targets.get())) {
        const matchers = target.split(';').map(target => plugins.API.createGlob(toAbs(target)));

        const matchesTarget = matchers
            .map(i => i.exec(artifact))
            .filter(i => i.file.length > 0);

        log.debug(`Fetching rules for ${chalk.yellow(artifact)}`);

        const matchesArtifact = await Iter(lsGlob(artifact))
            .map(artifact => matchers
                .map(i => i.exec(artifact.file))
                .filter(i => i?.file?.length > 0))
            .flat()
            .collect();

        log.debug(`Matched values`, matchesArtifact);

        const allTargets = [...matchesTarget, ...matchesArtifact];

        if (allTargets.length > 0)
            return allTargets.map(i => ({ ...i, rule }));
    }

    return [];
}