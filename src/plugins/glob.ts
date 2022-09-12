import _ from 'lodash';

import {Plugin} from '#core';

export function createGlob(glob: string): Plugin.Glob {
    const regExp = new RegExp('^' + decodeURIComponent(glob
        .replaceAll(/([.\-\/^$?\[\]{}])/g, '\\$1')
        .replaceAll('*', '(.*)')
        .replaceAll('+', '([^\/]*)')) + '$', 'g');

    const exe = str => _.chain((regExp.lastIndex = -1, regExp.exec(str) ?? []))
        .reduce((a, i, b) => b == 0 ? [i, a[1], str] as typeof a : [a[0], [...a[1], i], str] as typeof a, ['', [], ''] as [string, string[], string])
        .zip(['file', 'wildcards', 'raw'])
        .map(i => [i[1], i[0]])
        .fromPairs()
        .value() as { file: string, wildcards: string[], raw: string };

    return {
        exec: str => _.chain((regExp.lastIndex = -1, regExp.exec(str) ?? []))
            .reduce((a, i, b) => b == 0 ? [i ?? '', a[1], str] as typeof a : [a[0] ?? '', [...a[1], i], str] as typeof a, ['', [], ''] as [string, string[], string])
            .zip(['file', 'wildcards', 'raw'])
            .map(i => [i[1], i[0]])
            .fromPairs()
            .value() as { file: string, wildcards: string[], raw: string },
        matches: regExp.test
    };
}