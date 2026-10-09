<script lang="ts">
  import { tick, untrack } from 'svelte';
  import {
    addHypothesis,
    captureEvidence,
    createSession,
    getFindingFlagColors,
    patientReply,
    scenarios,
    subjectiveFields,
    toggleFindingPin,
    validPlannedQuestionContext,
    type EvidenceSelection,
    type Message,
    type Scenario,
    type Session,
  } from '@vspx/ddx';
  import PatientInterview from '@simlab/lib/ddx/PatientInterview.svelte';
  import ReasoningMap from '@simlab/lib/ddx/ReasoningMap.svelte';
  import type { PlannedQuestionContext } from '@simlab/lib/ddx/interviewContext';

  type CaseView = 'interview' | 'reasoning';
  interface Props {
    view?: CaseView;
    active?: boolean;
    scenarioId?: string;
    onViewChange?: (view: CaseView) => void;
  }
  let {
    view = $bindable<CaseView>('interview'),
    active = true,
    scenarioId = 'hip-groin-64',
    onViewChange = (_view: CaseView) => {},
  }: Props = $props();

  // Only the host and demonstration state are local. The actual interview,
  // evidence capture, map controls, models, and clinical case content are native.
  function findScenario(id: string): Scenario {
    return scenarios.find(item => item.id === id)
      ?? scenarios.find(item => item.id === 'hip-groin-64')
      ?? scenarios[0]!;
  }

  function sampleSession(selectedScenario: Scenario): Session {
    let next = createSession(selectedScenario);
    // These are already disclosed by the real referral, not hidden interview or
    // examination answers. The sample simply starts with two referral pins.
    const referralFindings = selectedScenario.findings
      .filter(finding => next.revealedFindingIds.includes(finding.id))
      .slice(0, 2);
    for (const finding of referralFindings) {
      next = toggleFindingPin(next, selectedScenario, finding.id);
    }
    // Native addHypothesis puts each at the middle of the band. No seeded
    // ranking, evidence effect, or correct diagnosis is supplied by this host.
    for (const diagnosisId of selectedScenario.suggestedDiagnosisIds.slice(0, 3)) {
      next = { ...next, hypotheses: addHypothesis(next, diagnosisId) };
    }
    const plannedFields = ['pain-location', 'aggravating-factors', 'patientGoals'];
    next = {
      ...next,
      stage: 'interview',
      subjectiveQuestions: subjectiveFields
        .filter(field => plannedFields.includes(field.id))
        .map(field => ({ id: `field:${field.id}`, fieldId: field.id, text: field.question })),
    };
    return next;
  }

  let scenario = $state.raw<Scenario>(findScenario(untrack(() => scenarioId)));
  let session = $state.raw<Session>(sampleSession(untrack(() => scenario)));
  let focusFindingId = $state<string | null>(null);
  let notice = $state('');
  let root = $state<HTMLElement>();
  const flagColors = $derived(getFindingFlagColors(session));

  // A view change never replaces the session. Only selecting a different native
  // case or explicitly resetting this public sample creates a fresh session.
  $effect(() => {
    const selected = findScenario(scenarioId);
    if (selected.id === scenario.id) return;
    scenario = selected;
    session = sampleSession(selected);
    focusFindingId = null;
    notice = '';
  });

  function update(patch: Partial<Session>) {
    session = { ...session, ...patch, updatedAt: new Date().toISOString() };
  }

  function newMessage(role: Message['role'], text: string): Message {
    return {
      id: globalThis.crypto?.randomUUID?.() ?? `showcase-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      role,
      text,
      time: new Date().toISOString(),
    };
  }

  async function sendPatient(text: string, context?: PlannedQuestionContext): Promise<string> {
    const question = text.trim();
    if (!question || view !== 'interview') return '';
    const startedSession = session.id;
    const startedScenario = scenario;
    const planned = validPlannedQuestionContext(session, context);
    const reply = patientReply(question, startedScenario, session.revealedFindingIds);
    const student: Message = { ...newMessage('student', question), ...planned };
    update({ messages: { ...session.messages, patient: [...(session.messages.patient ?? []), student] } });
    await tick();
    if (session.id !== startedSession || scenario.id !== startedScenario.id) return '';
    const response: Message = { ...newMessage('patient', reply.text), findingIds: reply.findingIds, ...planned };
    update({
      messages: { ...session.messages, patient: [...(session.messages.patient ?? []), response] },
      revealedFindingIds: [...new Set([...session.revealedFindingIds, ...reply.findingIds])],
      ...(planned?.questionId.startsWith('field:') && planned.fieldId
        ? { subjectiveFieldIds: [...new Set([...session.subjectiveFieldIds, planned.fieldId])] }
        : {}),
    });
    return reply.text;
  }

  function keepFinding(id: string) {
    session = toggleFindingPin(session, scenario, id);
    focusFindingId = id;
  }

  function collectEvidence(selection: EvidenceSelection) {
    const next = captureEvidence(session, scenario, selection);
    if (next === session) return;
    session = next;
    focusFindingId = next.customFindings?.find(finding => finding.source?.sourceId === selection.sourceId
      && finding.source.start === selection.start && finding.source.end === selection.end)?.id ?? null;
    notice = selection.flagColor ? 'Flagged excerpt saved in Findings.' : 'Excerpt pinned to the reasoning workspace.';
  }

  function requestView(next: CaseView) {
    view = next;
    onViewChange(next);
  }

  function openFinding(id: string) {
    focusFindingId = id;
    requestView('reasoning');
  }

  async function openEvidenceSource(id: string) {
    const finding = session.customFindings?.find(item => item.id === id);
    if (finding?.source?.kind !== 'interview') return;
    requestView('interview');
    await tick();
    const source = root?.querySelector<HTMLElement>(`[data-evidence-source="${CSS.escape(finding.source.sourceId)}"]`);
    source?.scrollIntoView({ block: 'nearest', behavior: 'instant' });
    // Native EvidenceText exposes the saved excerpt as a keyboard-focusable
    // button. The enclosing source is a group and cannot receive focus.
    const mark = source?.querySelector<HTMLElement>(`[data-evidence-finding="${CSS.escape(id)}"], [data-evidence-findings~="${CSS.escape(id)}"]`);
    mark?.focus({ preventScroll: true });
  }

  function resetSample() {
    session = sampleSession(scenario);
    focusFindingId = null;
    notice = 'This demonstration was reset. The sample referral pins and hypotheses have been restored.';
  }
</script>

<section class="native-case-workspace ddx" bind:this={root} aria-label="Native simLAB case demonstration">
  <header class="showcase-case-heading">
    <div>
      <strong>{scenario.patient.name} · {scenario.patient.age}</strong>
      <span>{scenario.title} · Native simLAB sample</span>
    </div>
    <button type="button" class="button subtle small" onclick={resetSample}>Reset demonstration</button>
  </header>
  <p class="showcase-case-note">The sample starts with referral findings, three working hypotheses, and an interview plan. These are example selections, not an assessed answer. Changes stay in this demonstration.</p>
  <div class="showcase-case-content ddx-body">
  {#if active}
  {#if view === 'interview'}
    {#key session.id}
      <PatientInterview
        {scenario}
        {session}
        readOnly={false}
        send={sendPatient}
        aiConfigured={false}
        highlights={session.customFindings ?? []}
        {flagColors}
        captureEnabled={true}
        onCapture={collectEvidence}
        onKeepFinding={keepFinding}
        onOpenFinding={openFinding}
      />
    {/key}
  {:else}
    {#key session.id}
    <ReasoningMap
      {scenario}
      {session}
      {update}
      initial={true}
      readOnly={false}
      {focusFindingId}
      onOpenEvidenceSource={openEvidenceSource}
    />
    {/key}
  {/if}
  {/if}
  </div>
  <p class="showcase-case-status" role="status" aria-live="polite">{notice}</p>
</section>

<style>
  .native-case-workspace { min-width: 0; width: 100%; height: 100%; }
  .showcase-case-heading { display: flex; flex: none; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; padding: 12px 16px; }
  .showcase-case-heading > div { display: grid; gap: 3px; }
  .showcase-case-heading strong { font-size: 14px; }
  .showcase-case-heading span { font-size: 12px; color: var(--muted, #596b60); }
  .showcase-case-note { flex: none; margin: 0; padding: 0 16px 12px; color: var(--muted, #596b60); font-size: 12px; line-height: 1.5; }
  .showcase-case-content { min-width: 0; }
  .showcase-case-status { flex: none; min-height: 18px; margin: 0; padding: 8px 16px; font-size: 12px; }
</style>
