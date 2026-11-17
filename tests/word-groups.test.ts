import assert from 'node:assert/strict';
import { IDBFactory } from 'fake-indexeddb';
import { unzipSync, strFromU8 } from 'fflate';
import { backupDocument, documentSchema, parseBackup, type Profile, type Relation } from '../src/lib/lexicon';
import { groupEntries, saveWordGroup, setWordsEnabled, wordEnabledState } from '../src/lib/word-groups';
import { withEntries } from '../src/lib/relations';
import { LocalRepository } from '../src/lib/storage';
import { exportPackage, nativeFiles, planExport } from '../src/lib/export';

const profile: Profile = { id: 'group', name: '分组', description: '', format: 'sogou', entries: [
  { id: 'a', phrase: '媎妹', code: 'jiemei', priority: 1, enabled: true, msMetadata: [1, 2, 3, 4] },
  { id: 'b', phrase: '姐妹', code: 'jiemei', priority: 2, enabled: true },
  { id: 'c', phrase: '媎妹', code: 'jm', priority: 3, enabled: false },
], relations: [{ id: 'r', kind: 'synonym', phrases: ['媎妹', '姐妹'] }] };
const before = structuredClone(profile);
assert.deepEqual(groupEntries(profile.entries).map(group => [group.phrase, group.entries.map(entry => entry.id)]), [['媎妹', ['a', 'c']], ['姐妹', ['b']]]);
assert.deepEqual(groupEntries(profile.entries.filter(entry => entry.enabled))[0].entries.map(entry => entry.id), ['a']);
assert.deepEqual(profile, before);

const drafts = profile.entries.filter(entry => entry.phrase === '媎妹').map(({ msMetadata, ...entry }) => entry);
const edited = saveWordGroup(profile, '媎妹', '姊妹', [...drafts.map(entry => ({ ...entry, priority: 4 })), { id: 'd', code: 'j', priority: 5, enabled: true }]);
assert.deepEqual(edited.entries.map(entry => entry.id), ['a', 'b', 'c', 'd']);
assert.deepEqual(edited.entries[0].msMetadata, [1, 2, 3, 4]);
assert.equal(edited.entries[2].enabled, false);
assert.deepEqual(edited.relations?.[0].phrases, ['姊妹', '姐妹']);
assert.deepEqual(profile, before);
assert.throws(() => saveWordGroup(profile, '媎妹', '姐妹', drafts), /已存在/);
assert.throws(() => saveWordGroup(profile, '媎妹', '媎妹', []), /至少/);
assert.throws(() => saveWordGroup(profile, '媎妹', '媎妹', drafts.map(entry => ({ ...entry, code: 'jm' }))), /不能重复/);
assert.throws(() => saveWordGroup(profile, '媎妹', '媎妹', drafts.map(entry => ({ ...entry, code: '' }))), /不能重复/);
assert.throws(() => saveWordGroup(profile, '媎妹', '媎妹', drafts.map(entry => ({ ...entry, priority: 0 }))));
assert.throws(() => saveWordGroup(profile, undefined, '媎妹', [{ id: 'new', code: 'jm', priority: 1, enabled: true }]), /已存在/);
const appended = saveWordGroup(profile, undefined, '媎妹', [{ id: 'new', code: 'mei', priority: 1, enabled: true }]);
assert.equal(groupEntries(appended.entries)[0].entries.length, 3);
assert.deepEqual(appended.relations, profile.relations);

