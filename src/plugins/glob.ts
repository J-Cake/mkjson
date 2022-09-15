import _ from 'lodash';

import {Plugin} from '#core';

export function createGlob(glob: string): Plugin.Glob {
    const regExp = new RegExp('^' + decodeURIComponent(glob
        .replaceAll(/([.\-\/^$?\[\]{}])/g, '\\$1')
        .replaceAll('*', '(.*)')
        .replaceAll('+', '([^\/]*)')) + '$', 'g');

    return {
        exec(raw: string) {
            regExp.lastIndex = -1;
            const [file, ...wildcards] = regExp.exec(raw) ?? ['', ''];
            return {file, wildcards, raw, glob};
        },
        matches(str) {
            regExp.lastIndex = -1;
            return regExp.test(str);
        }

        // my adventures in one-liners was short-lived 🙁
        // exec: str => _.chain((regExp.lastIndex = -1, regExp.exec(str) ?? []))
        //     .reduce((a, i, b) => b == 0 ? [i ?? '', a[1], glob] as typeof a : [a[0] ?? '', [...a[1], i], glob] as typeof a, ['', [], ''] as [string, string[], string])
        //     .zip(['file', 'wildcards', 'raw'])
        //     .map(i => [i[1], i[0]])
        //     .fromPairs()
        //     .value() as { file: string, wildcards: string[], raw: string },
    };
}