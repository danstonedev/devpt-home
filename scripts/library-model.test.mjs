import test from 'node:test';
import assert from 'node:assert/strict';
import model from '../library-model.js';
import {libraryRenderer} from './library-renderer.mjs';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('..',import.meta.url));
import {base,organizedCatalog} from '../e2e/fixtures/organized-catalog.mjs';
const item=(id,fields={})=>({...base.activities[0],id,nativeId:id,aliasOf:undefined,title:id,region:'Knee',regionId:'knee',topic:'Anatomy',topicId:'anatomy',url:'https://lab.devpt.app/teaching/?activity='+id,...fields});

test('cross-listings use unions for counts and intersect facets without alias or membership duplicates',()=>{
  const library=model.create(organizedCatalog);
  assert.equal(library.valid,true);
  assert.deepEqual(library.counts(library.listed),{resourceCount:7,familyCount:6});
  assert.deepEqual(library.filter({topic:'anatomy',format:'game',region:'knee'}).map(item=>item.id),['knee-game','knee-imaging-game']);
  const structure=library.sections.find(section=>section.id==='structure-function');
  assert.equal(structure.resourceCount,6); // Imaging game belongs to two topics; counted once.
  assert.equal(structure.familyCount,5);
  assert.equal(library.filter({region:'knee'}).filter(item=>item.id==='regional-neural').length,1);
  assert.equal(library.subjectTopics.some(topic=>topic.id==='games'),false);
  assert.deepEqual(library.filter({topic:'games'}).map(item=>item.id),library.filter({format:'game'}).map(item=>item.id));
});

test('authoritative region arrays correct legacy Whole body; methods stay browsable without anatomy restriction',()=>{
  const library=model.create(organizedCatalog);
  assert.deepEqual(library.filter({region:'whole-body'}).map(item=>item.id),['body-study']);
  assert.equal(library.regions.find(region=>region.id==='knee').resourceCount,4);
  assert.deepEqual(library.filter({scope:'nonregional'}).map(item=>item.id),['method-tool']);
  assert.equal(library.filter({topic:'measurement-evidence',format:'practice-tool'}).length,1);
  assert.ok(library.partition(library.filter({topic:'anatomy'}),'region',library.regions).find(group=>group.id==='knee').items.some(item=>item.id==='regional-neural'));
  assert.deepEqual(library.partition(library.filter({topic:'anatomy'}),'region',library.regions).flatMap(group=>group.items).map(item=>item.id).sort(),library.filter({topic:'anatomy'}).map(item=>item.id).sort());
});

test('reviewed families collapse across regions while retaining exactly matched canonical variants',()=>{
  const library=model.create(organizedCatalog);
  const family=library.studyGroups(library.filter({topic:'anatomy'})).find(group=>group.family);
  assert.equal(family.label,'Rectus femoris');assert.equal(family.items.length,2);
  assert.deepEqual(library.studyGroups(library.filter({region:'hip'})).find(group=>group.family).items.map(item=>item.id),['hip-muscle']);
  assert.deepEqual(library.search({q:'closed chain'}).map(item=>item.id),['hip-muscle']);
  assert.equal(library.search({q:'games',topic:'anatomy'}).length,2);
});

test('old catalogs keep their primary memberships and singleton studies; malformed additive metadata fails closed',()=>{
  const old=model.create(base);assert.equal(old.valid,true);
  assert.equal(old.counts(old.listed).familyCount,old.listed.length);
  assert.equal(old.formats[0].id,'interactive-study');
  for(const invalid of [
    {topicIds:['imaging']},{regionIds:['missing-region']},{regionIds:['knee','knee']},
    {formatId:'unknown-format'},{studyFamily:{id:'unsafe/id',label:'Muscle',variantLabel:'Study'}},
  ]) assert.equal(model.create({...organizedCatalog,activities:[item('broken',invalid)]}).valid,false);
  assert.equal(model.create({...organizedCatalog,activities:[
    item('one',{studyFamily:{id:'same-identity',label:'One muscle',variantLabel:'First task'}}),
    item('two',{studyFamily:{id:'same-identity',label:'Different muscle',variantLabel:'Second task'}}),
  ]}).valid,false);
});

