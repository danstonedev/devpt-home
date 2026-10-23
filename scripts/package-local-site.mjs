import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const workspace=resolve(root,'..');
const simlab=resolve(workspace,'simlab');
const emr=resolve(workspace,'devpt-emr-platform');
const simpacs=resolve(workspace,'simpacs');
const simmove=resolve(workspace,'simmove');
const builds={native:resolve(simlab,'.cache/teaching-preview'),'emr-native':resolve(emr,'build/emr-native'),pacs:resolve(simpacs,'build'),physics:resolve(root,'.cache/local-physics')};
const output=resolve(process.argv[2] || resolve(workspace,'scratch/devpt-site-local'));
if(existsSync(output)) throw new Error(`Choose a new output directory: ${output}`);
for(const path of [resolve(root,'local-site-config.js'),resolve(builds.native,'teaching/index.html'),resolve(builds.native,'showcase/index.html'),resolve(builds['emr-native'],'index.html'),resolve(builds.pacs,'embed.html'),resolve(builds.physics,'gait-runner.mjs')]) if(!existsSync(path)) throw new Error(`Build canonical local target first: ${path}`);
mkdirSync(output,{recursive:true});
// Actual site sources are exported once; native products below are disposable builds.
const files=['index.html','privacy.html','terms.html','accessibility.html','sitemap.html','resource-credits.html','apps.json','styles.css','emr-foundation.css','portfolio.css','native-showcase.css','product-walkthrough.css','app.js','walkthrough.js','product-walkthrough.js','feature-workspaces.js','teaching-library.js','teaching-library.css','library-routes.js','site-analytics.js','site-bootstrap.js','site-media.js','site-fonts.css','local-site-config.js','local-site-fonts.css','favicon.ico','robots.txt','sitemap.xml'];
for(const name of files) if(existsSync(resolve(root,name))) cpSync(resolve(root,name),resolve(output,name));
for(const name of ['assets','simlab','emrs','3dpain','showcase','platform-terms']) if(existsSync(resolve(root,name))) cpSync(resolve(root,name),resolve(output,name),{recursive:true});
mkdirSync(resolve(output,'scripts'));
cpSync(resolve(root,'scripts/serve-local-site.mjs'),resolve(output,'scripts/serve-local-site.mjs'));
cpSync(resolve(root,'scripts/local-gait-physics.mjs'),resolve(output,'scripts/local-gait-physics.mjs'));
for(const [name,path] of Object.entries(builds)) cpSync(path,resolve(output,name),{recursive:true});
mkdirSync(resolve(output,'design-notes'));
for(const name of ['teaching-library-plan.md','gait-lab-teaching-critique.md']) cpSync(resolve(root,'docs',name),resolve(output,'design-notes',name));
const attribution=[
 [simlab,'apps/mission-shell/src/lib/lab/joints/assets/ATTRIBUTION.md','joint-anatomy.md'],
 [simlab,'apps/mission-shell/src/lib/lab/joints/assets/anatomy-systems/ATTRIBUTION.md','anatomy-systems.md'],
 [simlab,'apps/mission-shell/src/lib/neuro/nerves/ATTRIBUTION.md','neuro.md'],
 [simpacs,'ATTRIBUTION.md','simpacs.md'],
 [simlab,'apps/mission-shell/node_modules/@fontsource/hanken-grotesk/LICENSE','hanken-grotesk-LICENSE.txt'],
 [simlab,'apps/mission-shell/node_modules/@fontsource/jetbrains-mono/LICENSE','jetbrains-mono-LICENSE.txt'],
 [simlab,'apps/mission-shell/node_modules/three/LICENSE','three-LICENSE.txt'],
 [simlab,'apps/mission-shell/node_modules/svelte/LICENSE.md','svelte-LICENSE.md'],
 [simmove,'node_modules/@mujoco/mujoco/README.md','MuJoCo-package-README.md'],
];
mkdirSync(resolve(output,'credits'));
for(const [repo,path,name] of attribution) cpSync(resolve(repo,path),resolve(output,'credits',name));
cpSync(resolve(root,'assets/teaching/sources.json'),resolve(output,'credits/poster-sources.json'));
cpSync(resolve(root,'docs/local-site-preview.md'),resolve(output,'README.md'));
writeFileSync(resolve(output,'START-PREVIEW.cmd'),'@echo off\r\ncd /d "%~dp0"\r\nwhere node >nul 2>nul\r\nif errorlevel 1 (\r\n  echo Install Node.js 20 or newer from https://nodejs.org and run this file again.\r\n  pause\r\n  exit /b 1\r\n)\r\nnode scripts/serve-local-site.mjs --open\r\npause\r\n');
writeFileSync(resolve(output,'start-preview.sh'),'#!/bin/sh\ncd "$(dirname "$0")" || exit 1\nnode scripts/serve-local-site.mjs --open\n',{mode:0o755});
const git=(repo,...args)=>execFileSync('git',args,{cwd:repo,encoding:'utf8'}).trim();
const sources=[root,simlab,emr,simpacs,simmove].map(repo=>({repository:git(repo,'remote','get-url','origin'),revision:git(repo,'rev-parse','HEAD'),localChanges:git(repo,'status','--short'),engineRevision:existsSync(resolve(repo,'pose-engine'))?git(resolve(repo,'pose-engine'),'rev-parse','HEAD'):undefined,
 workingFiles:git(repo,'ls-files','-m','-o','--exclude-standard').split('\n').filter(Boolean).filter(path=>existsSync(resolve(repo,path))&&statSync(resolve(repo,path)).isFile()).map(path=>({path,sha256:createHash('sha256').update(readFileSync(resolve(repo,path))).digest('hex')})),
}));
const walk=dir=>readdirSync(dir).sort().flatMap(name=>{const path=resolve(dir,name);return statSync(path).isDirectory()?walk(path):[path];});
const manifest={schemaVersion:1,purpose:'Complete DevPT local development review. Canonical source-owned product builds; no publication approval.',generatedAt:new Date().toISOString(),clinicalApproval:false,regeneration:'Rebuild each canonical local teaching target, then run build:local and package:local. Never edit exported native, emr-native or pacs files.',sources,
 files:walk(output).map(path=>({path:relative(output,path).split(sep).join('/'),bytes:statSync(path).size,sha256:createHash('sha256').update(readFileSync(path)).digest('hex')}))};
writeFileSync(resolve(output,'source-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(`Packaged complete local DevPT site (${manifest.files.length} files): ${output}`);
