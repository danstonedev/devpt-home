import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const simmove=resolve(process.env.DEVPT_SIMMOVE_SOURCE || resolve(root,'../simmove'));
const entry=resolve(simmove,'scripts/run-native-gait-physics.mjs');
const runtime=resolve(simmove,'node_modules/@mujoco/mujoco');
if(!existsSync(entry)||!existsSync(runtime))throw new Error('Prepare the canonical simMOVE gait runner and npm dependencies first.');
const out=resolve(root,'.cache/local-physics');
mkdirSync(out,{recursive:true});
await build({entryPoints:[entry],outfile:resolve(out,'gait-runner.mjs'),bundle:true,platform:'node',format:'esm',target:'node20',external:['@mujoco/mujoco'],logLevel:'info'});
mkdirSync(resolve(out,'node_modules/@mujoco'),{recursive:true});
cpSync(runtime,resolve(out,'node_modules/@mujoco/mujoco'),{recursive:true});
console.log(`Built canonical simMOVE MuJoCo runtime: ${out}`);
