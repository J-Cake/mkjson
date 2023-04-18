import module from 'node:module';
import os from "node:os";

const path = ["cygwin", "win32"].includes(os.platform()) ?
    `${import.meta.url.match(/^file:\/\/\/([a-z]:\/.*)/i)?.[1]}`.replaceAll('/', '\\') :
    `${import.meta.url.match(/^file:\/\/(\/.*)\/[^\/]*$/)?.[1]}`;

console.log("lsdir", path);

const req = module.createRequire(path);

export default req(["cygwin", "win32"].includes(os.platform()) ?
    '.\\lsdir.node' :
    './lsdir.node').ls_dir;