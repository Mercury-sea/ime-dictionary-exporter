import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, ChevronDown, Plus, Trash2, X } from 'lucide-react';
import { DropdownMenu } from 'radix-ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { WordRelationsEditor } from '@/components/WordRelationsEditor';
import type { Profile } from '@/lib/lexicon';
import { candidateEntries, moveCandidate, saveWordEditor, type WordEditorDraft } from '@/lib/word-editor';
import type { CodeDraft } from '@/lib/word-groups';
import {normalizeCode,schemeFor} from '@/lib/input-schemes';

export type EditorTab = 'codes' | 'relations' | 'candidates';
const tabs: [EditorTab, string][] = [['codes', '输入码'], ['relations', '关联标记'], ['candidates', '候选排序']];
export type WordEditorHandle = { requestLeave: (action: () => void) => void; activate: (tab: EditorTab) => void; hasUnsavedChanges: () => boolean };
export const WordEditor = forwardRef<WordEditorHandle, {
  profile: Profile; originalPhrase?: string; initialTab?: EditorTab; busy: boolean; focusOnOpen?: boolean;
  onSave: (draft: WordEditorDraft) => Promise<void>; onClose: () => void;
}>(function WordEditor({ profile, originalPhrase, initialTab = 'codes', busy, focusOnOpen = true, onSave, onClose }, ref) {
  const [initial] = useState<WordEditorDraft>(() => ({
    phrase: originalPhrase || '',
    codes: originalPhrase === undefined ? [{ id: crypto.randomUUID(), code: '', priority: 1, enabled: true }]
      : profile.entries.filter(entry => entry.phrase === originalPhrase).map(({ id, code, priority, enabled }) => ({ id, code, priority, enabled })),
    relations: profile.relations || [], relationPhrase: originalPhrase ?? `new-word-${crypto.randomUUID()}`, priorities: {},
  }));
  const [draft, setDraft] = useState(initial), [tab, setTab] = useState<EditorTab>(initialTab);
  const [error, setError] = useState(''), [confirmClose, setConfirmClose] = useState(false), [candidateCode, setCandidateCode] = useState('');
  const body = useRef<HTMLDivElement>(null), saving = useRef(false);
  const card = useRef<HTMLElement>(null), discardButton = useRef<HTMLButtonElement>(null);
  const leaveAction = useRef<(() => void) | null>(null);
  const dirty = JSON.stringify(initial) !== JSON.stringify(draft);
  const enabledCount = draft.codes.filter(code => code.enabled).length;
  const codeChoices = [...new Set(draft.codes.map(code => code.code.trim()).filter(Boolean))];
  const shownCode = codeChoices.includes(candidateCode) ? candidateCode : codeChoices[0] || '';
  const candidates = candidateEntries(profile, originalPhrase, draft, shownCode);
  const removedCount = initial.codes.filter(code => !draft.codes.some(item => item.id === code.id)).length;
  useEffect(() => {
    if (!dirty) return;
    const prevent = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', prevent);
    return () => window.removeEventListener('beforeunload', prevent);
  }, [dirty]);
  useEffect(() => { if (focusOnOpen && window.matchMedia('(max-width: 1100px)').matches) card.current?.scrollIntoView({ block: 'start' }); }, [focusOnOpen]);
  useEffect(() => { if (confirmClose) discardButton.current?.focus(); }, [confirmClose]);
  useImperativeHandle(ref, () => ({ requestLeave, hasUnsavedChanges: () => dirty, activate(value) { switchTab(value); document.getElementById(`editor-tab-${value}`)?.focus(); } }));
  function patch(value: Partial<WordEditorDraft>) { setDraft(current => ({ ...current, ...value })); setError(''); setConfirmClose(false); leaveAction.current = null; }
  function changeCode(id: string, value: Partial<CodeDraft>) { patch({ codes: draft.codes.map(code => code.id === id ? { ...code, ...value } : code) }); }
  function requestLeave(action: () => void) {
    if (busy || saving.current) return;
    if (dirty) { leaveAction.current = action; setConfirmClose(true); }
    else action();
  }
  function requestClose() { requestLeave(onClose); }
  function switchTab(value: EditorTab) { setTab(value); body.current?.scrollTo({ top: 0 }); }
  function move(id: string, direction: number) {
    const ranks = moveCandidate(candidates, id, direction);
    const ownIds = new Set(draft.codes.map(code => code.id));
    patch({ codes: draft.codes.map(code => ({ ...code, priority: ranks[code.id] ?? code.priority })),
      priorities: { ...draft.priorities, ...Object.fromEntries(Object.entries(ranks).filter(([id]) => !ownIds.has(id))) } });
  }
  async function save() {
    if (busy || saving.current) return;
    setError(''); saving.current = true;
    try { saveWordEditor(profile, originalPhrase, draft); await onSave(draft); }
    catch (error) {
      const message = error instanceof Error && error.name !== 'ZodError' ? error.message : '请检查词条、输入码、优先级及关联标记。';
      setError(message); if (/标记|关联/.test(message)) switchTab('relations'); else switchTab('codes');
    } finally { saving.current = false; }
  }
  return <section ref={card} className="entry-editor-card" aria-label="词条编辑" data-editing="true" onKeyDown={event => {
    if (event.key === 'Escape' && !event.defaultPrevented) { event.preventDefault(); event.stopPropagation(); requestClose(); }
  }}>
      <form className="editor-form" noValidate onSubmit={event => { event.preventDefault(); void save(); }}>
        <div className="editor-header"><div className="editor-breadcrumb"><span>{profile.name} / {originalPhrase === undefined ? '新增词条' : '编辑词条'}</span><button type="button" disabled={busy} aria-label="结束编辑" title="结束编辑，回到未选择状态" onClick={requestClose}><X size={17}/></button></div>
          <label className="editor-word-label">词条<Input autoFocus={focusOnOpen} aria-label="词条" disabled={busy} value={draft.phrase} onChange={event => patch({ phrase: event.target.value })} maxLength={500} placeholder="例如：媎妹"/></label>
        </div>
        <div className="editor-tabs" role="tablist" aria-label="词条编辑内容">{tabs.map(([id, label], index) => <button key={id} id={`editor-tab-${id}`} type="button" role="tab" aria-selected={tab === id} aria-controls={`editor-panel-${id}`} tabIndex={tab === id ? 0 : -1} onClick={() => switchTab(id)} onKeyDown={event => {
          const next = event.key === 'ArrowRight' ? (index + 1) % tabs.length : event.key === 'ArrowLeft' ? (index + tabs.length - 1) % tabs.length : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : -1;
          if (next >= 0) { event.preventDefault(); switchTab(tabs[next][0]); document.getElementById(`editor-tab-${tabs[next][0]}`)?.focus(); }
        }}>{label}</button>)}</div>
        <div className="editor-body" ref={body}>
          <div id="editor-panel-codes" role="tabpanel" aria-labelledby="editor-tab-codes" hidden={tab !== 'codes'}>
            <div className="editor-section-summary"><span>{draft.codes.length} 个输入码 · {enabledCount} 个启用</span>
              <DropdownMenu.Root><DropdownMenu.Trigger asChild><Button type="button" variant="outline" disabled={busy}>批量设置<ChevronDown size={14}/></Button></DropdownMenu.Trigger><DropdownMenu.Portal><DropdownMenu.Content className="app-menu" align="end" sideOffset={5}>
                <DropdownMenu.Item onSelect={() => patch({ codes: draft.codes.map(code => ({ ...code, enabled: true })) })}>全部启用</DropdownMenu.Item>
                <DropdownMenu.Item onSelect={() => patch({ codes: draft.codes.map(code => ({ ...code, enabled: false })) })}>全部禁用</DropdownMenu.Item>
              </DropdownMenu.Content></DropdownMenu.Portal></DropdownMenu.Root>
            </div>
            <div className="editor-code-head" aria-hidden="true"><span>输入码</span><span>优先级</span><span>状态</span><span/></div>
            <div className="editor-code-list">{draft.codes.map((code, index) => <div className={'editor-code-row' + (!code.enabled ? ' is-disabled' : '')} key={code.id}>
              <Input aria-label={`输入码 ${index + 1}`} disabled={busy} value={code.code} maxLength={100} autoCapitalize="none" autoCorrect="off" spellCheck={false} placeholder={schemeFor(profile).example} onChange={event => changeCode(code.id, { code: normalizeCode(event.target.value,profile.inputScheme) })}/>
              <Input aria-label={`优先级 ${index + 1}`} disabled={busy} type="number" min={1} max={99} step={1} value={code.priority || ''} onChange={event => changeCode(code.id, { priority: Number(event.target.value) })} onKeyDown={event => {
                if (event.key === 'ArrowUp' || event.key === 'ArrowDown') { event.preventDefault(); changeCode(code.id, { priority: Math.min(99, Math.max(1, code.priority + (event.key === 'ArrowUp' ? -1 : 1))) }); }
              }}/>
              <button type="button" role="switch" className="code-enabled-switch" aria-label={`启用输入码 ${index + 1}`} aria-checked={code.enabled} disabled={busy} onClick={() => changeCode(code.id, { enabled: !code.enabled })}>
                <span className="code-switch-track" aria-hidden="true"><span/></span><span>{code.enabled ? '启用' : '禁用'}</span>
              </button>
              <button className="remove-code" type="button" aria-label={`移除输入码 ${index + 1}`} disabled={busy || draft.codes.length === 1} title={draft.codes.length === 1 ? '至少保留一个输入码' : '保存时删除此输入码'} onClick={() => patch({ codes: draft.codes.filter(item => item.id !== code.id) })}><Trash2 size={16}/></button>
            </div>)}</div>
            <Button className="editor-add-code" type="button" variant="outline" disabled={busy || draft.codes.length >= 10000} onClick={() => patch({ codes: [...draft.codes, { id: crypto.randomUUID(), code: '', priority: 1, enabled: enabledCount > 0 }] })}><Plus size={15}/>添加输入码</Button>
            <p className="editor-footnote">禁用的输入码会保留，但不参与导出。</p>
            {removedCount > 0 && <p className="editor-footnote">保存后移除 {removedCount} 个原有输入码。</p>}
            <details className="editor-format-help"><summary>{schemeFor(profile).label} · 输入码规则</summary><p>{schemeFor(profile).hint} 空输入码可用于 Gboard 和讯飞的普通词条。优先级为 1–99，数字越小越优先。</p>{profile.inputScheme==='double'&&<p>示例 nihc 为小鹤双拼「你好」；其他方案请填写对应编码。</p>}{profile.inputScheme==='wubi'&&<p>示例 vbg 为五笔 86「好」。模板不自动拆字或转换编码。</p>}</details>
          </div>
          <div id="editor-panel-relations" role="tabpanel" aria-labelledby="editor-tab-relations" hidden={tab !== 'relations'}>
            <WordRelationsEditor profile={profile} anchor={draft.relationPhrase} phrase={draft.phrase} relations={draft.relations} busy={busy} onChange={relations => patch({ relations })}/>
          </div>
          <div id="editor-panel-candidates" role="tabpanel" aria-labelledby="editor-tab-candidates" hidden={tab !== 'candidates'}>
            {codeChoices.length ? <><label className="editor-candidate-code">输入码<select aria-label="候选输入码" value={shownCode} disabled={busy} onChange={event => setCandidateCode(event.target.value)}>{codeChoices.map(code => <option key={code} value={code}>{code}</option>)}</select></label>
              <p className="editor-footnote">调整会修改同码词条的优先级，保存后一起生效。</p>
              <div className="candidate-list">{candidates.map((entry, index) => <div className={'candidate' + (!entry.enabled ? ' candidate-disabled' : '')} key={entry.id}>
                <span className="candidate-number">{entry.priority}</span><span>{entry.phrase}{draft.codes.some(code => code.id === entry.id) && <small>当前词条</small>}{!entry.enabled && <small>已禁用</small>}</span>
                <div><button type="button" aria-label={`上移 ${entry.phrase}`} disabled={busy || index === 0 || candidates.length > 99} onClick={() => move(entry.id, -1)}><ArrowUp size={15}/></button><button type="button" aria-label={`下移 ${entry.phrase}`} disabled={busy || index === candidates.length - 1 || candidates.length > 99} onClick={() => move(entry.id, 1)}><ArrowDown size={15}/></button></div>
              </div>)}</div><p className="editor-footnote">{candidates.length > 99 ? '本组超过 99 个候选，请在各词条中分别设置优先级。' : '上下移动后，本组按 1、2、3… 重新排序。'}</p>
            </> : <p className="editor-empty">先在「输入码」页填写一个输入码，再查看同码候选。</p>}
          </div>
        </div>
        <div className="editor-footer">
          {error && <p className="form-error" role="alert">{error}</p>}
          {confirmClose ? <div className="editor-discard" role="alert"><p>放弃本次未保存的修改？</p><div><Button ref={discardButton} type="button" variant="outline" onClick={() => { setConfirmClose(false); leaveAction.current = null; }}>继续编辑</Button><Button type="button" variant="outline" className="discard-button" onClick={() => { const action = leaveAction.current || onClose; leaveAction.current = null; action(); }}>放弃修改</Button></div></div>
            : <div className="editor-save-row"><span role="status">{busy ? '正在保存…' : dirty ? '有未保存的更改' : '修改后统一保存'}</span><div><Button type="button" variant="outline" disabled={busy} onClick={requestClose}>取消</Button><Button disabled={busy || (!dirty && originalPhrase !== undefined)} type="submit">{busy ? '保存中…' : '保存更改'}</Button></div></div>}
        </div>
      </form>
    </section>;
});