const tags: Relation[] = [
  { id: 'tag1', kind: 'custom', label: '日常用语', phrases: ['媎妹', '姐妹'] },
  { id: 'tag2', kind: 'custom', label: '待整理', phrases: ['媎妹'] },
];
const tagged = { ...profile, relations: [...profile.relations!, ...tags] };
documentSchema.parse({ profiles: [tagged] });
assert.equal(backupDocument({ profiles: [profile] }).version, 2);
assert.equal(backupDocument({ profiles: [tagged] }).version, 3);
for (const version of [undefined, 1, 2]) assert.deepEqual(parseBackup({ version, profiles: [profile] }).profiles[0], profile);
assert.deepEqual(parseBackup(backupDocument({ profiles: [tagged] })).profiles[0], tagged);
assert.throws(() => parseBackup({ version: 6, profiles: [tagged] }), /更新/);
for (const label of ['', '  ', 'x'.repeat(21), '含\n换行']) {
  assert.throws(() => documentSchema.parse({ profiles: [{ ...profile, relations: [{ ...tags[0], label }] }] }));
}
assert.throws(() => documentSchema.parse({ profiles: [{ ...profile, relations: [{ ...tags[0], label: undefined }] }] }));
assert.throws(() => documentSchema.parse({ profiles: [{ ...profile, relations: [...tags, { ...tags[0], id: 'duplicate', phrases: ['姐妹', '媎妹'] }] }] }));
assert.throws(() => documentSchema.parse({ profiles: [{ ...profile, relations: [{ ...tags[0], phrases: ['不存在'] }] }] }));
assert.throws(() => documentSchema.parse({ profiles: [{ ...profile, relations: [{ id: 'r', kind: 'related', phrases: ['媎妹'] }] }] }));
const oneCode = saveWordGroup(tagged, '媎妹', '媎妹', drafts.slice(0, 1));
assert.deepEqual(oneCode.relations, tagged.relations);
const oneWord = withEntries(tagged, tagged.entries.filter(entry => entry.phrase === '媎妹'));
assert.deepEqual(oneWord.relations, tags.map(tag => ({ ...tag, phrases: ['媎妹'] })));
const renamed = saveWordGroup(tagged, '媎妹', '姊妹', drafts);
assert.deepEqual(renamed.relations?.[2].phrases, ['姊妹']);
// 同名标签缩小范围后重合时仅留一份，不影响其他标签。
const overlapped = { ...profile, relations: [tags[0], { ...tags[0], id: 'another', phrases: ['媎妹'] }, tags[1]] };
assert.equal(withEntries(overlapped, oneWord.entries).relations?.length, 2);

// 所有原生输入法字节保持不变，标签只进入包内 JSON 备份。
for (const format of ['sogou', 'qq', 'microsoft', 'apple', 'mobile', 'iflytek'] as const) {
  assert.deepEqual(nativeFiles(planExport(profile, format).entries, format), nativeFiles(planExport(tagged, format).entries, format));
  const backup = JSON.parse(strFromU8(unzipSync(exportPackage(oneWord, format))['词库备份.json']));
  assert.deepEqual(parseBackup(backup).profiles[0], oneWord);
}
const factory = new IDBFactory();
const repository = new LocalRepository(factory, 'group-tags');
await repository.load();
await repository.save({ profiles: [tagged] }, 0);
const reopened = new LocalRepository(factory, 'group-tags');
assert.deepEqual((await reopened.load()).document.profiles[0], tagged);
repository.close(); reopened.close();
console.log('PASS: word grouping; atomic multi-code edits; metadata; duplicate validation; custom labels; legacy/v3 backups; rename/delete cleanup; six native exports; IndexedDB reload.');

// 筛选只露出其中一个输入码时，整词开关仍必须操作全部码并保留其他词语。
assert.equal(wordEnabledState(profile.entries.filter(entry => entry.phrase === '媎妹')), 'indeterminate');
const disabled = setWordsEnabled(profile.entries, ['媎妹'], false);
assert.equal(wordEnabledState(disabled.filter(entry => entry.phrase === '媎妹')), false);
assert.equal(disabled.find(entry => entry.id === 'b')?.enabled, true);
assert.deepEqual(disabled[0].msMetadata, [1, 2, 3, 4]);
const enabled = setWordsEnabled(disabled, ['媎妹'], true);
assert.equal(wordEnabledState(enabled.filter(entry => entry.phrase === '媎妹')), true);
assert.equal(profile.entries.find(entry => entry.id === 'c')?.enabled, false);
console.log('PASS: word-wide enable/disable; legacy mixed state; metadata and other words preserved.');
