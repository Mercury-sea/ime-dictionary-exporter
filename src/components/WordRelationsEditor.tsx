import { useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { relationKinds, relationLabel, type Profile, type Relation, type RelationKind } from '@/lib/lexicon';
import { detachWordRelation } from '@/lib/word-editor';

export function WordRelationsEditor({ profile, anchor, phrase, relations, busy, onChange }: {
  profile: Profile; anchor: string; phrase: string; relations: Relation[]; busy: boolean; onChange: (relations: Relation[]) => void;
}) {
  const [editing, setEditing] = useState<string | null>(null), [search, setSearch] = useState('');
  const groups = relations.filter(relation => relation.phrases.includes(anchor));
  const current = groups.find(relation => relation.id === editing);
  const words = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const entry of profile.entries) {
      if (entry.phrase === anchor) continue;
      const codes = map.get(entry.phrase) || [];
      if (!codes.includes(entry.code)) codes.push(entry.code);
      map.set(entry.phrase, codes);
    }
    return [...map].map(([phrase, codes]) => ({ phrase, codes }));
  }, [profile.entries, anchor]);
  const matches = words.filter(word => !search || word.phrase.includes(search) || word.codes.some(code => code.includes(search.toLowerCase())));
  function change(id: string, patch: Partial<Relation>) { onChange(relations.map(relation => relation.id === id ? { ...relation, ...patch } : relation)); }
  function add() {
    const id = crypto.randomUUID();
    onChange([...relations, { id, kind: 'related', phrases: [anchor] }]);
    setEditing(id); setSearch('');
  }
  return <div className="editor-relations">
    <div className="editor-section-summary"><span>{groups.length} 组标记</span><Button type="button" variant="outline" disabled={busy || relations.length >= 1000} onClick={add}><Plus size={14}/>添加标记</Button></div>
    {!groups.length && <p className="editor-empty">还没有关联标记，可以添加同义、近义、异体字或自定义标签。</p>}
    {groups.map(group => <div className={'editor-relation-group' + (editing === group.id ? ' is-editing' : '')} key={group.id}>
      <div className="editor-relation-heading"><span className="relation-kind">{relationLabel(group) || '未命名标签'}</span><div>
        <button type="button" disabled={busy} onClick={() => { setEditing(editing === group.id ? null : group.id); setSearch(''); }}>{editing === group.id ? '收起' : '编辑'}</button>
        <button type="button" className="remove-code" disabled={busy} aria-label={`移除此词条的${relationLabel(group)}标记`} onClick={() => { onChange(detachWordRelation(relations, group.id, anchor)); if (editing === group.id) setEditing(null); }}><Trash2 size={14}/></button>
      </div></div>
      <p className="editor-relation-words">{group.phrases.filter(word => word !== anchor).join('、') || (group.kind === 'custom' ? '仅标记此词条' : '请选择关联词语')}</p>
      {current?.id === group.id && <div className="editor-relation-fields">
        <label>标记类型<select aria-label="标记类型" disabled={busy} value={current.kind} onChange={event => change(current.id, { kind: event.target.value as RelationKind, label: event.target.value === 'custom' ? '' : undefined })}>
          {Object.entries(relationKinds).map(([kind, label]) => <option value={kind} key={kind}>{label}</option>)}
        </select></label>
        {current.kind === 'custom' && <label>标签名称<Input aria-label="标签名称" disabled={busy} maxLength={20} value={current.label || ''} onChange={event => change(current.id, { label: event.target.value })} placeholder="例如：常用"/></label>}
        <p className="relation-note">{current.kind === 'custom' ? '可只标记当前词条，也可勾选其它词语。' : '组内词语共享此关系，修改会同步到组内词语。'}</p>
        <div className="editor-anchor">当前词条：{phrase.trim() || '新词条'}<small>已选 {current.phrases.length} / 100</small></div>
        <Input aria-label="搜索关联词语" disabled={busy} value={search} onChange={event => setSearch(event.target.value)} placeholder="搜索词语或输入码"/>
        <div className="relation-word-list" aria-label="可关联词语">{matches.slice(0, 50).map(word => <label key={word.phrase}>
          <input type="checkbox" checked={current.phrases.includes(word.phrase)} disabled={busy || (!current.phrases.includes(word.phrase) && current.phrases.length >= 100)} onChange={() => change(current.id, { phrases: current.phrases.includes(word.phrase) ? current.phrases.filter(phrase => phrase !== word.phrase) : [...current.phrases, word.phrase] })}/>
          <span>{word.phrase}</span><small>{word.codes.slice(0, 2).map(code => code || '未设置').join(' / ')}</small>
        </label>)}{!matches.length && <p className="relation-note">没有匹配的词语。</p>}</div>
        {matches.length > 50 && <p className="relation-note">显示前 50 个结果，可输入文字缩小范围。</p>}
      </div>}
    </div>)}
    {!!groups.length && <p className="relation-note">移除只取消此词条的标记，其它词语之间仍有效的关系会保留。</p>}
  </div>;
}
