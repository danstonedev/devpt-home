/* The homepage owns its frame, not a copy of the simulator. Chapter/tool
 * metadata arrives from the currently deployed simLAB build itself. */
(function () {
  'use strict';
  var endpoint = new URL('https://lab.devpt.app/showcase/');
  if (['localhost', '127.0.0.1', '[::1]'].includes(location.hostname)) {
    try {
      var local = new URL(new URLSearchParams(location.search).get('simlab'));
      if (local.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(local.hostname) && local.port === '5180') endpoint = new URL('/showcase/', local.origin);
    } catch (_) { /* Local preview defaults to the live public walkthrough. */ }
  }
  var frames = Array.from(document.querySelectorAll('[data-live-showcase]'));
  var gallery = document.getElementById('native-gallery-frame');
  var rail = document.querySelector('[data-story-chapters]');
  var current = { chapter: 'meet', tool: 'joints', play: false };
  var chapters = [];
  var tools = [];
  var paths = {
    person: 'M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M14 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0M20 8v6m-3-3h6',
    hearing: 'M6 9a6 6 0 0 1 12 0c0 3-3 4-4 6-1 2-1 5-4 5a3 3 0 0 1-3-3M9 9a3 3 0 0 1 6 0c0 2-3 2-3 5',
    location_on: 'M20 10c0 6-8 11-8 11S4 16 4 10a8 8 0 1 1 16 0ZM15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
    straighten: 'M3 7h18v10H3ZM7 7v5m5-5v3m5-3v5',
    hub: 'M9 12H5m10 0h4M12 9V5m0 10v4M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0M14 3a2 2 0 1 1-4 0 2 2 0 0 1 4 0M14 21a2 2 0 1 1-4 0 2 2 0 0 1 4 0M5 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0M23 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0',
    flag: 'M5 21V3m0 1c5-4 9 4 14 0v10c-5 4-9-4-14 0',
    school: 'm2 9 10-5 10 5-10 5L2 9Zm4 3v5c4 3 8 3 12 0v-5m4-3v8',
  };
  function icon(name) {
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('fill', 'none'); svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '1.6'); svg.setAttribute('stroke-linecap', 'round'); svg.setAttribute('stroke-linejoin', 'round');
    var path = document.createElementNS(svg.namespaceURI, 'path'); path.setAttribute('d', paths[name] || 'M12 4v16M4 12h16'); svg.append(path); return svg;
  }
  function send(frame, message) { if (frame.contentWindow) frame.contentWindow.postMessage(message, endpoint.origin); }
  function selection() {
    if (!gallery) return;
    if (gallery.dataset.ready === 'true') send(gallery, Object.assign({ type: 'simlab-showcase-select', chapter: current.chapter, play: current.play }, current.chapter === 'study' ? { tool: current.tool } : {}));
    rail?.querySelectorAll('button').forEach(function (button) { button.setAttribute('aria-current', button.dataset.chapter === current.chapter ? 'step' : 'false'); });
    var full = document.querySelector('.native-full-view');
    if (full) { var url = new URL(endpoint); url.searchParams.set('chapter', current.chapter); if (current.chapter === 'study') url.searchParams.set('tool', current.tool); full.href = url.href; }
  }
  function choose(chapter, tool, play) {
    if (chapters.length && !chapters.some(function (item) { return item.id === chapter; })) return;
    if (tool && tools.length && !tools.some(function (item) { return item.id === tool; })) return;
    current = { chapter: chapter, tool: tool || current.tool, play: !!play }; selection();
  }
  function enter(chapter, tool, play) {
    choose(chapter, tool, play);
    (rail || document.querySelector('.native-gallery')).scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  }
  function validCatalog(items) {
    return Array.isArray(items) && items.length > 0 && items.length <= 20 && items.every(function (item) { return item && /^[a-z][a-z-]{0,30}$/.test(item.id) && typeof item.label === 'string' && item.label.length < 80; });
  }
  function renderChapters(manifest) {
    if (!rail || manifest?.schemaVersion !== 1 || manifest.case?.patient?.id !== 'patient-james-morgan' || !validCatalog(manifest.chapters) || !validCatalog(manifest.studyTools)) return;
    chapters = manifest.chapters; tools = manifest.studyTools;
    var fragment = document.createDocumentFragment();
    chapters.forEach(function (chapter, index) {
      var button = document.createElement('button'); button.type = 'button'; button.dataset.chapter = chapter.id;
      var label = document.createElement('span'); label.textContent = chapter.label;
      var number = document.createElement('small'); number.textContent = String(index + 1).padStart(2, '0');
      button.append(icon(chapter.icon), label, number); button.addEventListener('click', function () { enter(chapter.id, null, false); });
      button.addEventListener('keydown', function (event) {
        var next = event.key === 'ArrowRight' ? (index + 1) % chapters.length : event.key === 'ArrowLeft' ? (index + chapters.length - 1) % chapters.length : event.key === 'Home' ? 0 : event.key === 'End' ? chapters.length - 1 : null;
        if (next !== null) { event.preventDefault(); rail.querySelectorAll('button')[next].focus(); choose(chapters[next].id); }
      });
      fragment.append(button);
    });
    rail.replaceChildren(fragment); selection();
    var cards = document.querySelector('[data-live-study-tools]');
    if (cards) {
      var list = document.createDocumentFragment();
      tools.forEach(function (tool, index) {
        var link = document.createElement('a'); link.className = 'native-lab-card';
        var url = new URL(endpoint); url.searchParams.set('chapter', 'study'); url.searchParams.set('tool', tool.id); link.href = url.href;
        var label = document.createElement('span'); label.className = 'mono'; label.textContent = String(index + 1).padStart(2, '0') + ' / STUDY TOOL';
        var title = document.createElement('h3'); title.textContent = tool.label;
        var cue = document.createElement('p'); cue.textContent = typeof tool.cue === 'string' ? tool.cue : '';
        var action = document.createElement('span'); action.textContent = 'Explore ↗';
        link.append(label, title, cue, action);
        link.addEventListener('click', function (event) { if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return; event.preventDefault(); enter('study', tool.id, false); });
        list.append(link);
      });
      cards.replaceChildren(list);
    }
  }
  window.addEventListener('message', function (event) {
    if (event.origin !== endpoint.origin) return;
    var frame = frames.find(function (item) { return item.contentWindow === event.source; }); if (!frame) return;
    var data = event.data;
    if (data?.type === 'simlab-showcase-ready') {
      frame.dataset.ready = 'true'; frame.dataset.simlabBuild = typeof data.build === 'string' ? data.build : '';
      renderChapters(data.manifest);
      send(frame, { type: 'simlab-showcase-visibility', visible: frame.dataset.visible !== 'false' && document.visibilityState === 'visible' });
      if (frame === gallery) { selection(); document.querySelector('[data-walkthrough-loading]')?.remove(); }
    }
    if (data?.type === 'simlab-showcase-state' && frame === gallery && chapters.some(function (item) { return item.id === data.chapter; })) {
      current.chapter = data.chapter; if (tools.some(function (item) { return item.id === data.tool; })) current.tool = data.tool;
      // Reflect the child state without sending a selection back (which would pause it).
      rail?.querySelectorAll('button').forEach(function (button) { button.setAttribute('aria-current', button.dataset.chapter === current.chapter ? 'step' : 'false'); });
      var full = document.querySelector('.native-full-view'); var url = new URL(endpoint); url.searchParams.set('chapter', current.chapter); if (current.chapter === 'study') url.searchParams.set('tool', current.tool); if (full) full.href = url.href;
    }
  });
  frames.forEach(function (frame) { var url = new URL(endpoint); url.searchParams.set('embed', ''); if (frame.dataset.liveShowcase === 'teaser') url.searchParams.set('teaser', ''); frame.src = url.href; });
  if ('IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function (entries) { entries.forEach(function (entry) { entry.target.dataset.visible = String(entry.isIntersecting); send(entry.target, { type: 'simlab-showcase-visibility', visible: entry.isIntersecting && document.visibilityState === 'visible' }); }); }, { rootMargin: '120px 0px' });
    frames.forEach(function (frame) { observer.observe(frame); });
  }
  document.addEventListener('visibilitychange', function () { frames.forEach(function (frame) { send(frame, { type: 'simlab-showcase-visibility', visible: document.visibilityState === 'visible' && frame.dataset.visible !== 'false' }); }); });
  document.querySelectorAll('[data-start-walkthrough]').forEach(function (link) { link.addEventListener('click', function (event) { if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return; event.preventDefault(); enter('meet', null, true); }); });
  var areas = { patient: 'meet', interview: 'listen', reasoning: 'reason' };
  document.querySelectorAll('[data-open-native]').forEach(function (link) { link.addEventListener('click', function (event) { if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return; event.preventDefault(); var area = link.dataset.openNative; enter(areas[area] || 'study', areas[area] ? null : area, false); }); });
})();
