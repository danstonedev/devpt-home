import { createServer } from 'node:http';
import { createReadStream, existsSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { dirname, extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { createLocalGaitPhysics } from './local-gait-physics.mjs';

const scriptRoot = dirname(fileURLToPath(import.meta.url));
// The same server works in the checkout and in a disposable exported package.
const root = resolve(process.env.DEVPT_SITE_ROOT || resolve(scriptRoot, '..'));
const nativeRoot = resolve(process.env.DEVPT_NATIVE_ROOT || (existsSync(resolve(root, 'native')) ? resolve(root, 'native') : resolve(root, '../simlab/.cache/teaching-preview')));
const emrRoot = resolve(process.env.DEVPT_EMR_ROOT || (existsSync(resolve(root, 'emr-native')) ? resolve(root, 'emr-native') : resolve(root, '../devpt-emr-platform/build/emr-native')));
const pacsRoot = resolve(process.env.DEVPT_PACS_ROOT || (existsSync(resolve(root, 'pacs')) ? resolve(root, 'pacs') : resolve(root, '../simpacs/build')));
const port = Number(process.env.DEVPT_PREVIEW_PORT || 8110);
const physicsRoot=resolve(process.env.DEVPT_PHYSICS_ROOT || (existsSync(resolve(root,'physics'))?resolve(root,'physics'):resolve(root,'.cache/local-physics')));
const runGaitPhysics=createLocalGaitPhysics({runner:resolve(physicsRoot,'gait-runner.mjs')});
if (port !== 8110) throw new Error('The canonical local parent-origin contracts require port 8110.');
const mime = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.mjs':'text/javascript; charset=utf-8', '.json':'application/json', '.css':'text/css; charset=utf-8', '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.webp':'image/webp', '.ico':'image/x-icon', '.svg':'image/svg+xml', '.glb':'model/gltf-binary', '.gltf':'model/gltf+json', '.woff2':'font/woff2', '.woff':'font/woff', '.bin':'application/octet-stream', '.wasm':'application/wasm', '.gz':'application/gzip', '.mp4':'video/mp4', '.webm':'video/webm', '.mp3':'audio/mpeg' };
const servers = [];
const publicDirs = new Set(['assets','simlab','emrs','3dpain','showcase','platform-terms']);
const publicFiles = new Set(['index.html','privacy.html','terms.html','accessibility.html','sitemap.html','resource-credits.html','apps.json','styles.css','emr-foundation.css','portfolio.css','native-showcase.css','product-walkthrough.css','app.js','walkthrough.js','product-walkthrough.js','feature-workspaces.js','teaching-library.js','teaching-library.css','library-routes.js','site-analytics.js','site-bootstrap.js','site-media.js','site-fonts.css','local-site-config.js','local-site-fonts.css','favicon.ico','robots.txt','sitemap.xml']);
// This policy belongs to the canonical EMR build, including its public isolation.
const emrHeadersPath = resolve(emrRoot, 'headers.json');
if (!existsSync(emrHeadersPath)) throw new Error('Rebuild the canonical EMR teaching target to emit its header contract.');
const emrHeaders = JSON.parse(readFileSync(emrHeadersPath, 'utf8'));
if (typeof emrHeaders['content-security-policy'] !== 'string' || !emrHeaders['content-security-policy'].includes("connect-src 'none'")) throw new Error('EMR public isolation header contract is missing.');

function staticFile(req,res,base,pathname,extraHeaders={}) {
  let file;
  try {
    file = resolve(base, '.' + decodeURIComponent(pathname));
    if (file !== base && !file.startsWith(base + sep)) throw new Error('outside');
    if (existsSync(file) && statSync(file).isDirectory()) file = resolve(file, 'index.html');
    if (!existsSync(file) || !statSync(file).isFile()) { res.writeHead(404); res.end('Not found'); return; }
    if (!realpathSync(file).startsWith(realpathSync(base) + sep)) throw new Error('outside');
  } catch { res.writeHead(400); res.end('Invalid path'); return; }
  res.writeHead(200, { 'content-type':mime[extname(file)] || 'application/octet-stream', 'cache-control':'no-store', 'x-content-type-options':'nosniff', 'referrer-policy':'strict-origin-when-cross-origin', ...extraHeaders });
  if (req.method === 'HEAD') res.end(); else createReadStream(file).pipe(res);
}
function listen(server,listenPort) {
  servers.push(server);
  server.on('error',error=>{
    console.error(error.code === 'EADDRINUSE' ? `Port ${listenPort} is in use. Close the earlier preview and try again.` : error.message);
    for (const active of servers) active.close();
    process.exitCode=1;
  });
  server.listen(listenPort,'127.0.0.1');
}
const site=createServer((req,res)=>{
  if(req.url?.split('?')[0]==='/__local/gait-physics') {void runGaitPhysics(req,res);return;}
  if (!['GET','HEAD'].includes(req.method)) { res.writeHead(405); res.end(); return; }
  let url; try { url=new URL(req.url,'http://127.0.0.1'); } catch { res.writeHead(400); res.end(); return; }
  if (url.pathname.startsWith('/native/')) { staticFile(req,res,nativeRoot,url.pathname.slice('/native'.length)); return; }
  if (/^\/(runtime-assets|aquatic-assets)\//.test(url.pathname)) { staticFile(req,res,nativeRoot,url.pathname); return; }
  if (url.pathname.startsWith('/emr-native/')) { staticFile(req,res,emrRoot,url.pathname.slice('/emr-native'.length),emrHeaders); return; }
  const first=url.pathname.split('/')[1];
  if (url.pathname!=='/' && !publicDirs.has(first) && !publicFiles.has(first)) { res.writeHead(404); res.end('Not found'); return; }
  staticFile(req,res,root,url.pathname==='/'?'/index.html':url.pathname);
});
site.on('listening',()=>{
  const url=`http://127.0.0.1:${port}/`;
  console.log(`DevPT complete local site: ${url}\nKeep this window open. Press Ctrl+C to stop.`);
  if (process.argv.includes('--open')) {
    const [command,args]=process.platform==='win32'?['cmd',['/c','start','',url]]:process.platform==='darwin'?['open',[url]]:['xdg-open',[url]];
    const browser=spawn(command,args,{stdio:'ignore'});
    browser.on('error',()=>console.log(`Open ${url} in your browser.`));
  }
});
for (const [name,path] of [['SimLab',resolve(nativeRoot,'teaching/index.html')],['EMR',resolve(emrRoot,'index.html')],['simPACS',resolve(pacsRoot,'embed.html')]]) {
  if (!existsSync(path)) throw new Error(`${name} canonical local build missing: ${path}`);
}
// simPACS retains its owning application's root URLs on its own local origin.
listen(createServer((req,res)=>{
  if (!['GET','HEAD'].includes(req.method)) { res.writeHead(405); res.end(); return; }
  const url=new URL(req.url,'http://127.0.0.1');
  staticFile(req,res,pacsRoot,url.pathname==='/embed'?'/embed.html':url.pathname);
}),5181);
listen(site,port);
for (const signal of ['SIGINT','SIGTERM']) process.on(signal,()=>{for(const server of servers) server.close();});
