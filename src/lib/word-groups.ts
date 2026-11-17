import { entrySchema, type Entry, type Profile } from './lexicon';
import { withEntries } from './relations';

export type WordGroup = { phrase: string; entries: Entry[] };

// 只分组展示，不重排存储记录；筛选后的输入码也不会被拆到不同页。
export function groupEntries(entries: Entry[]): WordGroup[] {
  const groups = new Map<string, WordGroup>();
  for (const entry of entries) {
    const group = groups.get(entry.phrase);
    if (group) group.entries.push(entry);
    else groups.set(entry.phrase, { phrase: entry.phrase, entries: [entry] });
  }
  return [...groups.values()];
}

export type CodeDraft = Pick<Entry, 'id' | 'code' | 'priority' | 'enabled'>;

export function saveWordGroup(profile: Profile, originalPhrase: string | undefined, rawPhrase: string, drafts: CodeDraft[], preserveCode = false): Profile {
  const phrase = rawPhrase.trim();
  if (!drafts.length) throw new Error('请至少保留一个输入码；删除整个词语请使用词条列表的删除按钮。');
  const originals = profile.entries.filter(entry => entry.phrase === originalPhrase);
  if (originalPhrase !== undefined && !originals.length) throw new Error('这个词语已不存在，请关闭后重新查看。');
  if (originalPhrase !== undefined && phrase !== originalPhrase && profile.entries.some(entry => entry.phrase === phrase)) {
    throw new Error('目标词语已存在，请直接编辑该词语，避免覆盖它的输入码和标记。');
  }
  const originalsById = new Map(originals.map(entry => [entry.id, entry]));
  // 从原记录复制格式元数据；集中编辑仅修改界面明确提供的字段。
  const changed = drafts.map(draft => entrySchema.parse({ ...originalsById.get(draft.id), ...draft, code: preserveCode ? draft.code : draft.code.trim(), phrase }));
  const codes = new Set(changed.map(entry => entry.code));
  if (codes.size !== changed.length) throw new Error('同一词语的输入码不能重复（空输入码也只能保留一个）。');
  if (new Set(changed.map(entry => entry.id)).size !== changed.length) throw new Error('记录编号重复，请关闭后重试。');
  const others = profile.entries.filter(entry => entry.phrase !== originalPhrase);
  if (changed.some(entry => others.some(other => other.id === entry.id || other.phrase === entry.phrase && other.code === entry.code))) {
    throw new Error('同一输入码下已存在这条词语，请修改输入码。');
  }
  if (originalPhrase === undefined) return withEntries(profile, [...changed, ...profile.entries]);
  const updates = new Map(changed.map(entry => [entry.id, entry]));
  const entries = profile.entries.flatMap(entry => {
    if (entry.phrase !== originalPhrase) return [entry];
    return updates.has(entry.id) ? [updates.get(entry.id)!] : [];
  });
  const added = changed.filter(entry => !originalsById.has(entry.id));
  let last = -1;
  entries.forEach((entry, index) => { if (updates.has(entry.id)) last = index; });
  entries.splice(last >= 0 ? last + 1 : Math.min(profile.entries.findIndex(entry => entry.phrase === originalPhrase), entries.length), 0, ...added);
  return withEntries(profile, entries, { from: originalPhrase, to: phrase });
}

// 逐码保留启用状态，返回混合状态供整词标签与编辑提示使用。
export function wordEnabledState(entries: Entry[]): boolean | 'indeterminate' {
  if (!entries.some(entry => entry.enabled)) return false;
  return entries.every(entry => entry.enabled) ? true : 'indeterminate';
}

export function setWordsEnabled(entries: Entry[], phrases: string[], enabled: boolean): Entry[] {
  const words = new Set(phrases);
  return entries.map(entry => words.has(entry.phrase) ? { ...entry, enabled } : entry);
}