export function EmptyWordEditor({ profileName }: { profileName: string }) {
  return <section className="entry-editor-card" aria-label="词条编辑" data-editing="false">
    <div className="editor-form">
      <div className="editor-header"><div className="editor-breadcrumb"><span>{profileName} / 编辑词条</span></div>
        <label className="editor-word-label">词条<Input aria-label="词条" value="" disabled readOnly/></label>
      </div>
      <div className="editor-tabs" role="tablist" aria-label="词条编辑内容">{tabs.map(([id, label]) => <button key={id} id={`editor-tab-${id}`} type="button" role="tab" aria-selected={id === 'codes'} aria-controls={id === 'codes' ? 'editor-panel-codes' : undefined} disabled>{label}</button>)}</div>
      <div className="editor-body"><div id="editor-panel-codes" role="tabpanel" aria-labelledby="editor-tab-codes">
        <div className="editor-section-summary"><span>0 个输入码 · 0 个启用</span><Button type="button" variant="outline" disabled>批量设置<ChevronDown size={14}/></Button></div>
        <div className="editor-code-head" aria-hidden="true"><span>输入码</span><span>优先级</span><span>状态</span><span/></div>
        <div className="editor-code-empty"/>
        <Button className="editor-add-code" type="button" variant="outline" disabled><Plus size={15}/>添加输入码</Button>
        <p className="editor-footnote">禁用的输入码会保留，但不参与导出。</p>
      </div></div>
      <div className="editor-footer"><div className="editor-save-row"><span role="status">未选择词条</span><div><Button type="button" variant="outline" disabled>取消</Button><Button type="button" disabled>保存更改</Button></div></div></div>
    </div>
  </section>;
}
