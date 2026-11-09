/* Authored teaching sequence. Models and games remain owned by simLAB.
 * This is a projected faculty demo, not a student assessment or an exam protocol. */
(function () {
  'use strict';
  window.DevPTClassroomLesson = {
    id: 'ankle-foot-foundations', version: 3, minutes: 180,
    title: 'Lower leg, ankle & foot', subtitle: 'First-year DPT · examination & evaluation',
    patient: { name: 'Alex', age: 24, visit: 'Day 7', goal: 'Walking → stairs → basketball',
      facts: ['Right ankle inversion injury', 'Improving symptoms', 'Walking and stairs remain difficult'],
      context: 'Fictional follow-up case. At the first visit: malleolar-zone pain and posterior lateral-malleolar bony tenderness; initial radiographs reported no acute fracture. Recheck symptoms and safety today.' },
    phases: ['Connect', 'Demonstrate', 'Practise', 'Make sense'],
    chapters: [
      { id: 'opening', title: 'Meet Alex', short: 'Start', start: 0, end: 10,
        question: 'Why are stairs still difficult?', cue: 'One patient. Build the examination together.',
        resource: 'anatomy-ankle', resourceLabel: 'Ankle anatomy',
        chips: ['Day 7', 'Right ankle', 'Walking + stairs'] },
      { id: 'locate', number: '01', title: 'Locate & screen', short: 'Locate', start: 10, end: 55,
        questions: ['Where would you examine first?', 'See the landmark. Find it on a person.', 'Find the landmarks on your partner.', 'Does walking settle the screening decision?'],
        cues: ['Point, discuss, then explain your choice.', 'Faculty demonstration · palpation + a brief distal screen.', 'Consent & comfort · gentle contact · describe what you find.', 'First visit: malleolar-zone pain + posterior lateral-malleolar bony tenderness.'],
        resources: [ ['anatomy-ankle', 'Ankle'], ['anatomy-foot', 'Foot'] ],
        game: ['ankle-foot-pin-it', 'Pin it'], gameCue: 'Agree on the location before placing the pin. Return after a short round.',
        practice: ['Malleoli · navicular · 5th MT base', 'Achilles region', 'Taught distal screen'],
        check: { prompt: 'Walking four steps removes the imaging indication?', options: ['Yes', 'No'], correct: 1,
          feedback: 'No. In this applicable acute presentation, bony tenderness supported radiographs. That is an imaging indication, not a fracture diagnosis.', source: 'https://aci.health.nsw.gov.au/ecat/appendices/ottawa-ankle-adult' } },
      { id: 'break1', title: 'Break', short: 'Break', start: 55, end: 65, resource: 'anatomy-ankle', resourceLabel: 'Ankle anatomy',
        question: 'Take ten.', cue: 'Next: move and measure.', chips: ['10-minute break'] },
      { id: 'move', number: '02', title: 'Move & measure', short: 'Move', start: 65, end: 110,
        questions: ['What changes when the ankle moves?', 'Make the measurement reproducible.', 'Measure. Switch roles. Refine.', 'A smaller angle: what do we know?'],
        cues: ['Watch the movement. Predict the examination finding.', 'Faculty demonstration · AROM, goniometry, comfortable isometric resistance.', 'Record position, angle, symptoms and substitutions.', 'Teaching case · same recorded nonweightbearing setup.'],
        resources: [ ['joint-ankle-dorsiflexion', 'Dorsiflexion'], ['joint-ankle-plantarflexion', 'Plantarflexion'], ['joint-foot-subtalar-inversion', 'Inversion'], ['joint-foot-subtalar-eversion', 'Eversion'] ],
        game: ['ankle-foot-quick-fire', 'Quick fire'], gameCue: 'Discuss a short round together. The native game controls its questions and feedback.',
        practice: ['Comfortable AROM', 'DF goniometry · 2 teaching trials', 'Comfortable DF or eversion isometric'],
        finding: { label: 'Dorsiflexion', unit: '°', right: 5, left: 12, max: 15, note: 'Fictional findings · same setup · not reference norms' },
        check: { prompt: 'Does the lower angle identify one restricting tissue?', options: ['One tissue identified', 'More information needed'], correct: 1,
          feedback: 'Setup, symptoms and task factors matter. Describe the limitation, then seek converging findings before assigning a tissue explanation.' } },
      { id: 'break2', title: 'Break', short: 'Break', start: 110, end: 120, resource: 'joint-ankle-dorsiflexion', resourceLabel: 'Dorsiflexion',
        question: 'Reset. Then add load.', cue: 'Next: connect the examination to function.', chips: ['10-minute break'] },
      { id: 'load', number: '03', title: 'Load & interpret', short: 'Load', start: 120, end: 165,
        questions: ['What changes when the body moves over the foot?', 'Connect the model to the physical task.', 'Observe the task on your partner.', 'What does this mean for stairs?'],
        cues: ['Explore tibia-on-talus mechanics, then test the whole task.', 'Faculty demonstration · knee-to-wall + supported heel raises.', 'Keep the setup consistent. Use comfortable load and support.', 'Teaching case · same toe reference · heel stays down.'],
        resources: [ ['joint-ankle-tibia-on-talus', 'Tibia on talus'], ['muscle-ankle-soleus', 'Soleus'], ['muscle-ankle-gastrocnemius-medialis', 'Gastrocnemius'] ],
        game: ['ankle-foot-build', 'Build it'], gameCue: 'Build a short section together. Connect the structure to the task before continuing.',
        practice: ['Knee-to-wall · distance + symptoms', 'Supported heel raises · setup + quality', 'Connect one observation to stairs'],
        finding: { label: 'Knee-to-wall', unit: 'cm', right: 5, left: 10, max: 12, note: 'Fictional findings · right lateral symptoms 3/10' },
        check: { prompt: 'Does this result establish readiness for basketball?', options: ['Ready to play', 'Capacity & confidence still needed'], correct: 1,
          feedback: 'It describes this loaded task. Sport readiness needs other relevant capacity, confidence and functional information.' } },
      { id: 'close', title: 'Put it together', short: 'Finish', start: 165, end: 180,
        question: 'Explain Alex’s next step.', cue: 'Finding → functional meaning → remaining question.',
        resource: 'joint-ankle-tibia-on-talus', resourceLabel: 'Tibia on talus',
        chips: ['What did you observe?', 'Why does it matter?', 'What do you need next?'] }
    ]
  };
})();
