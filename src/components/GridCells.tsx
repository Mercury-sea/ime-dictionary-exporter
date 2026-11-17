import {useEffect,useRef,type KeyboardEvent,type ReactNode} from 'react';
import {Check,X,Trash2} from 'lucide-react';
import type {Entry,Relation} from '@/lib/lexicon';
import type {Draft,Kind} from '@/lib/grid-edit';
import type {WordGroup} from '@/lib/word-groups';
import {summarizeRelations} from '@/lib/relations';
import {PriorityField} from './PriorityField';
import {useColumnDividers} from './ColumnDividers';
import type {TableLayout} from '@/lib/table-layout';
type Props={inspect:(code:string)=>void;layout:TableLayout;rows:WordGroup[];marks:Map<string,Relation[]>;selected:Set<string>;paused:Set<string>;busy:boolean;draft:Draft|null;error:string;
 select:(words:string[],on:boolean)=>void;open:(kind:Kind,word:string,el:HTMLElement,entry?:Entry)=>void;patch:(v:Partial<Draft>)=>void;save:()=>void;cancel:()=>void;
 remove:(w:string,el:HTMLElement)=>void;status:(word:string,on:boolean)=>void;full:(w:string,el:HTMLElement)=>void;relations:(w:string,el:HTMLElement)=>void};
