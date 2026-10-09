<script lang="ts">
  /**
   * Homepage framing around simLAB's unmodified interview renderer.
   * Identities, referrals and opening words come from the native scenario catalogue.
   * This authored signal sequence demonstrates presentation only: it is not an AI
   * conversation, patient finding, voice recording, or scored clinical interaction.
   */
  import { onMount, untrack } from 'svelte';
  import { scenarios } from '@vspx/ddx';
  import InterviewPatient from '@simlab/lib/ddx/InterviewPatient.svelte';

  interface Props {
    initialScenarioId?: string;
    scenarioId?: string;
    onScenarioChange?: (scenarioId: string) => void;
  }
  let { initialScenarioId = 'hip-groin-64', scenarioId, onScenarioChange }: Props = $props();

  const cases = ['hip-groin-64', 'hip-lateral-52']
    .map(id => scenarios.find(scenario => scenario.id === id))
    .filter((scenario): scenario is typeof scenarios[number] => !!scenario);
  if (cases.length !== 2) throw new Error('The native showcase patient cases are unavailable.');
  const validCase = (id: string | undefined) => cases.some(scenario => scenario.id === id);
  let selectedId = $state(untrack(() => validCase(scenarioId) ? scenarioId! : validCase(initialScenarioId) ? initialScenarioId : cases[0].id));
  let selected = $derived(cases.find(scenario => scenario.id === selectedId) ?? cases[0]);

  type Phase = 'listening' | 'thinking' | 'answering' | 'resting';
  const phases: Phase[] = ['listening', 'thinking', 'answering', 'resting'];
  const phaseLabels: Record<Phase, string> = {
    listening: 'Listening', thinking: 'Thinking', answering: 'Answering', resting: 'At rest',
  };
  let phase = $state<Phase>('listening');
  let turn = $state(0);
  let play = $state(true);
  let reducedMotion = $state(false);
  let onScreen = $state(true);
  let pageVisible = $state(true);
  let root = $state<HTMLElement>();
  let sceneActive = $derived(onScreen && pageVisible);
  let running = $derived(play && !reducedMotion && sceneActive);
  let latest = $derived({ key: `showcase:${selected.id}:${turn}`, text: selected.opening });
  let status = $derived(reducedMotion ? 'Reduced motion' : !sceneActive ? 'Preview paused while hidden' : !play ? 'Preview paused' : phaseLabels[phase]);

  function chooseCase(id: string) {
    if (!validCase(id) || id === selectedId) return;
    selectedId = id;
    phase = 'listening';
    turn = 0;
    onScenarioChange?.(id);
  }

  // A parent can synchronize another native case panel with this showcase picker.
  $effect(() => {
    if (validCase(scenarioId) && scenarioId !== selectedId) {
      selectedId = scenarioId!;
      phase = 'listening';
      turn = 0;
    }
  });

  $effect(() => {
    if (!running) return;
    const current = phase;
    const openingWords = selected.opening.split(/\s+/).length;
    const duration = current === 'listening' ? 4200 : current === 'thinking' ? 1800
      : current === 'answering' ? Math.max(6500, Math.min(12000, openingWords * 310)) : 2500;
    const timer = window.setTimeout(() => {
      const next = phases[(phases.indexOf(current) + 1) % phases.length];
      if (next === 'answering') turn += 1;
      phase = next;
    }, duration);
    return () => window.clearTimeout(timer);
  });

  onMount(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateMotion = () => { reducedMotion = motion.matches; };
    const updateVisibility = () => { pageVisible = document.visibilityState === 'visible'; };
    updateMotion();
    updateVisibility();
    motion.addEventListener('change', updateMotion);
    document.addEventListener('visibilitychange', updateVisibility);
    const observer = typeof IntersectionObserver === 'function' ? new IntersectionObserver(entries => {
      onScreen = entries[0]?.isIntersecting ?? true;
    }, { threshold: 0 }) : null;
    if (root) observer?.observe(root);
    onScenarioChange?.(selectedId);
    return () => {
      observer?.disconnect();
      motion.removeEventListener('change', updateMotion);
      document.removeEventListener('visibilitychange', updateVisibility);
    };
  });
</script>

