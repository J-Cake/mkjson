import _ from 'lodash';
import * as Format from '@j-cake/jcake-utils/args';
import StateManager from '@j-cake/jcake-utils/state';

import { Locale } from './log.js';

export interface Config {
    threads: number,
    selector: string[],
    origin: string | null,
    targets: string[],
    logLevel: 'err' | 'info' | 'verbose' | 'debug',
    preferredLocale: string,
    shell: string,
    locale: StateManager<Record<string, Locale>>
    env: Record<string, string>,
    force: boolean
}

export const config: StateManager<Config> = new StateManager({
    threads: 1,
    selector: ['targets'],
    origin: 'package.json',
    targets: [], // Target List
    logLevel: 'info',
    preferredLocale: 'en_GB',
    shell: 'bash',
    locale: null as any,
    env: process.env,
    force: false,
} as Config);

export default async function parse(argv: string[]): Promise<Config> {
    const _argv = [...argv];
    const mkArg = (str: string) => str.includes(':') ? ({
        [str.slice(0, str.indexOf(':'))]: str.slice(str.indexOf(':') + 1)
    }) : { [str]: '' };

    config.setState({
        locale: new StateManager<Record<string, Locale>>({
            en_GB: await import('../locale/en_GB.js').then(res => res.default),
        })
    });

    while (_argv.length > 0) {
        const arg = _argv.shift()!;

        if (arg == '--origin' || arg == '-o')
            config.setState({ origin: _argv[0] == '--' ? (_argv.shift(), null) : _argv.shift() });

        else if (arg == '--selector' || arg == '-s')
            if (_argv[0] && !_argv[0].startsWith('-') && _argv[0].trim() !== '.')
                config.setState({ selector: _argv.shift()?.split('.') })
            else
                config.setState({ selector: [] })

        else if (arg == '--threads' || arg == '-j')
            config.setState({ threads: parseInt(_argv.shift()!) });

        else if (arg == '--log-level' || arg == '--logLevel' || arg == '-l')
            config.setState({ logLevel: Format.oneOf(['err', 'info', 'verbose', 'debug'] as const, false)(_argv.shift()!) });

        else if (arg == '--shell' || arg == '-sh')
            config.setState({ shell: _argv.shift() });

        else if (arg == '-B' || arg == '--force-run')
            config.setState({ force: true });

        else if (arg == '--env' || arg == '-e')
            config.setState(prev => ({
                env: {
                    ...prev.env,
                    ...mkArg(_argv.shift()!)
                }
            }));

        else
            config.setState((prev: Config) => ({ targets: [...prev.targets, arg] }));
    }

    return config.get();
}