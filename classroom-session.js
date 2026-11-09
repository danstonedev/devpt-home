/* One persistent projected classroom. No model copies, new renderers, or private
 * learner records. Only the documented simLAB bridge messages cross the frame. */
(function () {
  'use strict';
  const e = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt = seconds => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  const icon = name => `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8"><path d="${({play:'m9 5 10 7-10 7Z',pause:'M8 5v14M16 5v14',next:'m9 5 7 7-7 7',back:'m15 5-7 7 7 7',expand:'M8 3H3v5m13-5h5v5M3 16v5h5m8 0h5v-5',close:'m6 6 12 12M6 18 18 6',reset:'M20 7v5h-5M4 17a8 8 0 1 0 2-11L3 9m0-5v5h5'})[name] || ''}"/></svg>`;

  function mount({ root, nativeBase }) {
    const lesson = window.DevPTClassroomLesson;
    const storageKey = `devpt.classroom.${lesson.id}.v${lesson.version}`;
    let state = { chapter: 0, phase: 0, answers: {}, revealed: {}, timers: {}, resources: {}, finding: {}, mode: 'model' };
    try {
      const saved = JSON.parse(sessionStorage.getItem(storageKey));
      if (saved && Number.isInteger(saved.chapter) && saved.chapter >= 0 && saved.chapter < lesson.chapters.length
          && Number.isInteger(saved.phase) && saved.phase >= 0 && saved.phase < 4) {
        state = { ...state, chapter: saved.chapter, phase: saved.phase,
          ...Object.fromEntries(['answers','revealed','timers','resources','finding'].filter(k => saved[k] && typeof saved[k] === 'object' && !Array.isArray(saved[k])).map(k => [k, saved[k]])) };
      }
    } catch { /* Storage is optional in a projected classroom. */ }
    const loopback = location.protocol === 'http:' && ['127.0.0.1','localhost','[::1]'].includes(location.hostname);
    // Only the disposable loopback review harness serves a source-owned build locally.
    const source = new URL(loopback && window.DEVPT_CLASSROOM_PREVIEW === true ? '/native' : nativeBase, location.href);
    if (!['http:','https:'].includes(source.protocol)) throw new Error('Invalid teaching source');
    const allowedIds = new Set(lesson.chapters.flatMap(c => [...(c.resources || []), ...(c.game ? [c.game] : []), ...(c.resource ? [[c.resource,c.resourceLabel]] : [])]).map(([id]) => id));
    let frame, currentId, ready = false, pendingId, loadTimer, switchTimer, destroyed = false;
    const abort = new AbortController();
    const on = (target, event, handler) => target.addEventListener(event, handler, { signal: abort.signal });
    const chapter = () => lesson.chapters[state.chapter];
    const save = () => { try { sessionStorage.setItem(storageKey, JSON.stringify(state)); } catch {} };
    const timerKey = () => chapter().id;
    const duration = () => chapter().id.startsWith('break') ? 600 : 1500;
    const timer = () => {
      const key = timerKey(), total = duration();
      if (!state.timers[key] || !Number.isFinite(state.timers[key].remaining) || state.timers[key].remaining < 0 || state.timers[key].remaining > total || (state.timers[key].end !== null && !Number.isFinite(state.timers[key].end))) state.timers[key] = { remaining: total, end: null };
      return state.timers[key];
    };
    const secondsLeft = () => { const t = timer(); return t.end === null ? t.remaining : Math.max(0, Math.ceil((t.end - Date.now()) / 1000)); };
    const pause = () => { const t = timer(); t.remaining = secondsLeft(); t.end = null; save(); };
    const send = message => frame?.contentWindow?.postMessage(message, source.origin);
    const visibility = () => send({ type: 'devpt-teaching-visibility', visible: !document.hidden && !chapter().id.startsWith('break') });
    const status = (copy, retry = false) => {
      const box = root.querySelector('[data-source-status]');
      box.innerHTML = `<span>${e(copy)}</span>${retry ? '<button type="button" data-retry>Retry resource</button>' : ''}`;
      box.classList.toggle('cs-source-error', retry);
    };
    function url(id) {
      const url = new URL(source.pathname.replace(/\/$/,'') + '/teaching/', source.origin);
      url.searchParams.set('activity', id); url.searchParams.set('embedded','1'); return url.href;
    }
    function load(id, force = false) {
      if (!allowedIds.has(id) || destroyed) return;
      if (currentId === id && frame && !force) return;
      clearTimeout(loadTimer); clearTimeout(switchTimer); pendingId = id;
      const title = lesson.chapters.flatMap(c => [...(c.resources || []), ...(c.game ? [c.game] : []), ...(c.resource ? [[c.resource,c.resourceLabel]] : [])]).find(([key]) => key === id)?.[1] || 'Teaching resource';
      if (ready && frame && !force) {
        status('Switching resource…');
        send({ type: 'devpt-teaching-select', activity: id });
        switchTimer = setTimeout(() => load(id, true), 4500);
        return;
      }
      ready = false; currentId = id;
      if (!frame) {
        frame = document.createElement('iframe');
        frame.className = 'cs-native-frame'; frame.allow = 'fullscreen'; frame.referrerPolicy = 'origin';
        root.querySelector('[data-native-slot]').append(frame);
      }
      frame.title = `${title} · interactive simLAB resource`;
      frame.src = url(id);
      status('Preparing the 3D resource…');
      root.dataset.resource = id; root.dataset.ready = 'false';
      loadTimer = setTimeout(() => status('Resource has not connected. Your class and timer are saved here.', true), 30000);
    }
    function resources() {
      const c = chapter(), list = c.resources || [[c.resource,c.resourceLabel]];
      const selected = state.resources[c.id];
      return list.map(([id,label]) => `<button type="button" data-resource="${e(id)}" aria-pressed="${id === selected && state.mode !== 'game'}">${e(label)}</button>`).join('');
    }
    function findings() {
      const c = chapter(), f = c.finding;
      if (!f || state.phase !== 3) return '';
      if (!state.finding[c.id]) return '<button type="button" class="cs-reveal-finding" data-finding>Reveal Alex’s finding</button>';
      return `<div class="cs-finding"><span class="cs-kicker">${e(f.label)}</span>${[['Right',f.right],['Left',f.left]].map(([label,value]) => `<div class="cs-measure"><span>${label}</span><div class="cs-measure-track"><i style="width:${value / f.max * 100}%"></i></div><strong>${value}<small>${e(f.unit)}</small></strong></div>`).join('')}<small>${e(f.note)}</small></div>`;
    }
    function check() {
      const c = chapter(), q = c.check, answer = state.answers[c.id], revealed = state.revealed[c.id];
      if (state.mode !== 'check' || !q) return '';
      return `<section class="cs-check" aria-label="Class knowledge check"><span class="cs-kicker">Discuss · commit · explain</span><h2>${e(q.prompt)}</h2><div class="cs-options">${q.options.map((copy,i) => `<button type="button" data-answer="${i}" ${revealed ? 'disabled' : ''} aria-pressed="${answer === i}" class="${revealed && q.correct === i ? 'cs-correct' : ''}"><b>${String.fromCharCode(65+i)}</b>${e(copy)}</button>`).join('')}</div>${revealed ? `<p class="cs-feedback" role="status">${e(q.feedback)}</p>` : `<button type="button" class="cs-primary" data-reveal ${answer === undefined ? 'disabled' : ''}>Reveal & discuss</button>`}<button type="button" class="cs-text-button" data-model>Back to the model</button></section>`;
    }
    function render() {
      const c = chapter(), cycle = !!c.number, isBreak = c.id.startsWith('break');
      if (!state.resources[c.id] || !allowedIds.has(state.resources[c.id])) state.resources[c.id] = c.resources?.[0][0] || c.resource;
      root.dataset.chapter = c.id; root.dataset.phase = String(state.phase); root.dataset.mode = state.mode;
      root.querySelector('[data-chapters]').innerHTML = lesson.chapters.map((item,i) => `<button type="button" data-chapter="${i}" ${i === state.chapter ? 'aria-current="step"' : ''} class="${item.id.startsWith('break') ? 'cs-break-step' : ''}">${item.number ? `<span>${item.number}</span>` : ''}${e(item.short)}<small>${item.start}–${item.end} min</small></button>`).join('');
      root.querySelector('[data-chapter-label]').textContent = cycle ? `${c.number} / ${c.title}` : `${c.start}–${c.end} minutes`;
      root.querySelector('[data-question]').textContent = cycle ? c.questions[state.phase] : c.question;
      root.querySelector('[data-cue]').textContent = state.mode === 'game' ? c.gameCue : cycle ? c.cues[state.phase] : c.cue;
      root.querySelector('[data-resources]').innerHTML = resources();
      root.querySelector('[data-phases]').innerHTML = cycle ? lesson.phases.map((title,i) => `<button type="button" data-phase="${i}" aria-pressed="${i === state.phase}"><span>${i+1}</span>${e(title)}<small>${[5,7,25,8][i]} min</small></button>`).join('') : '';
      root.querySelector('[data-mode-actions]').innerHTML = cycle ? `<button type="button" data-model aria-pressed="${state.mode === 'model'}">3D model</button><button type="button" data-game aria-pressed="${state.mode === 'game'}">${e(c.game[1])} · class game</button>${state.phase === 3 ? `<button type="button" data-check aria-pressed="${state.mode === 'check'}">Class check</button>` : ''}` : '';
      root.querySelector('[data-stage-side]').innerHTML = state.mode === 'check' ? `<aside class="cs-interpret">${findings()}${check()}</aside>` : state.phase === 3 && c.finding ? `<aside class="cs-interpret">${findings()}</aside>` : state.phase === 2 && cycle ? `<aside class="cs-practice-cues"><span class="cs-kicker">Hands-on · pairs</span>${c.practice.map((copy,i) => `<p><span>0${i+1}</span>${e(copy)}</p>`).join('')}</aside>` : !cycle && !isBreak ? `<aside class="cs-context-cues">${c.chips.map(copy => `<span>${e(copy)}</span>`).join('')}</aside>` : '';
      root.querySelector('[data-timer]').hidden = !(isBreak || (cycle && state.phase === 2));
      root.querySelector('[data-game-exit]').hidden = state.mode !== 'game';
      root.querySelector('[data-break-cover]').hidden = !isBreak;
      root.querySelector('[data-return-label]').textContent = `Next: ${c.id === 'break1' ? 'move & measure' : 'load & interpret'}`;
      const last = state.chapter === lesson.chapters.length - 1;
      root.querySelector('[data-next]').disabled = last;
      root.querySelector('[data-next-label]').textContent = cycle && state.phase < 3 ? `Next: ${lesson.phases[state.phase+1].toLowerCase()}` : last ? 'Session complete' : `Next: ${lesson.chapters[state.chapter+1].short.toLowerCase()}`;
      root.querySelector('[data-prev]').disabled = state.chapter === 0;
      root.querySelector('[data-source-bar]').hidden = isBreak;
      root.querySelector('[data-expand]').disabled = isBreak;
      const id = state.mode === 'game' ? c.game[0] : state.resources[c.id];
      load(id); visibility(); tick(); save();
    }
    function tick() {
      if (destroyed) return;
      const c = chapter(), t = timer(), remaining = secondsLeft(), total = duration();
      if (t.end !== null && remaining === 0) { t.remaining = 0; t.end = null; save(); }
      root.querySelector('[data-time]').textContent = fmt(remaining);
      root.querySelector('[data-toggle-time]').innerHTML = `${icon(t.end === null ? 'play' : 'pause')}<span>${t.end !== null ? 'Pause' : remaining === 0 ? 'Time reached' : remaining === total ? 'Start' : 'Resume'}</span>`;
      root.querySelector('[data-toggle-time]').disabled = remaining === 0;
      const elapsed = total - remaining;
      const stage = elapsed < 120 ? 'Set up & agree roles' : elapsed < 720 ? 'Partner A examines B' : elapsed < 1320 ? 'Switch: B examines A' : 'Record & refine together';
      root.querySelector('[data-round]').textContent = c.id.startsWith('break') ? 'Return when the class is ready' : remaining === 0 ? 'Bring the class back when ready' : stage;
      root.querySelector('[data-timer-progress]').style.width = `${Math.min(100,elapsed/total*100)}%`;
      root.querySelector('[data-break-time]').textContent = fmt(remaining);
    }
    function navigate(index, phase = 0) {
      pause(); state.chapter = index; state.phase = phase; state.mode = 'model';
      const c = chapter(), initial = state.resources[c.id] || c.resources?.[0][0] || c.resource;
      // A new chapter starts from its prepared resource state. Within a cycle,
      // the documented bridge keeps camera exploration and loaded models in place.
      if (currentId !== initial) ready = false;
      render(); root.querySelector('[data-question]').focus({ preventScroll: true });
    }
    function setPhase(phase) { pause(); state.phase = phase; state.mode = 'model'; render(); }
    function fullscreen(onScreen) {
      root.classList.toggle('cs-expanded', onScreen);
      root.querySelector('[data-expand]').setAttribute('aria-pressed', String(onScreen));
      send({ type: 'devpt-teaching-fullscreen', on: onScreen });
    }
    root.className = 'devpt-classroom';
    root.innerHTML = `<main id="main" class="cs-shell" tabindex="-1"><header class="cs-header"><a href="#/home" aria-label="Leave classroom for DevPT home"><img src="/assets/devpt-logo.png" width="102" height="32" alt="DevPT"></a><div class="cs-session-title"><span class="cs-kicker">Classroom · faculty demo</span><strong>${e(lesson.title)}</strong></div><span class="cs-duration">180 min <i>·</i> 75 min hands-on</span><button type="button" class="cs-icon-button" data-expand aria-label="Expand classroom" aria-pressed="false">${icon('expand')}</button></header><nav class="cs-chapters" aria-label="Session chapters" data-chapters></nav><section class="cs-question-band"><div><span class="cs-kicker" data-chapter-label></span><h1 data-question tabindex="-1"></h1><p data-cue></p></div><button type="button" class="cs-patient" data-patient aria-expanded="false" aria-controls="cs-patient-detail"><span class="cs-patient-mark">A</span><span><strong>Alex <small>24 · day 7</small></strong><small>Walking → stairs → basketball</small></span><span aria-hidden="true">+</span></button></section><section id="cs-patient-detail" class="cs-patient-detail" hidden><strong>Fictional teaching case</strong><p>${e(lesson.patient.context)}</p><button type="button" data-patient>Close case summary</button></section><section class="cs-stage" aria-label="Visual teaching stage"><div class="cs-stage-toolbar"><div class="cs-resource-tabs" aria-label="Prepared 3D resources" data-resources></div><div class="cs-view-tabs" aria-label="Class activity" data-mode-actions></div></div><div class="cs-stage-content"><div class="cs-native-slot" data-native-slot></div><div class="cs-stage-side" data-stage-side></div><div class="cs-finding-slot" data-finding></div><button type="button" class="cs-end-game" data-game-exit hidden data-model>${icon('back')} End round · return to model</button><div class="cs-break-cover" data-break-cover hidden><span class="cs-kicker">Take a break</span><strong data-break-time>10:00</strong><p data-return-label></p></div></div><div class="cs-source-bar" data-source-bar><span data-source-status role="status"></span><button type="button" class="cs-text-button" data-retry aria-label="Reload current 3D resource">Reload resource</button></div></section><section class="cs-practice-timer" data-timer hidden aria-label="Practice timer"><div><span class="cs-kicker">${icon('pause')} Class pace</span><strong data-time role="timer">25:00</strong><span data-round></span></div><div><button type="button" class="cs-primary" data-toggle-time></button><button type="button" class="cs-text-button" data-reset-time>Reset timer</button></div><div class="cs-timer-track"><i data-timer-progress></i></div></section><footer class="cs-controls"><button type="button" class="cs-icon-button" data-prev aria-label="Previous chapter">${icon('back')}</button><nav class="cs-phases" aria-label="Teaching cycle phases" data-phases></nav><button type="button" class="cs-primary cs-next" data-next><span data-next-label></span>${icon('next')}</button></footer><div class="cs-footnote">${e(lesson.subtitle)}<span>simLAB source models · faculty review pending</span></div><span class="cs-sr" role="status" aria-live="polite" data-announcer></span></main>`;
    // Keep the faculty's exit control outside the native game's answer area.
    const sourceBar = root.querySelector('[data-source-bar]');
    sourceBar.insertBefore(root.querySelector('[data-game-exit]'), sourceBar.lastElementChild);
    const returnButton = document.createElement('button');
    returnButton.type = 'button'; returnButton.className = 'cs-return-to-class';
    returnButton.dataset.collapse = ''; returnButton.textContent = 'Return to classroom';
    sourceBar.insertBefore(returnButton, sourceBar.lastElementChild);
    on(root, 'click', event => {
      const b = event.target.closest('button'); if (!b || b.disabled) return;
      if (b.hasAttribute('data-chapter')) navigate(Number(b.dataset.chapter));
      else if (b.hasAttribute('data-phase')) setPhase(Number(b.dataset.phase));
      else if (b.hasAttribute('data-next')) { if (chapter().number && state.phase < 3) setPhase(state.phase + 1); else if (state.chapter < lesson.chapters.length - 1) navigate(state.chapter + 1); }
      else if (b.hasAttribute('data-prev')) { if (state.chapter > 0) navigate(state.chapter - 1); }
      else if (b.hasAttribute('data-resource')) { state.resources[chapter().id] = b.dataset.resource; state.mode = 'model'; render(); }
      else if (b.hasAttribute('data-model')) { state.mode = 'model'; render(); }
      else if (b.hasAttribute('data-game')) { state.mode = 'game'; render(); }
      else if (b.hasAttribute('data-check')) { state.mode = 'check'; render(); }
      else if (b.hasAttribute('data-answer')) { state.answers[chapter().id] = Number(b.dataset.answer); render(); root.querySelector(`[data-answer="${b.dataset.answer}"]`)?.focus(); }
      else if (b.hasAttribute('data-reveal')) { state.revealed[chapter().id] = true; render(); root.querySelector('[data-model]')?.focus(); }
      else if (b.hasAttribute('data-finding')) { state.finding[chapter().id] = true; render(); }
      else if (b.hasAttribute('data-toggle-time')) { const t = timer(); if (t.end !== null) pause(); else if (t.remaining > 0) { t.end = Date.now() + t.remaining * 1000; save(); } tick(); }
      else if (b.hasAttribute('data-reset-time')) { state.timers[timerKey()] = { remaining: duration(), end: null }; tick(); save(); }
      else if (b.hasAttribute('data-retry')) load(pendingId || currentId, true);
      else if (b.hasAttribute('data-patient')) { const panel = root.querySelector('#cs-patient-detail'); panel.hidden = !panel.hidden; root.querySelector('.cs-patient').setAttribute('aria-expanded', String(!panel.hidden)); if (panel.hidden) root.querySelector('.cs-patient').focus(); }
      else if (b.hasAttribute('data-expand')) fullscreen(!root.classList.contains('cs-expanded'));
      else if (b.hasAttribute('data-collapse')) fullscreen(false);
    });
    on(window, 'message', event => {
      if (event.origin !== source.origin || event.source !== frame?.contentWindow) return;
      const m = event.data;
      if (!m || typeof m !== 'object' || Array.isArray(m)) return;
      if (m.type === 'devpt-teaching-ready' && allowedIds.has(m.activity)) {
        if (m.activity !== pendingId) return;
        clearTimeout(loadTimer); clearTimeout(switchTimer); currentId = m.activity; ready = true;
        frame.title = `${m.activity.replaceAll('-',' ')} · interactive simLAB resource`;
        root.dataset.resource = m.activity; root.dataset.ready = 'true'; status('simLAB · connected'); visibility();
      } else if (m.type === 'devpt-teaching-selected' && typeof m.activity === 'string' && /^[a-z0-9][a-z0-9-]{0,159}$/.test(m.activity)) {
        // Let the resource's own controls explore. The lesson route and phase remain the host's.
        if (pendingId && pendingId !== currentId) return;
        currentId = pendingId = m.activity; root.dataset.resource = m.activity;
      } else if (m.type === 'devpt-teaching-fullscreen' && typeof m.on === 'boolean') fullscreen(m.on);
    });
    on(document, 'visibilitychange', visibility);
    on(window, 'keydown', event => { if (event.key === 'Escape' && root.classList.contains('cs-expanded')) fullscreen(false); });
    const ticker = setInterval(tick, 250);
    const cleanup = () => {
      if (destroyed) return;
      save(); send({ type: 'devpt-teaching-visibility', visible: false }); destroyed = true;
      clearInterval(ticker); clearTimeout(loadTimer); clearTimeout(switchTimer); abort.abort();
    };
    on(document, 'devpt:before-render', cleanup);
    on(window, 'pagehide', save);
    render();
    return { destroy: cleanup };
  }
  window.DevPTClassroom = { mount };
})();
