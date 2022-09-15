import {Iter} from '@j-cake/jcake-utils/iter'
import {core} from 'mkjson';

await core.loadPlugin(core.Path.toAbs(`${import.meta.url.match(/^file:\/\/(\/.*\/)[^\/]*$/)?.[1] ?? process.cwd()}../build/fs.js`));

const contents = await Iter(core.Plugin.API.lsDir("/home/jcake/Code/Personal/mkjson/src/plugins/lsdir"))
    .collect();

console.log(contents);