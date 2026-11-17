import assert from 'node:assert/strict';
import { candidateEntries, detachWordRelation, moveCandidate, saveWordEditor, type WordEditorDraft } from '../src/lib/word-editor';
import { documentSchema, type Profile } from '../src/lib/lexicon';
import { nativeFiles, planExport } from '../src/lib/export';

const profile: Profile = { id: 'p', name: '统一编辑', description: '', format: 'microsoft', entries: [
  { id: 'a', phrase: '开心', code: 'kaixin', priority: 1, enabled: true, msMetadata: [1, 2, 3, 4] },
  { id: 'b', phrase: '开心', code: 'kx', priority: 3, enabled: false },
  { id: 'c', phrase: '快乐', code: 'kaixin', priority: 2, enabled: true },
  { id: 'd', phrase: '愉快', code: 'yukuai', priority: 1, enabled: true },
], relations: [{ id: 'r', kind: 'synonym', phrases: ['开心', '快乐', '愉快'] }, { id: 'tag', kind: 'custom', label: '常用', phrases: ['开心'] }] };
const before = structuredClone(profile);
const draft: WordEditorDraft = { phrase: '开心', relationPhrase: '开心', codes: profile.entries.filter(e => e.phrase === '开心').map(({ id, code, priority, enabled }) => ({ id, code, priority, enabled })), relations: structuredClone(profile.relations!), priorities: {} };
const noChange = saveWordEditor(profile, '开心', draft);
assert.deepEqual(noChange, profile);
for (const format of ['sogou', 'qq', 'microsoft', 'apple', 'mobile', 'iflytek'] as const) assert.deepEqual(nativeFiles(planExport(noChange, format).entries, format), nativeFiles(planExport(profile, format).entries, format));
const candidates = candidateEntries(profile, '开心', draft, 'kaixin');
assert.deepEqual(candidates.map(e => e.phrase), ['开心', '快乐']);
const ranks = moveCandidate(candidates, 'c', -1);
const edited: WordEditorDraft = { ...draft, phrase: '开怀', codes: draft.codes.map(e => ({ ...e, priority: ranks[e.id] ?? e.priority })), priorities: { c: ranks.c }, relations: [...draft.relations, { id: 'new-tag', kind: 'custom', label: '待检查', phrases: ['开心'] }] };
const saved = saveWordEditor(profile, '开心', edited);
assert.deepEqual(saved.entries.map(e => [e.phrase, e.priority, e.enabled]), [['开怀', 2, true], ['开怀', 3, false], ['快乐', 1, true], ['愉快', 1, true]]);
assert.deepEqual(saved.entries[0].msMetadata, [1, 2, 3, 4]);
assert.deepEqual(saved.relations?.[0].phrases, ['开怀', '快乐', '愉快']);
assert.deepEqual(saved.relations?.[2].phrases, ['开怀']);
documentSchema.parse({ profiles: [saved] });
// 所有页签先验证再保存，错误不修改原数据。
assert.throws(() => saveWordEditor(profile, '开心', { ...edited, codes: edited.codes.map(e => ({ ...e, code: 'same' })) }), /不能重复/);
assert.throws(() => saveWordEditor(profile, '开心', { ...edited, relations: [{ id: 'invalid', kind: 'synonym', phrases: ['开心'] }] }), /关联标记/);
assert.throws(() => saveWordEditor(profile, '开心', { ...edited, phrase: '快乐' }), /已存在/);
assert.deepEqual(profile, before);
// 移除当前词条的关联仍保留其他词语之间的关系；自定义标签也遵循相同范围。
assert.deepEqual(detachWordRelation(draft.relations, 'r', '开心')[0].phrases, ['快乐', '愉快']);
assert.equal(detachWordRelation(draft.relations, 'tag', '开心').length, 1);
const created = saveWordEditor(profile, undefined, { phrase: '欢喜', relationPhrase: 'new-anchor', codes: [{ id: 'new', code: 'huanxi', priority: 1, enabled: true }], relations: [...draft.relations, { id: 'new-related', kind: 'related', phrases: ['new-anchor', '开心'] }], priorities: {} });
assert.deepEqual(created.relations?.at(-1)?.phrases, ['欢喜', '开心']);
assert.equal(created.entries[0].phrase, '欢喜');
assert.deepEqual(candidateEntries(profile, '开心', { ...draft, codes: draft.codes.map(e => ({ ...e, code: 'changed' })) }, 'kaixin').map(e => e.id), ['c']);
assert.deepEqual(moveCandidate(candidates, 'missing', 1), {});
assert.throws(() => moveCandidate(Array.from({length:100},(_,i)=>({...profile.entries[0],id:String(i)})), '1', -1), /99/);
console.log('PASS: unified draft validation; atomic rename/relations/ranking; candidate scope; retained metadata and six exports; new-word relations; detach scope.');
