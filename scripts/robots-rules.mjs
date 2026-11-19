// Whether robots.txt lets crawlers fetch a path. Follows Google's matching:
// `*` matches any characters, a trailing `$` anchors the end, the longest
// matching rule wins and Allow wins a tie. Rules from every group are applied,
// which is stricter than any single crawler and enough for this site's file.
export function robotsAllows(robots, path) {
  let best = { length: -1, allow: true };
  for (const [, field, pattern] of robots.matchAll(/^[ \t]*(allow|disallow)[ \t]*:[ \t]*([^\s#]*)/gim)) {
    if (!pattern) continue;
    const anchored = pattern.endsWith('$');
    const body = (anchored ? pattern.slice(0, -1) : pattern)
      .split('*')
      .map(part => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .join('.*');
    if (!new RegExp('^' + body + (anchored ? '$' : '')).test(path)) continue;
    const allow = field.toLowerCase() === 'allow';
    if (pattern.length > best.length || (pattern.length === best.length && allow)) best = { length: pattern.length, allow };
  }
  return best.allow;
}
