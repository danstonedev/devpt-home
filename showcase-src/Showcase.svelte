<script lang="ts">
  import { onMount } from 'svelte';
  import PatientScene from './PatientScene.svelte';
  import CaseWorkspace from './CaseWorkspace.svelte';
  import LabWorkspace from './LabWorkspace.svelte';

  const AREAS = [
    {id:'patient',label:'Patients & environments'},
    {id:'interview',label:'Patient interview'},
    {id:'reasoning',label:'Reasoning & evidence'},
    {id:'movement',label:'Sterile teaching view'},
    {id:'joints',label:'Joint mechanics'},
    {id:'eyes',label:'Eye examinations'},
    {id:'neuro',label:'Neural pathways'},
    {id:'aquatic',label:'Aquatic therapy'},
    {id:'vitals',label:'Live Vitals'},
  ] as const;
  type Area = typeof AREAS[number]['id'];
  const params = new URLSearchParams(window.location.search);
  const starting = params.get('area');
  let area = $state<Area>(AREAS.some(item=>item.id===starting)?starting as Area:'patient');
  let scenarioId = $state('hip-groin-64');
  let awake = $state(true);
  let caseView = $state<'interview'|'reasoning'>(starting==='reasoning'?'reasoning':'interview');
  let hasCase = $state(starting==='interview'||starting==='reasoning');
  const caseShown = $derived(area==='interview'||area==='reasoning');
  const embed = params.has('embed');
  const selected = $derived(AREAS.find(item=>item.id===area)!);

  function choose(value:string) {
    if(!AREAS.some(item=>item.id===value)) return;
    area=value as Area;
    if(area==='interview'||area==='reasoning'){caseView=area;hasCase=true;}
    const url = new URL(window.location.href);
    url.searchParams.set('area',area);
    window.history.replaceState(null,'',url);
    if(window.parent!==window) window.parent.postMessage({type:'simlab-showcase-area',area},window.location.origin);
  }
  onMount(()=>{
    const handle = (event:MessageEvent)=>{
      if(event.origin!==window.location.origin || event.source!==window.parent) return;
      if(event.data?.type==='simlab-showcase-select') choose(event.data.area);
      if(event.data?.type==='simlab-showcase-visibility') awake=!!event.data.visible;
    };
    const navigation = (event:MouseEvent)=>{
      if(event.ctrlKey||event.metaKey||event.altKey||event.shiftKey||event.button!==0) return;
      const link=(event.target as Element).closest<HTMLAnchorElement>('a[href]');
      if(link?.getAttribute('href')==='?live-vitals') {
        event.preventDefault();
        choose('vitals');
      } else if(link?.getAttribute('href')==='/' && window.parent!==window) {
        event.preventDefault();
        window.parent.postMessage({type:'simlab-showcase-home'},window.location.origin);
      }
    };
    window.addEventListener('message',handle);
    document.addEventListener('click',navigation);
    if(window.parent!==window) window.parent.postMessage({type:'simlab-showcase-ready',area},window.location.origin);
    return()=>{window.removeEventListener('message',handle);document.removeEventListener('click',navigation);};
  });
</script>

<div class="showcase-shell" class:embedded={embed}>
  {#if !embed}
    <header class="showcase-bar">
      <a href="/">DevPT <span>/ Inside simLAB</span></a>
      <label>Explore <select aria-label="Explore simLAB" value={area} onchange={event=>choose(event.currentTarget.value)}>{#each AREAS as item}<option value={item.id}>{item.label}</option>{/each}</select></label>
      <a href="https://lab.devpt.app" target="_blank" rel="noopener">Open simLAB ↗</a>
    </header>
  {/if}
  <main class="native-stage" aria-label={selected.label}>
    {#if hasCase}
      <div class="case-holder" hidden={!caseShown}>
        <CaseWorkspace {scenarioId} view={caseView} active={awake && caseShown} onViewChange={choose} />
      </div>
    {/if}
    {#if awake && !caseShown}
      {#if area==='patient'}
        <PatientScene {scenarioId} onScenarioChange={id=>scenarioId=id} />
      {:else}
        <LabWorkspace mode={area} />
      {/if}
    {:else if !awake}
      <div class="stage-rest">The demonstration loads when it comes into view.</div>
    {/if}
  </main>
</div>

<style>
  :global(html),:global(body),:global(#app){height:100%;margin:0;}
  .showcase-shell{height:100dvh;display:flex;flex-direction:column;min-width:0;}
  .showcase-bar{min-height:60px;display:flex;align-items:center;justify-content:space-between;gap:16px;padding:10px 18px;background:#14271b;color:#edf4ee;font-size:13px;flex:none;}
  .showcase-bar a{color:inherit;text-decoration:none;font-weight:600;}
  .showcase-bar a span{font-weight:400;color:#bbccbf;}
  .showcase-bar label{display:flex;align-items:center;gap:10px;}
  .showcase-bar select{background:#fff;color:#1c3022;border:0;border-radius:5px;padding:8px;max-width:230px;font:inherit;}
  .native-stage{flex:1;min-height:0;min-width:0;overflow:auto;position:relative;}
  .case-holder{height:100%;min-height:0;}
  .native-stage :global(.lab),.native-stage :global(.tool-workspace){height:100%;}
  .stage-rest{height:100%;display:grid;place-items:center;background:#16281e;color:#c4d9ca;font-size:14px;padding:32px;text-align:center;}
  @media(max-width:600px){.showcase-bar{flex-wrap:wrap;}.showcase-bar a span{display:none;}.showcase-bar label{order:3;width:100%;}.showcase-bar select{max-width:none;flex:1;}}
</style>
