import module from 'node:module';

const path = import.meta.url.match(/^file:\/\/(\/.*\/)[^\/]*$/)?.[1];
const req = module.createRequire(path);

export default req('./lsdir.node').ls_dir;