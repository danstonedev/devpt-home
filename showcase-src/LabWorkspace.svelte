<script lang="ts">
  import { LAB_WORKSPACES, type LabMode } from './labcuration';

  /**
   * Isolated public entry to the real simLAB teaching surfaces. No AuthGate,
   * learner/session store, API capability, synthetic sign-in, or component copy.
   * The parent owns the showcase navigation; mode changes destroy the old native
   * component before the next one mounts, so its onMount cleanup releases the
   * renderer and runtime. Imports remain lazy, one active workspace at a time.
   */
  let { mode = 'movement' }: { mode?: LabMode } = $props();
  const workspace = $derived(LAB_WORKSPACES[mode] ?? LAB_WORKSPACES.movement);
  const standaloneLab = $derived(mode === 'eyes' || mode === 'joints');
  const initialSearch = new URLSearchParams(window.location.search);
  const initialEye = initialSearch.get('eyes') ?? LAB_WORKSPACES.eyes.initial;
  const initialJoint = initialSearch.get('joints') ?? LAB_WORKSPACES.joints.initial;

  function reload() { window.location.reload(); }
  function loadBody() {
    // JointLab writes its selection to the showcase URL. A fresh Body mount
    // must open Body even after another native workspace changed that URL.
    const url = new URL(window.location.href);
    if (url.searchParams.has('joints') || url.searchParams.has('eyes')) {
      url.searchParams.delete('joints'); url.searchParams.delete('eyes');
      window.history.replaceState(window.history.state, '', url);
    }
    return import('@simlab/lib/lab/MovementLab.svelte');
  }
</script>

{#snippet loading()}
  <div class="native-loading" role="status">
    <span class="native-loading-mark" aria-hidden="true"></span>
    <p>Preparing the native {workspace.title.toLowerCase()}…</p>
    <span>The models and controls load when you open this workspace.</span>
  </div>
{/snippet}

{#snippet unavailable()}
  <div class="native-unavailable" role="alert">
    <h2>This workspace could not load.</h2>
    <p>Reload to try the native simulation again.</p>
    <button type="button" onclick={reload}>Reload workspace</button>
    <a href="https://lab.devpt.app/" target="_blank" rel="noopener noreferrer">Open simLAB</a>
  </div>
{/snippet}

<section class="native-lab-host" class:standalone-lab={standaloneLab} aria-label={workspace.title + ' native simLAB workspace'} data-native-workspace={mode}>
  {#if standaloneLab}
    <header class="native-lab-heading">
      <div><span>Interactive preview · native simLAB</span><h1>{workspace.title}</h1></div>
      <p>Native controls, anatomy and teaching notes</p>
    </header>
  {/if}
  {#key mode}
    {#if mode === 'eyes'}
      {#await import('@simlab/lib/lab/EyeLab.svelte')}
        {@render loading()}
      {:then module}
        <module.default initial={initialEye} />
      {:catch}
        {@render unavailable()}
      {/await}
    {:else if mode === 'joints'}
      {#await import('@simlab/lib/lab/JointLab.svelte')}
        {@render loading()}
      {:then module}
        <module.default initial={initialJoint} />
      {:catch}
        {@render unavailable()}
      {/await}
    {:else if mode === 'neuro'}
      {#await import('@simlab/lib/neuro/NeuroLab.svelte')}
        {@render loading()}
      {:then module}
        <module.default />
      {:catch}
        {@render unavailable()}
      {/await}
    {:else if mode === 'aquatic'}
      {#await import('@simlab/lib/aquatic/AquaticLab.svelte')}
        {@render loading()}
      {:then module}
        <module.default />
      {:catch}
        {@render unavailable()}
      {/await}
    {:else if mode === 'vitals'}
      {#await import('@simlab/lib/liveVitals/LiveVitalsLab.svelte')}
        {@render loading()}
      {:then module}
        <module.default />
      {:catch}
        {@render unavailable()}
      {/await}
    {:else}
      {#await loadBody()}
        {@render loading()}
      {:then module}
        <!-- No options: keep simLAB's sterile body teaching stage as its baseline. -->
        <module.default />
      {:catch}
        {@render unavailable()}
      {/await}
    {/if}
  {/key}
</section>

<style>
  .native-lab-host { box-sizing: border-box; width: 100%; height: 100%; min-width: 0; min-height: 0; color: var(--ink, #19281e); background: var(--color-bg, #f5f7f2); }
  .standalone-lab { display: flex; flex-direction: column; padding: 0 12px 12px; overflow: auto; }
  .native-lab-heading { flex: none; display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 12px 2px 3px; font-family: var(--font-ui, 'Hanken Grotesk', sans-serif); }
  .native-lab-heading span { display: block; color: var(--und-green-dark, #08763b); font: 500 9px/1.5 var(--font-mono, 'JetBrains Mono', monospace); text-transform: uppercase; letter-spacing: .045em; }
  .native-lab-heading h1 { margin: 2px 0 0; font-size: 18px; line-height: 1.2; font-weight: 650; }
  .native-lab-heading p { margin: 0; color: var(--muted, #627165); font-size: 11px; font-family: var(--font-ui, 'Hanken Grotesk', sans-serif); }
  .native-loading, .native-unavailable { min-height: 360px; padding: 50px 24px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; font-family: var(--font-ui, 'Hanken Grotesk', sans-serif); }
  .native-loading-mark { width: 24px; height: 24px; border: 3px solid #d4e3d4; border-top-color: #147544; border-radius: 50%; }
  .native-loading p { margin: 15px 0 5px; font-size: 16px; font-weight: 600; }
  .native-loading > span:last-child { font-size: 12px; color: var(--muted, #627165); }
  .native-unavailable h2 { margin: 0; font-size: 20px; }
  .native-unavailable p { margin: 10px 0 18px; font-size: 14px; color: var(--muted, #627165); }
  .native-unavailable button { min-height: 42px; padding: 9px 16px; border: 1px solid #08763b; border-radius: 6px; background: #08763b; color: #fff; font: inherit; cursor: pointer; }
  .native-unavailable a { margin-top: 12px; color: #08763b; font-size: 13px; }
  .native-unavailable button:focus-visible, .native-unavailable a:focus-visible { outline: 3px solid #ff9c31; outline-offset: 3px; }
  @media (max-width: 640px) { .standalone-lab { padding-inline: 8px; } .native-lab-heading { align-items: flex-start; gap: 10px; } .native-lab-heading p { max-width: 130px; text-align: right; } }
  @media (prefers-reduced-motion: no-preference) { .native-loading-mark { animation: native-loading-spin .85s linear infinite; } }
  @keyframes native-loading-spin { to { transform: rotate(360deg); } }
</style>
