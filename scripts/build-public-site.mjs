import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = resolve(root, '.cache/public-site');
const files = ['index.html','privacy.html','terms.html','accessibility.html','sitemap.html','resource-credits.html','apps.json','styles.css','emr-foundation.css','portfolio.css','native-showcase.css','product-walkthrough.css','app.js','walkthrough.js','product-walkthrough.js','portfolio.js','feature-workspaces.js','teaching-library.js','teaching-library.css','site-bootstrap.js','site-media.js','site-fonts.css','staticwebapp.config.json','favicon.ico','robots.txt','sitemap.xml'];
rmSync(output, { recursive: true, force: true });
mkdirSync(output, { recursive: true });
for (const file of files) if (existsSync(resolve(root, file))) cpSync(resolve(root, file), resolve(output, file));
for (const dir of ['assets','simlab','emrs','3dpain','showcase','platform-terms']) if (existsSync(resolve(root, dir))) cpSync(resolve(root, dir), resolve(output, dir), { recursive: true });
// This explicit export excludes source docs, development catalogs, local servers,
// simulation runners, node_modules, caches and generated product copies.
const html = readFileSync(resolve(output, 'index.html'), 'utf8');
for (const required of ['/site-bootstrap.js','/site-media.js','/site-fonts.css','/teaching-library.css','/assets/navigation-state.js']) {
  if (!html.includes(required) || !existsSync(resolve(output, required.slice(1)))) throw new Error(`Missing public entry dependency: ${required}`);
}
if (/noindex|local-site-config\.js|local-site-fonts\.css/.test(html)) throw new Error('The public entry must not depend on local-only artifacts.');
writeFileSync(resolve(output, 'release.json'), JSON.stringify({ schemaVersion: 1, site: 'devpt.app', revision: process.env.GITHUB_SHA || 'local-production-review', catalog: 'https://lab.devpt.app/teaching/catalog.json' }, null, 2) + '\n');
console.log(`Built public site from explicit website sources: ${output}`);
