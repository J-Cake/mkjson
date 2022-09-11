import urllib from 'node:url';
import http from 'node:http';
import https from 'node:https';

import * as core from '#core';

export async function loadMakefile(hint: string): Promise<core.TargetList> {
    const url = new urllib.URL(hint, 'http://localhost:80/');

    const scheme = { http, https }[url.protocol];

    if (!scheme)
        throw `Invalid scheme ${url.protocol}`;

    throw `Not implemented`;

    return {};
}