function Cell({label,css,disabled,edit,inspect,children}:{inspect?:()=>void;label:string;css:string;disabled:boolean;edit:(el:HTMLElement)=>void;children:ReactNode}){
 const pointer=useRef('');return <button type="button" className={css} aria-label={label} title={inspect?'单击查询同码，双击编辑':label} disabled={disabled} onPointerDown={e=>{pointer.current=e.pointerType;}} onClick={e=>{inspect?.();if(e.detail===0||pointer.current==='touch'||pointer.current==='pen')edit(e.currentTarget);}} onDoubleClick={e=>edit(e.currentTarget)} onKeyDown={e=>{if(e.key==='F2'){e.preventDefault();edit(e.currentTarget);}}}>{children}</button>;
}
function WordHit({word,checked,disabled,choose,edit}:{word:string;checked:boolean;disabled:boolean;choose:()=>void;edit:(el:HTMLElement)=>void}){
 const timer=useRef<number|undefined>(undefined),latest=useRef(choose);latest.current=choose;
 function stop(){window.clearTimeout(timer.current);timer.current=undefined;}
 useEffect(()=>{if(disabled)stop();return stop;},[disabled]);
 return <td className="pw-word-cell" onClick={e=>{if(disabled)return;if(e.detail===0){stop();latest.current();return;}stop();if(e.detail===1)timer.current=window.setTimeout(()=>{timer.current=undefined;latest.current();},350);}} onDoubleClick={e=>{if(disabled)return;stop();edit(e.currentTarget.querySelector('button')||e.currentTarget);}}>
 <button type="button" className="gi-word pw-word-hit" disabled={disabled} aria-label={'选择或编辑词条 '+word} aria-pressed={checked} title="单击选择，双击改名；空格选择，Enter 或 F2 改名" onKeyDown={e=>{if(e.key==='F2'||e.key==='Enter'){e.preventDefault();stop();edit(e.currentTarget);}}}>{word}</button></td>;
}
function Edit({p}:{p:Props}){
 const d=p.draft!,ref=useRef<HTMLInputElement>(null),composing=useRef(false);useEffect(()=>{ref.current?.focus();ref.current?.select();},[d.id]);
 function keys(e:KeyboardEvent){if(composing.current||e.nativeEvent.isComposing||e.nativeEvent.keyCode===229)return;if(e.key==='Escape'){e.preventDefault();p.cancel();}if(e.key==='Enter'&&!(e.target instanceof HTMLButtonElement)){e.preventDefault();p.save();}}
 return <div className="pw-inline" role="group" aria-label="编辑单元格" onKeyDown={keys} onCompositionStart={()=>{composing.current=true;}} onCompositionEnd={()=>{composing.current=false;}}>
 {d.kind==='word'?<input ref={ref} aria-label="词条文字" value={d.phrase} maxLength={500} disabled={p.busy} onChange={e=>p.patch({phrase:e.target.value})}/>:<><input ref={ref} aria-label="输入码内容" autoCapitalize="none" spellCheck={false} value={d.code} maxLength={100} disabled={p.busy} onChange={e=>p.patch({code:e.target.value})}/><PriorityField disabled={p.busy} value={d.priority} change={priority=>p.patch({priority})}/><label><input type="checkbox" aria-label="启用此输入码" checked={d.enabled} disabled={p.busy} onChange={e=>p.patch({enabled:e.target.checked})}/> 启用</label></>}
 <button className="gi-primary" aria-label="保存编辑" disabled={p.busy} onClick={p.save}><Check size={14}/></button><button aria-label="取消编辑" disabled={p.busy} onClick={p.cancel}><X size={14}/></button>{p.error&&<span className="gi-error" role="alert">{p.error}</span>}</div>;
}
export function GridCells(p:Props){
 const {table,widths,divider}=useColumnDividers(p.layout.prefs.columns,p.layout.setColumns);
 const locked=p.busy||!!p.draft,all=!!p.rows.length&&p.rows.every(g=>p.selected.has(g.phrase)),box=useRef<HTMLInputElement>(null);
 useEffect(()=>{if(box.current)box.current.indeterminate=!all&&p.rows.some(g=>p.selected.has(g.phrase));},[all,p.rows,p.selected]);
 return <div className="gi-scroll"><table ref={table} className="gi-table" aria-label="词条和输入码"><colgroup><col className="gi-select-col"/>{['gi-word-col','gi-mark-col','rg-code-col','rg-state-col','gi-actions-col'].map((c,i)=><col key={c} className={c} style={widths?{width:widths[i]}:undefined}/>)}</colgroup><thead><tr><th className="gi-check"><input ref={box} aria-label="选择本页词条" type="checkbox" checked={all} disabled={locked||!p.rows.length} onChange={()=>p.select(p.rows.map(g=>g.phrase),!all)}/></th><th scope="col">词条{divider(0)}</th><th scope="col">关联标记{divider(1)}</th><th scope="col">输入码 <span className="flow-rank-label">/ 优先级</span>{divider(2)}</th><th scope="col" className="rg-center">词条状态{divider(3)}</th><th scope="col">操作</th></tr></thead><tbody>
 {p.rows.map(g=>{const w=g.phrase,checked=p.selected.has(w),on=!p.paused.has(w),here=p.draft?.original===w,marks=summarizeRelations(w,p.marks.get(w)||[]);
 return <tr key={w} data-phrase={w} className={checked?'gi-selected':undefined}>
 <td className="gi-check"><input type="checkbox" checked={checked} disabled={locked} aria-label={'选择词条 '+w} onChange={()=>p.select([w],!checked)}/></td>
 {here&&p.draft?.kind==='word'?<td className="pw-word-cell"><Edit p={p}/></td>:<WordHit word={w} checked={checked} disabled={locked} choose={()=>p.select([w],!checked)} edit={el=>p.open('word',w,el)}/>}
 <td onDoubleClick={e=>{if(!locked&&e.target===e.currentTarget)p.relations(w,e.currentTarget);}}><Cell css="gi-marks" label={'编辑关联标记 '+w} disabled={locked} edit={el=>p.relations(w,el)}>{marks.length?marks.map(m=><span key={m.kind+m.label} title={m.targets.join('、')}>{m.label}{m.targets.length>0&&<small>{m.targets.length}</small>}</span>):'—'}</Cell></td>
 <td><div className="gi-tokens">{g.entries.map(e=>here&&p.draft?.kind==='code'&&p.draft.id===e.id?<Edit key={e.id} p={p}/>:<Cell key={e.id} inspect={e.code?()=>p.inspect(e.code):undefined} css={'gi-token'+(e.enabled?'':' gi-off')} disabled={locked} label={'编辑输入码 '+(e.code||'无输入码')+'，优先级 '+e.priority+'，'+(e.enabled?'启用':'停用')} edit={el=>p.open('code',w,el,e)}><span className="gi-code">{e.code||'无输入码'}</span><small>{e.priority}</small></Cell>)}</div></td>
 <td className="rg-state-cell"><button type="button" role="switch" aria-checked={on} aria-label={w+'的词条状态'} title={on?(g.entries.some(e=>e.enabled)?'停用整词，保留各码设置':'词条已启用，当前没有启用的输入码'):'启用整词，保留各码设置'} className={'pw-status '+(on?'is-on':'is-off')} disabled={locked} onClick={()=>p.status(w,!on)}>{on?'启用':'停用'}</button>{on&&!g.entries.some(e=>e.enabled)&&<small className="trial-no-codes">无启用码，不会导出</small>}</td>
 <td className="pw-edit-cell"><div className="flow-row-tools"><button className="pw-edit-link" disabled={locked} aria-label={'编辑词条 '+w} onClick={e=>p.full(w,e.currentTarget)}>编辑</button><button type="button" className="flow-delete" title={"删除词条 "+w} aria-label={"删除词条 "+w} disabled={locked} onClick={e=>p.remove(w,e.currentTarget)}><Trash2 size={14}/></button></div></td></tr>;})}</tbody></table></div>;
}
