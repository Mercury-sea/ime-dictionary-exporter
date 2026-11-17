import { documentSchema, ordered, relationKey, relationSchema, type Entry, type Profile, type Relation } from './lexicon';
import { saveWordGroup, type CodeDraft } from './word-groups';
import {codeError} from './input-schemes';

export type WordEditorDraft = {
  phrase: string;
  codes: CodeDraft[];
  relations: Relation[];
  relationPhrase: string;
  priorities: Record<string, number>;
};

export function candidateEntries(profile: Profile, originalPhrase: string | undefined, draft: WordEditorDraft, code: string): Entry[] {
  if (!code) return [];
  return ordered([
    ...profile.entries.filter(entry => entry.phrase !== originalPhrase).map(entry => ({ ...entry, priority: draft.priorities[entry.id] ?? entry.priority })),
    ...draft.codes.map(entry => ({ ...entry, code: entry.code.trim(), phrase: draft.phrase.trim() || '新词条' })),
  ].filter(entry => entry.code === code));
}

export function moveCandidate(entries: Entry[], id: string, direction: number): Record<string, number> {
  if (entries.length > 99) throw new Error('这一组超过 99 个候选，请分别设置优先级。');
  const list = [...entries], index = list.findIndex(entry => entry.id === id), target = index + direction;
  if (index < 0 || target < 0 || target >= list.length) return {};
  [list[index], list[target]] = [list[target], list[index]];
  return Object.fromEntries(list.map((entry, index) => [entry.id, index + 1]));
}

// 先验证全部草稿，再一次性提交；关联改名、其他候选排名和格式元数据一同保留。
export function saveWordEditor(profile: Profile, originalPhrase: string | undefined, draft: WordEditorDraft): Profile {
  const phrase = draft.phrase.trim();
  if (!phrase || phrase.length > 500 || /[\u0000-\u001f\u007f]/.test(phrase)) throw new Error('词条需要 1–500 个字符，不能包含换行。');
  if (originalPhrase !== undefined && phrase !== originalPhrase && profile.entries.some(entry => entry.phrase === phrase)) {
    throw new Error('目标词语已存在，请直接编辑该词语，避免覆盖它的输入码和标记。');
  }
  for (const code of draft.codes) {
    const message=codeError(code.code.trim(),profile.inputScheme);if(message)throw new Error(message);
    if (!Number.isInteger(code.priority) || code.priority < 1 || code.priority > 99) throw new Error('优先级须为 1–99 的整数。');
  }
  const relations = draft.relations.map(relation => ({ ...relation, phrases: relation.phrases.map(word => word === draft.relationPhrase ? phrase : word) }));
  const seen = new Set<string>();
  for (const relation of relations) {
    if (!relationSchema.safeParse(relation).success || new Set(relation.phrases).size !== relation.phrases.length) {
      throw new Error('请检查关联标记：关系需选择 2–100 个不同词语，自定义标签需填写 1–20 个字符。');
    }
    const key = relationKey(relation);
    if (seen.has(key)) throw new Error('关联标记重复，请合并或移除重复组。');
    seen.add(key);
  }
  const changed = saveWordGroup({ ...profile, relations, entries: profile.entries.map(entry => ({ ...entry, priority: draft.priorities[entry.id] ?? entry.priority })) }, originalPhrase, phrase, draft.codes);
  documentSchema.parse({ profiles: [changed] });
  return changed;
}

export function detachWordRelation(relations: Relation[], id: string, phrase: string): Relation[] {
  const seen = new Set<string>();
  return relations.flatMap(relation => {
    if (relation.id !== id) return [relation];
    const phrases = relation.phrases.filter(word => word !== phrase);
    return phrases.length >= (relation.kind === 'custom' ? 1 : 2) ? [{ ...relation, phrases }] : [];
  }).filter(relation => { const key = relationKey(relation); if (seen.has(key)) return false; seen.add(key); return true; });
}
