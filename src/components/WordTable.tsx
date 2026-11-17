import type { CSSProperties } from 'react';
import { Trash2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { HeaderHint } from '@/components/HeaderHint';
import { WordStatusToggle } from '@/components/WordStatusToggle';
import { CodeStatusToggle } from '@/components/CodeStatusToggle';
import { RelationMarks } from '@/components/RelationMarks';
import { type Relation, type Entry } from '@/lib/lexicon';
import { wordEnabledState, type WordGroup } from '@/lib/word-groups';

export function WordTable({ groups, allEntries, profileId, selected, busy, editingPhrase, relations, onSelect, onEdit, onDelete, onToggle, onToggleCode }: {
  groups: WordGroup[]; allEntries: Entry[]; profileId: string; selected: string[]; busy: boolean; editingPhrase?: string; relations: Map<string, Relation[]>;
  onSelect: (ids: string[], phrase?: string) => void; onEdit: (phrase: string, trigger: HTMLElement) => void;
  onDelete: (phrase: string, trigger: HTMLElement) => void;
  onToggle: (phrase: string, enabled: boolean) => void;
  onToggleCode: (id: string) => void;
}) {
  // 选择以整个词语为单位，避免搜索隐藏的输入码在删除后留下半个词条。
  const entriesByPhrase = new Map<string, Entry[]>();
  for (const entry of allEntries) {
    const entries = entriesByPhrase.get(entry.phrase) || [];
    entries.push(entry);
    entriesByPhrase.set(entry.phrase, entries);
  }
  const idsFor = (phrase: string) => (entriesByPhrase.get(phrase) || []).map(entry => entry.id);
  const pageIds = groups.flatMap(group => idsFor(group.phrase));
  const codeCharacters = Math.max(4, ...groups.flatMap(group => group.entries.map(entry => entry.code.length || 6)));
  function checked(ids: string[]) { return ids.length > 0 && ids.every(id => selected.includes(id)) ? true : ids.some(id => selected.includes(id)) ? 'indeterminate' as const : false; }
  function select(ids: string[], value: boolean, phrase?: string) { onSelect(value ? [...new Set([...selected, ...ids])] : selected.filter(id => !ids.includes(id)), value ? phrase : undefined); }
  return <Table className="word-table" style={{ '--code-characters': codeCharacters } as CSSProperties}><colgroup><col className="word-select-col"/><col className="word-text-col"/><col className="word-marks-col"/><col className="word-input-col"/><col className="word-priority-col"/><col className="word-delete-col"/></colgroup><TableHeader><TableRow>
    <TableHead className="check-col"><div className="word-select-control"><Checkbox aria-label="选择本页词条" disabled={busy} checked={checked(pageIds)} onCheckedChange={value => select(pageIds, !!value)} /></div></TableHead>
    <TableHead><HeaderHint label="词条" text="同一词语合并显示。点击行内空白处或勾选框切换选择；点击词语编辑全部输入码。多选时显示最近勾选的词条；选择包含筛选中未显示的输入码。词语后的状态可点击切换。" /></TableHead>
    <TableHead><HeaderHint label="关联标记" text="点击关系标签查看关联词语；编辑标记请点击词条，进入「关联标记」页。" /></TableHead>
    <TableHead colSpan={2}><div className="word-code-pair"><HeaderHint label="输入码" text="深绿圆点表示启用，深红圆点与删除线表示禁用。点击圆点切换状态；修改输入码请点击词条。" /><HeaderHint label="优先级" text="相同输入码下数字越小越靠前。禁用码的优先级显示灰底；点击词条可编辑优先级或候选排序。" /></div></TableHead>
    <TableHead className="word-delete-cell"><span className="sr-only">删除</span></TableHead>
  </TableRow></TableHeader><TableBody>{groups.map(group => {
    const enabled = wordEnabledState(entriesByPhrase.get(group.phrase) || []);
    const marks = relations.get(group.phrase) || [];
    // 只有明确勾选才染整行，正在编辑的词语单独加下划线。
    const chosen = group.entries.some(entry => selected.includes(entry.id));
    return <TableRow key={group.phrase} className={'selectable-word-row'+(chosen?' focused-row':'')} aria-selected={chosen} onClick={event=>{
      if(busy||event.defaultPrevented||event.detail>1)return;
      const target=event.target as Element;
      if(!event.currentTarget.contains(target)||target.closest('button,a,input,select,textarea,label,[role="button"],[role="checkbox"],[role="switch"],[data-row-no-select]'))return;
      if(window.getSelection()?.toString())return;
      event.currentTarget.querySelector<HTMLButtonElement>('[role="checkbox"]')?.focus({preventScroll:true});
      select(idsFor(group.phrase),checked(idsFor(group.phrase))!==true,group.phrase);
    }}>
      <TableCell><div className="word-select-control"><Checkbox aria-label={`选择 ${group.phrase}`} disabled={busy} checked={checked(idsFor(group.phrase))} onCheckedChange={value => select(idsFor(group.phrase), !!value, group.phrase)} /></div></TableCell>
      <TableCell className="word-phrase-cell"><div className="word-phrase-content">
        <button className={'phrase-name' + (enabled === false ? ' word-disabled' : '') + (editingPhrase === group.phrase ? ' is-editing' : '')} disabled={busy} onClick={event => onEdit(group.phrase, event.currentTarget)}>{group.phrase}</button>
        <WordStatusToggle phrase={group.phrase} value={enabled} disabled={busy} onChange={value => onToggle(group.phrase, value)}/>
      </div></TableCell>
      <TableCell className="word-relation-cell"><RelationMarks phrase={group.phrase} relations={marks} disabled={busy}/></TableCell>
      <TableCell colSpan={2} className="word-codes-cell"><div className="word-codes-stack">{group.entries.map(entry => <div className={'word-code-pair' + (entry.enabled ? '' : ' code-disabled')} key={entry.id}>
        <div className="word-code-cell">
          <CodeStatusToggle key={`${profileId}:${entry.id}`} phrase={entry.phrase} code={entry.code} enabled={entry.enabled} disabled={busy}
            onToggle={() => onToggleCode(entry.id)}/>
          <span className="code"><span className="code-text">{entry.code || '未设置'}</span>{!entry.enabled && <span className="sr-only">（已禁用）</span>}</span>
        </div>
        <span className="word-priority"><span className={'rank ' + (entry.priority === 1 ? 'first' : '')}>{String(entry.priority).padStart(2, '0')}</span></span>
      </div>)}</div></TableCell>
      <TableCell className="word-delete-cell"><button type="button" className="word-delete" disabled={busy} aria-label={`删除词条 ${group.phrase}`} title={`删除词条「${group.phrase}」`} onClick={event => onDelete(group.phrase, event.currentTarget)}><Trash2 size={15} aria-hidden="true"/></button></TableCell>
    </TableRow>;
  })}</TableBody></Table>;
}
