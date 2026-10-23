import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import routes from '../library-routes.js';
import { libraryRenderer } from './library-renderer.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const catalogUrl = 'https://lab.devpt.app/teaching/catalog.json';
const escape = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const json = value => JSON.stringify(value).replace(/</g, '\\u003c');

export function buildPublicSite({ catalog, output = resolve(root, '.cache/public-site') }) {
  const renderer = libraryRenderer(root, catalog);
  const files = ['index.html','privacy.html','terms.html','accessibility.html','sitemap.html','resource-credits.html','apps.json','styles.css','emr-foundation.css','portfolio.css','native-showcase.css','product-walkthrough.css','app.js','walkthrough.js','product-walkthrough.js','portfolio.js','feature-workspaces.js','teaching-library.js','teaching-library.css','library-routes.js','site-analytics.js','site-bootstrap.js','site-media.js','site-fonts.css','staticwebapp.config.json','favicon.ico','robots.txt'];
  rmSync(output, { recursive: true, force: true });
  mkdirSync(output, { recursive: true });
  for (const file of files) if (existsSync(join(root, file))) cpSync(join(root, file), join(output, file));
  for (const dir of ['assets','simlab','emrs','3dpain','showcase','platform-terms']) if (existsSync(join(root, dir))) cpSync(join(root, dir), join(output, dir), { recursive: true });
  const template = readFileSync(join(root, 'index.html'), 'utf8');
  for (const required of ['/site-bootstrap.js','/site-media.js','/site-fonts.css','/teaching-library.css','/library-routes.js','/site-analytics.js']) {
    if (!template.includes(required) || !existsSync(join(output, required.slice(1)))) throw new Error('Missing public entry dependency: ' + required);
  }
  if (/local-site-config\.js|local-site-fonts\.css/.test(template)) throw new Error('The public entry must not depend on local-only artifacts.');
  const pages = ['/', '/regions/', '/topics/', '/products/', '/contact/', '/faculty/', '/search/', '/saved/',
    ...renderer.regions.map(item => routes.href('region/' + item.id)),
    ...renderer.topics.map(item => routes.href('topic/' + item.id)),
    ...renderer.activities.map(item => routes.href('activity/' + item.id))];
  const indexed = [];
  for (const path of pages) {
    const { html, metadata } = renderer.render(path);
    if (metadata.page_type === 'unavailable') throw new Error('Cannot export an unavailable page: ' + path);
    let page = template.replace('<div id="app"></div>', () => '<div id="app">' + html + '</div>')
      .replace(/<title>[\s\S]*?<\/title>/, () => '<title>' + escape(metadata.title) + '</title>')
      .replace(/(<meta name="description" content=")[^"]*/, (_match, prefix) => prefix + escape(metadata.description))
      .replace(/(<link rel="canonical" href=")[^"]*/, (_match, prefix) => prefix + metadata.canonical)
      .replace(/(<meta name="robots" content=")[^"]*/, (_match, prefix) => prefix + (metadata.noindex ? 'noindex, follow' : 'index, follow'))
      .replace(/<noscript>[\s\S]*?<\/noscript>/, '<noscript><p class="wrap">Enable JavaScript to use the interactive players and saved resources.</p></noscript>');
    for (const [property, value] of Object.entries({'og:title':metadata.title,'og:description':metadata.description,'og:url':metadata.canonical})) page = page.replace(new RegExp('(<meta property="' + property + '" content=")[^"]*'), (_match, prefix) => prefix + escape(value));
    const { structuredData, ...pageData } = metadata;
    page = page.replace('</head>', () => '<script type="application/ld+json" id="library-structured-data">' + json(structuredData) + '</script>\n<script type="application/json" id="library-page-data">' + json(pageData) + '</script>\n  </head>');
    const file = join(output, path, 'index.html');
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, page);
    if (!metadata.noindex) indexed.push({ path, title: metadata.title, url: metadata.canonical });
  }
  const information = ['/simlab/','/emrs/','/3dpain/','/privacy.html','/terms.html','/accessibility.html','/resource-credits.html','/sitemap.html'];
  const urls = [...new Set([...indexed.map(page => page.url), ...information.map(path => 'https://devpt.app' + path)])];
  writeFileSync(join(output, 'sitemap.xml'), '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + urls.map(url => '  <url><loc>' + escape(url) + '</loc></url>').join('\n') + '\n</urlset>\n');
  const sitemap = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Reference library sitemap · DevPT</title><meta name="description" content="Browse every public DevPT reference resource, body region, topic and product overview."><link rel="canonical" href="https://devpt.app/sitemap.html"><link rel="stylesheet" href="/site-fonts.css"><link rel="stylesheet" href="/teaching-library.css"><script defer src="/site-analytics.js"></script></head><body><main class="main wrap"><a href="/">← Reference library</a><h1>Sitemap</h1><ul>${indexed.map(page => `<li><a href="${page.path}">${escape(page.title)}</a></li>`).join('')}${information.filter(path => path !== '/sitemap.html').map(path => `<li><a href="${path}">${escape(path)}</a></li>`).join('')}</ul></main></body></html>`;
  writeFileSync(join(output, 'sitemap.html'), sitemap);
  const config = JSON.parse(readFileSync(join(output, 'staticwebapp.config.json'), 'utf8'));
  const aliases = catalog.activities.filter(item => item.aliasOf && renderer.activities.some(target => target.id === item.aliasOf));
  config.routes.unshift(...aliases.map(item => ({ route: routes.href('activity/' + item.id), redirect: routes.href('activity/' + item.aliasOf), statusCode: 301 })));
  writeFileSync(join(output, 'staticwebapp.config.json'), JSON.stringify(config, null, 2) + '\n');
  writeFileSync(join(output, 'release.json'), JSON.stringify({ schemaVersion: 1, site: 'devpt.app', revision: process.env.GITHUB_SHA || 'local-production-review', catalog: catalogUrl, catalogBuild: catalog.build, resources: renderer.activities.length, indexedPages: urls.length }, null, 2) + '\n');
  return { output, resources: renderer.activities.length, indexedPages: urls.length };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  function argument(name) { const index = process.argv.indexOf(name); if (index < 0) return undefined; if (!process.argv[index + 1]) throw new Error('Missing ' + name); return process.argv[index + 1]; }
  const catalogFile = argument('--catalog');
  // curl honors managed proxy/CA trust and ordinary GitHub Actions egress.
  const source = catalogFile ? readFileSync(resolve(catalogFile), 'utf8') : execFileSync('curl', ['--fail','--silent','--show-error','--max-time','30','--proto','=https',catalogUrl], { encoding: 'utf8', maxBuffer: 5 * 1024 * 1024 });
  console.log(buildPublicSite({ catalog: JSON.parse(source), output: argument('--output') ? resolve(argument('--output')) : undefined }));
}
