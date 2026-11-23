'use strict';
// Shared by the browser and static export. Memberships and families are reviewed
// source metadata; titles and search terms never infer a filing or a family.
(function () {
  const idPattern = /^[a-z0-9][a-z0-9-]*$/;
  const textFields = ['id','title','topic','region','type','level','media','symbol','desc','outcome','source'];
  const slug = value => String(value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const id = value => typeof value === 'string' && idPattern.test(value);
  const label = value => typeof value === 'string' && value.trim().length > 0;
  const words = value => String(value ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(/[^a-z0-9]+/).filter(Boolean);
  const registryValid = entries => entries === undefined || Array.isArray(entries)
    && entries.every(entry => entry && id(entry.id) && label(entry.label))
    && new Set(entries.map(entry => entry.id)).size === entries.length;
  const membershipsValid = (item, field) => item[field+'Ids'] === undefined
    || Array.isArray(item[field+'Ids']) && (field === 'region' || item[field+'Ids'].length > 0)
      && item[field+'Ids'].every(id) && new Set(item[field+'Ids']).size === item[field+'Ids'].length
      && (field === 'region' || item[field+'Ids'][0] === (item[field+'Id'] || slug(item[field])));
  function studyGroups(items) {
    const groups = [], index = new Map(), seen = new Set();
    for (const item of items) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      const key = item.studyFamily ? 'family:'+item.studyFamily.id : 'resource:'+item.id;
      let group = index.get(key);
      if (!group) {
        group = { id:key, label:item.studyFamily?.label || item.title, family:!!item.studyFamily, items:[] };
        groups.push(group); index.set(key, group);
      }
      group.items.push(item);
    }
    return groups;
  }
  function counts(items) {
    return { resourceCount:new Set(items.map(item => item.id)).size, familyCount:studyGroups(items).length };
  }
  function create(catalog, { local = false } = {}) {
    const supplied = catalog?.activities;
    let valid = catalog?.schemaVersion === 1 && catalog.status === (local ? 'local-development-only' : 'public-resources')
      && Array.isArray(supplied) && supplied.length > 0
      && ['regions','topics','sections','formats'].every(key => registryValid(catalog[key]))
      && supplied.every(item => item && typeof item === 'object' && !Array.isArray(item)
        && textFields.every(field => label(item[field])) && id(item.id)
        && Number.isFinite(item.minutes) && item.minutes >= 0
        && ['nativeId','regionId','topicId','aliasOf','formatId'].every(key => item[key] === undefined || id(item[key]))
        && (item.regionScope === undefined || ['regional','whole-body','nonregional','unassigned'].includes(item.regionScope))
        && membershipsValid(item, 'region') && membershipsValid(item, 'topic')
        && (item.studyFamily === undefined || item.studyFamily && !Array.isArray(item.studyFamily)
          && id(item.studyFamily.id) && label(item.studyFamily.label) && label(item.studyFamily.variantLabel)))
      && new Set(supplied.map(item => item.id)).size === supplied.length;
    const empty = { valid:false, assets:[], listed:[], regions:[], topics:[], subjectTopics:[], sections:[], formats:[], index:new Map(), has:()=>false, filter:()=>[], search:()=>[], partition:()=>[], counts, studyGroups };
    if (!valid) return empty;
    const assets = supplied.map(item => ({...item, nativeId:item.nativeId || item.id,
      regionId:item.regionId || slug(item.region), topicId:item.topicId || slug(item.topic),
      regionIds:item.regionIds ? [...item.regionIds] : [item.regionId || slug(item.region)],
      topicIds:item.topicIds ? [...item.topicIds] : [item.topicId || slug(item.topic)],
      formatId:item.formatId || 'interactive-study'}));
    const index = new Map(assets.map(item => [item.id, item]));
    // Old aliases keep resolving, but never become additional browse results.
    for (const item of assets) {
      const seen = new Set([item.id]); let target = item;
      while (target.aliasOf && index.has(target.aliasOf)) {
        if (seen.has(target.aliasOf)) return empty;
        seen.add(target.aliasOf); target = index.get(target.aliasOf);
      }
    }
    const listed = assets.filter(item => !(item.aliasOf && index.has(item.aliasOf)));
    const families = new Map();
    for (const item of listed) if (item.studyFamily) {
      const previous = families.get(item.studyFamily.id);
      if (previous && previous !== item.studyFamily.label) return empty;
      families.set(item.studyFamily.id, item.studyFamily.label);
    }
    const topicRegistry = catalog.topics || [];
    const legacyFormat = topicId => topicRegistry.find(entry => entry.id === topicId)?.legacyFormatId;
    const has = (item, dimension, selected) => dimension === 'format' ? item.formatId === selected
      : dimension === 'region' && ['nonregional','unassigned'].includes(item.regionScope) ? false
      : dimension === 'topic' && legacyFormat(selected) ? item.formatId === legacyFormat(selected)
      : item[dimension+'Ids'].includes(selected);
    const filter = ({region = '', topic = '', format = '', scope = ''} = {}) => listed.filter(item =>
      (!region || has(item, 'region', region)) && (!topic || has(item, 'topic', topic)) && (!format || has(item, 'format', format))
      && (!scope || (item.regionScope || (item.regionId === 'whole-body' ? 'whole-body' : 'regional')) === scope));
    function taxonomy(dimension, suppliedRegistry) {
      const entries = (suppliedRegistry || []).map(entry => ({...entry}));
      for (const item of listed) for (const member of item[dimension+'Ids']) {
        if (!entries.some(entry => entry.id === member)) {
          // Secondary memberships must be named by the source's registry.
          if (member !== item[dimension+'Id']) { valid = false; continue; }
          entries.push({id:member, label:item[dimension]});
        }
      }
      return entries.map(entry => ({...entry, ...counts(listed.filter(item => has(item, dimension, entry.id)))}))
        .filter(entry => entry.resourceCount).map(entry => ({...entry, count:entry.resourceCount}));
    }
    const regions = taxonomy('region', catalog.regions), topics = taxonomy('topic', catalog.topics);
    const subjectTopics = topics.filter(topic => !topic.legacyFormatId);
    const formatEntries = (catalog.formats || [{id:'interactive-study', label:'Interactive studies'}]).map(entry => ({...entry}));
    for (const item of listed) if (!formatEntries.some(entry => entry.id === item.formatId)) valid = false;
    const formats = formatEntries.map(entry => ({...entry, ...counts(filter({format:entry.id}))})).filter(entry => entry.resourceCount);
    if (!valid) return empty;
    const sections = (catalog.sections || []).map(entry => {
      const members = subjectTopics.filter(topic => topic.sectionId === entry.id);
      const items = listed.filter(item => members.some(topic => has(item, 'topic', topic.id)));
      return {...entry, topics:members, ...counts(items), count:items.length};
    }).filter(entry => entry.topics.length);
    const labels = (item, dimension) => (dimension === 'region' ? regions : topics).filter(entry => has(item, dimension, entry.id)).map(entry => entry.label);
    // Search metadata is stable for the lifetime of one catalog. Tokenize only
    // the resources searched, and rebuild naturally when the catalog changes.
    const searchIndex = new WeakMap();
    function search({q = '', ...facets} = {}) {
      const terms = words(q), scoped = filter(facets);
      if (!terms.length) return scoped;
      return scoped.map((item, order) => {
        let indexed = searchIndex.get(item);
        if (!indexed) {
          const all = words([item.title,item.context,item.group,item.type,...labels(item,'region'),...labels(item,'topic'),
            formats.find(format => format.id === item.formatId)?.label,item.studyFamily?.label,item.studyFamily?.variantLabel,...(Array.isArray(item.keywords) ? item.keywords : [])].join(' '));
          indexed = { all };
          searchIndex.set(item, indexed);
        }
        if (!terms.every(term => indexed.all.some(word => word.startsWith(term)))) return null;
        const title = indexed.title ??= words(item.title);
        return {item,order,score:terms.filter(term => title.some(word => word.startsWith(term))).length*2 + (title[0]?.startsWith(terms[0]) ? 1 : 0)};
      }).filter(Boolean).sort((a,b) => b.score-a.score || a.order-b.order).map(match => match.item);
    }
    // Every result has one displayed filing within this page. Cross-listing
    // makes it eligible for other pages without repeating it within this one.
    function partition(items, dimension, entries) {
      const groups = entries.map(entry => ({...entry, items:[]}));
      for (const item of items) {
        const group = groups.find(entry => entry.id === item[dimension+'Id'] && has(item, dimension, entry.id))
          || item[dimension+'Ids'].map(member => groups.find(entry => entry.id === member && has(item, dimension, member))).find(Boolean);
        if (group) group.items.push(item);
      }
      return groups.filter(group => group.items.length);
    }
    return {valid:true, assets, listed, index, regions, topics, subjectTopics, sections, formats, has, filter, search, partition, counts, studyGroups};
  }
  const api = Object.freeze({create, counts, studyGroups});
  if (typeof module !== 'undefined') module.exports = api;
  if (typeof window !== 'undefined') window.DEVPT_LIBRARY_MODEL = api;
})();
