import chalk from "chalk";
import _ from 'lodash';
import StateManager from "@j-cake/jcake-utils/state";
import {Iter} from '@j-cake/jcake-utils/iter';

import lsGlob, {toAbs} from "./path.js"
import * as plugins from "./plugin.js";
import log from "./log.js";
import {config} from "./config.js";

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
export type MatchResult = { rule: Rule, file: string, wildcards: string[], raw: string, glob: string };

/**
 * Search for a rule matching a target in the received list of rules
 * @param artifactHint
 */
export async function getRule(artifactHint: string): Promise<MatchResult[]> {
    const artifact = toAbs(artifactHint);
    const artifactGlob = plugins.API.createGlob(artifact);
    const out: MatchResult[] = Object.entries(targets.get())
        .map(([a, i]) => [i.phony ? a : toAbs(a), i] as [string, Rule])
        .map(([a, i]) => ({
            ...artifactGlob.exec(a),
            rule: i
        }))
        .filter(i => i.file.length > 0);

    // TODO: Handle artifact containing wildcards

    // if (out.length > 0 && !config.get().force)
    //     return out;

    for (const [target, rule] of Object.entries(targets.get())) {
        const matchers = target.split(';')
            .map(i => toAbs(i))
            .map(target => plugins.API.createGlob(target));

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

        log.debug(`Matched values`, matchesTarget, matchesArtifact);

        out.push(...[...matchesTarget, ...matchesArtifact].map(i => ({...i, rule})));
    }

    return _.uniqWith(out, (i, j) => _.isEqual({
        file: i.file,
        wildcards: i.wildcards,
        rule: i.rule
    }, {
        file: j.file,
        wildcards: j.wildcards,
        rule: j.rule
    }));
}