test('actual static/browser templates show subject games, format links, unique families, effective regions and old routes',()=>{
  const renderer=libraryRenderer(root,organizedCatalog);
  const home=renderer.render('/').html;
  assert.match(home,/By format/);assert.match(home,/search\/\?format=game/);
  assert.match(home,/search\/\?scope=nonregional/);assert.match(home,/Study groups/);
  assert.doesNotMatch(home,/topic-chip[^>]*href="\/topics\/games\//);
  const anatomy=renderer.render('/topics/anatomy/').html;
  assert.equal((anatomy.match(/data-study-family="muscle-rectus-femoris"/g)||[]).length,1);
  for(const id of ['knee-muscle','hip-muscle','knee-game','knee-imaging-game','regional-neural'])assert.match(anatomy,new RegExp('/resources/'+id+'/'));
  assert.doesNotMatch(anatomy,/resources\/old-knee-muscle/);
  assert.match(renderer.render('/topics/games/').html,/resources\/knee-imaging-game/);
  const oldQuery=renderer.render('/search/?topic=games').html;
  assert.match(oldQuery,/value="game" selected/);assert.match(oldQuery,/2 resources/);
  const intersection=renderer.render('/search/?topic=anatomy&region=hip&format=interactive-study').html;
  assert.match(intersection,/resources\/hip-muscle/);assert.match(intersection,/resources\/regional-neural/);
  assert.doesNotMatch(intersection,/resources\/knee-muscle/);
  const methods=renderer.render('/search/?scope=nonregional').html;
  assert.match(methods,/Methods and tools/);assert.match(methods,/resources\/method-tool/);
  assert.doesNotMatch(renderer.render('/regions/whole-body/').html,/resources\/method-tool/);
  for(const activity of renderer.activities)assert.match(renderer.render('/resources/'+activity.id+'/').html,new RegExp('data-player-asset="'+activity.id+'"'));
});

test('legacy source previews remain in anatomical browse and their old routes without becoming a subject',()=>{
  const catalog={...organizedCatalog,
    topics:[...organizedCatalog.topics,{id:'source-previews',label:'Native motion previews',legacyFormatId:'source-preview'}],
    formats:[...organizedCatalog.formats,{id:'source-preview',label:'Source previews'}],
    activities:[...organizedCatalog.activities.filter(item=>!item.studyFamily&&!item.aliasOf),
      item('native-take',{topicId:'source-previews',topic:'Native motion previews',topicIds:['source-previews'],formatId:'source-preview'})],
  };
  const library=model.create(catalog),renderer=libraryRenderer(root,catalog);
  assert.equal(library.valid,true);assert.ok(!library.subjectTopics.some(topic=>topic.id==='source-previews'));
  const knee=renderer.render('/regions/knee/').html;
  assert.equal((knee.match(/href="\/resources\/native-take\/"/g)||[]).length,1);
  assert.match(knee,/Also in the library/);assert.match(knee,/search\/\?region=knee(?:&amp;|&)format=source-preview/);
  assert.match(renderer.render('/topics/source-previews/').html,/resources\/native-take/);
  const oldQuery=renderer.render('/search/?topic=source-previews').html;
  assert.match(oldQuery,/value="source-preview" selected/);assert.match(oldQuery,/1 resource/);
});

test('unassigned region scope stays distinct from anatomical Whole body and nonregional methods',()=>{
  const catalog={...organizedCatalog,activities:[item('unassigned-study',{regionId:'whole-body',region:'Whole body',regionIds:[],regionScope:'unassigned'})]};
  const library=model.create(catalog),renderer=libraryRenderer(root,catalog);
  assert.equal(library.valid,true);assert.equal(library.filter({scope:'nonregional'}).length,0);
  assert.equal(library.filter({region:'whole-body'}).length,0);assert.equal(library.filter({scope:'unassigned'}).length,1);
  const topic=renderer.render('/topics/anatomy/').html;
  assert.match(topic,/Region not assigned/);assert.match(topic,/resources\/unassigned-study/);
  assert.match(renderer.render('/search/?scope=unassigned').html,/value="unassigned" selected/);
});
