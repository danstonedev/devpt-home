import {readFileSync} from 'node:fs';
export const base=JSON.parse(readFileSync(new URL('./public-catalog.json',import.meta.url),'utf8'));
const template=base.activities[0];
const item=(id,fields={})=>({...template,id,nativeId:id,aliasOf:undefined,title:id,region:'Knee',regionId:'knee',topic:'Anatomy',topicId:'anatomy',url:'https://lab.devpt.app/teaching/?activity='+id,...fields});
export const organizedCatalog={...base,
  regions:[{id:'knee',label:'Knee'},{id:'hip',label:'Hip'},{id:'whole-body',label:'Whole body'}],
  topics:[{id:'anatomy',label:'Anatomy',sectionId:'structure-function'},{id:'imaging',label:'Imaging',sectionId:'structure-function'},{id:'measurement-evidence',label:'Measurement & evidence',sectionId:'examination'},{id:'games',label:'Learning games',sectionId:'structure-function',legacyFormatId:'game'}],
  sections:[{id:'structure-function',label:'Structure & function'},{id:'examination',label:'Examination'}],
  formats:[{id:'interactive-study',label:'Interactive studies'},{id:'game',label:'Games'},{id:'practice-tool',label:'Practice tools'}],
  activities:[
    item('knee-muscle',{studyFamily:{id:'muscle-rectus-femoris',label:'Rectus femoris',variantLabel:'Knee · Open chain'}}),
    item('hip-muscle',{region:'Hip',regionId:'hip',studyFamily:{id:'muscle-rectus-femoris',label:'Rectus femoris',variantLabel:'Hip · Closed chain'}}),
    item('knee-game',{topicId:'games',topic:'Learning games',topicIds:['games','anatomy'],formatId:'game'}),
    item('knee-imaging-game',{topicId:'games',topic:'Learning games',topicIds:['games','imaging','anatomy'],formatId:'game'}),
    item('regional-neural',{regionId:'whole-body',region:'Whole body',regionIds:['knee','hip'],regionScope:'regional'}),
    item('method-tool',{topicId:'measurement-evidence',topic:'Measurement & evidence',regionId:'whole-body',region:'Whole body',regionIds:[],regionScope:'nonregional',formatId:'practice-tool'}),
    item('body-study',{regionId:'whole-body',region:'Whole body',regionScope:'whole-body'}),
    item('old-knee-muscle',{aliasOf:'knee-muscle'}),
  ],
};
