import StateManager from "@j-cake/jcake-utils/state";
import {Iter} from '@j-cake/jcake-utils/iter';

import {config} from "./config.js";
import lsGlob, {glob, toAbs} from "./path.js"

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
        const matchers = target.split(';').map(target => glob(toAbs(target)));

        const matchesTarget = matchers
            .map(i => i.exec(artifact))
            .filter(i => i)
            .map(i => ({file: i![0], wildcards: i!.slice(1)}));

        const matchesArtifact = await Iter(lsGlob(artifact))
            .map(artifact => matchers
                .map(i => i.exec(artifact.file))
                .filter(i => i)
                .map(i => ({
                    file: i![0],
                    wildcards: i!.slice(1)
                }))
                .filter(i => i.file?.length > 0))
            .flat()
            .collect();

        const allTargets = [...matchesTarget, ...matchesArtifact];

        if (allTargets.length > 0)
            if (config.get().all)
                return allTargets.map(i => ({
                    ...i,
                    rule
                }));
            else
                return [{
                    ...allTargets[0],
                    rule,
                }]
    }

    return [];
}