<section class="patient-scene ddx" aria-label="Native simLAB patient and environments" bind:this={root}>
  <div class="patient-scene-heading">
    <div>
      <p class="patient-scene-kicker">Patient &amp; environments</p>
      <h2>{selected.patient.name}</h2>
      <p class="patient-scene-identity">{selected.patient.age} years · {selected.patient.pronouns} · {selected.patient.occupation}</p>
    </div>
    <label class="patient-scene-picker">
      <span>Showcase case</span>
      <select value={selectedId} onchange={event => chooseCase(event.currentTarget.value)}>
        {#each cases as scenario (scenario.id)}
          <option value={scenario.id}>{scenario.patient.name}</option>
        {/each}
      </select>
    </label>
  </div>

  <div class="patient-scene-view">
    {#if sceneActive}
      <!-- The native presence layer samples reduced-motion preference at creation. -->
      {#key `${selected.id}:${reducedMotion}`}
        <InterviewPatient
          variant={selected.patient.bodyVariant}
          patientId={selected.patient.id}
          name={selected.patient.name.split(' ')[0]}
          speaking={running && phase === 'answering'}
          attending={running && phase === 'listening'}
          thinking={running && phase === 'thinking'}
          {latest}
        />
      {/key}
    {:else}
      <div class="patient-scene-suspended"><p>Patient preview paused while this view is hidden.</p></div>
    {/if}
  </div>

  <div class="patient-scene-caption">
    <div class="patient-scene-transport">
      <span class="patient-scene-status" data-playing={running}><span aria-hidden="true"></span>{status}</span>
      <button type="button" onclick={() => { play = !play; }} disabled={reducedMotion}
        aria-label={reducedMotion ? 'Patient preview respects reduced motion' : play ? 'Pause authored patient animation preview' : 'Play authored patient animation preview'}>
        {reducedMotion ? 'Motion reduced' : play ? 'Pause preview' : 'Play preview'}
      </button>
    </div>
    <blockquote>“{selected.opening}”</blockquote>
    <p class="patient-scene-referral"><strong>Referral:</strong> {selected.referral.reason}</p>
    <p class="patient-scene-note">Authored animation demonstration · exact case opening · no live voice</p>
    {#if selected.patient.id !== 'patient-james-morgan'}
      <p class="patient-scene-note">This case uses simLAB’s female teaching model.</p>
    {/if}
  </div>
</section>

<style>
  .patient-scene { color: #18332f; background: #fff; border: 1px solid #d6e3de; border-radius: 18px; overflow: hidden; min-width: 0; }
  .patient-scene-heading { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 20px 24px; flex-wrap: wrap; }
  .patient-scene-kicker { margin: 0 0 4px; color: #4a7167; font-size: 11px; font-weight: 750; letter-spacing: .1em; text-transform: uppercase; }
  h2 { margin: 0; color: #173b31; font-size: clamp(22px, 3vw, 30px); line-height: 1.2; }
  .patient-scene-identity { margin: 6px 0 0; font-size: 13px; line-height: 1.5; color: #597067; }
  .patient-scene-picker { display: grid; gap: 5px; font-size: 11px; color: #597067; min-width: 145px; }
  .patient-scene-picker select { font: inherit; font-size: 13px; color: #183c31; border: 1px solid #bdcfc6; border-radius: 8px; padding: 9px 28px 9px 10px; background: #f6faf7; cursor: pointer; }
  .patient-scene-view { min-height: 420px; height: clamp(420px, 57vw, 570px); }
  .patient-scene-view :global(.interview-patient) { height: 100%; border: 0; border-radius: 0; }
  .patient-scene-view :global(.interview-patient > .interview-stage) { height: 100%; min-height: 0; flex: 1; }
  .patient-scene-suspended { height: 100%; display: grid; place-items: center; text-align: center; padding: 24px; color: #d4e5dc; background: #1d2827; }
  .patient-scene-caption { padding: 18px 24px 20px; background: #f7faf8; }
  .patient-scene-transport { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
  .patient-scene-status { display: flex; align-items: center; gap: 7px; font-size: 12px; font-weight: 650; color: #547067; }
  .patient-scene-status > span { width: 7px; height: 7px; border-radius: 50%; background: #92a59a; }
  .patient-scene-status[data-playing='true'] > span { background: #33885e; }
  button { font: inherit; font-size: 12px; color: #2a5d48; background: #fff; border: 1px solid #c5d7ca; border-radius: 7px; padding: 6px 10px; cursor: pointer; }
  button:disabled { opacity: .65; cursor: default; }
  :is(button, select):focus-visible { outline: 3px solid #d5a23a; outline-offset: 3px; }
  blockquote { margin: 13px 0 10px; padding: 0; border: 0; color: #234936; font-size: clamp(16px, 2vw, 19px); line-height: 1.55; font-style: normal; }
  .patient-scene-referral { margin: 0 0 7px; color: #597067; font-size: 12px; }
  .patient-scene-referral strong { font-weight: 650; }
  .patient-scene-note { margin: 4px 0 0; font-size: 11px; line-height: 1.45; color: #688071; }
  @media (max-width: 600px) {
    .patient-scene-heading, .patient-scene-caption { padding: 16px; }
    .patient-scene-view { min-height: 360px; height: min(64vh, 500px); }
    .patient-scene-picker { width: 100%; }
  }
</style>
