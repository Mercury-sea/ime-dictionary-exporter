import {useEffect,useRef,useState} from 'react';
import {Plus,Trash2} from 'lucide-react';
import {Dialog,DialogContent,DialogTitle,DialogHeader,DialogDescription} from '@/components/ui/dialog';
import {type Profile,type Relation} from '@/lib/lexicon';
import {type CodeDraft} from '@/lib/word-groups';
import {savePhraseSheet} from '@/lib/phrase-sheet';
import {pausedWords} from '@/lib/word-status';
import {schemeFor,normalizeCode} from '@/lib/input-schemes';
import {WordRelationsEditor} from './WordRelationsEditor';
import {PriorityField} from './PriorityField';
type Props={profile:Profile;original?:string;busy:boolean;close:()=>void;save:(p:Profile,word:string)=>Promise<void>;remove:(original:string,el:HTMLElement)=>void;openExisting:(w:string)=>void};
const emptyCode=():CodeDraft=>({id:crypto.randomUUID(),code:'',priority:1,enabled:true});
export function PhraseSheet(p:Props){
 const fresh=p.original===undefined,[name,setName]=useState(p.original||''),[on,setOn]=useState(fresh||!pausedWords(p.profile).has(p.original!));
 const [codes,setCodes]=useState<CodeDraft[]>(()=>fresh?[emptyCode()]:p.profile.entries.filter(e=>e.phrase===p.original).map(({id,code,priority,enabled})=>({id,code,priority,enabled})));
 const [relations,setRelations]=useState<Relation[]>(p.profile.relations||[]),[anchor]=useState(()=>p.original||crypto.randomUUID()),[tab,setTab]=useState<'codes'|'marks'>('codes');
 const [error,report]=useState(''),[checked,setChecked]=useState(false),[pending,setPending]=useState<null|string>(null),[dirty,setDirty]=useState(false);
 const submitLock=useRef(false),leaving=useRef<()=>void>(()=>{}),first=useRef<HTMLInputElement>(null);
 const exists=!!name.trim()&&name.trim()!==p.original&&p.profile.entries.some(e=>e.phrase===name.trim());
 const duplicate=codes.some((e,i)=>codes.slice(0,i).some(o=>normalizeCode(o.code,p.profile.inputScheme)===normalizeCode(e.code,p.profile.inputScheme)));
 function mark(){setDirty(true);report('');}
 function patch(id:string,val:Partial<CodeDraft>){mark();setCodes(s=>s.map(c=>c.id===id?{...c,...val}:c));}
 function leave(action:()=>void){if(p.busy||submitLock.current)return;if(!dirty){action();return;}leaving.current=action;setPending('leave');}
 useEffect(()=>{if(!dirty)return;const fn=(e:BeforeUnloadEvent)=>{e.preventDefault();e.returnValue='';};window.addEventListener('beforeunload',fn);return()=>window.removeEventListener('beforeunload',fn);},[dirty]);
 async function submit(){if(submitLock.current||p.busy)return;submitLock.current=true;try{const next=savePhraseSheet({...p.profile,relations:relations.map(r=>({...r,phrases:r.phrases.map(w=>w===anchor?name.trim():w)}))},p.original,name,codes,on);await p.save(next,name.trim());}catch(e){report(e instanceof Error&&e.name!=='ZodError'?e.message:'请检查词条、输入码和关联标记。');}finally{submitLock.current=false;}}
 return <Dialog open onOpenChange={open=>{if(!open){if(pending)setPending(null);else leave(p.close);}}}><DialogContent className="pw-sheet" showCloseButton={false} onOpenAutoFocus={e=>{e.preventDefault();first.current?.focus();}}><DialogHeader><DialogTitle>{fresh?'新增词条':'编辑词条'}</DialogTitle><DialogDescription>{p.profile.name}</DialogDescription></DialogHeader>
 <form onSubmit={e=>{e.preventDefault();void submit();}} onKeyDown={e=>{if(e.key==='Enter'&&(e.nativeEvent.isComposing||e.nativeEvent.keyCode===229))e.preventDefault();}}>
 <div className="pw-name-line"><label>词条<input ref={first} aria-label="词条文字" maxLength={500} value={name} onChange={e=>{mark();setName(e.target.value);setChecked(false);}} disabled={p.busy}/></label>{fresh&&<button type="button" disabled={!name.trim()||p.busy} onClick={()=>setChecked(true)}>查重</button>}<label className="pw-check"><input type="checkbox" checked={on} onChange={e=>{mark();setOn(e.target.checked);}}/>启用词条</label></div>
 {exists?<p className="pw-message" role="status">当前词库已有「{name.trim()}」。 <button type="button" onClick={()=>{const open=()=>p.openExisting(name.trim());if(codes.length>1||codes.some(c=>c.code||c.priority!==1||!c.enabled)||!on||relations.some(r=>r.phrases.includes(anchor)))leave(open);else open();}}>打开已有词条</button></p>:checked&&name.trim()?<p role="status" className="pw-message">当前词库没有同名词条。</p>:null}
 <div className="pw-tabs"><button type="button" aria-pressed={tab==='codes'} onClick={()=>setTab('codes')}>输入码</button><button type="button" aria-pressed={tab==='marks'} onClick={()=>setTab('marks')}>关联标记</button></div>
 {tab==='codes'?<><div className="pw-code-list"><div className="pw-code-head"><span>输入码</span><span>优先级</span><span>启用</span><span/></div>{codes.map((c,i)=><div key={c.id} className="pw-code-row"><input aria-label={'输入码 '+(i+1)} value={c.code} maxLength={100} autoCapitalize="none" spellCheck={false} onChange={e=>patch(c.id,{code:e.target.value})}/><PriorityField label={'优先级 '+(i+1)} value={String(c.priority||'')} disabled={p.busy} change={s=>patch(c.id,{priority:Number(s)})}/><input type="checkbox" aria-label={'启用输入码 '+(i+1)} checked={c.enabled} onChange={e=>patch(c.id,{enabled:e.target.checked})}/><button type="button" className="pw-remove" aria-label={'移除输入码 '+(i+1)} disabled={codes.length===1||p.busy} onClick={()=>setPending(c.id)}><Trash2 size={15}/></button></div>)}</div>
 <button type="button" disabled={p.busy} onClick={()=>{mark();setCodes(s=>[...s,emptyCode()]);}}><Plus size={14}/>添加输入码</button><p className="pw-note">{schemeFor(p.profile).hint} 优先级 1 最高。</p>{on&&!codes.some(c=>c.enabled)&&<p className="pw-message">词条已启用；至少启用一个输入码才会导出。</p>}{duplicate&&<p role="status" className="pw-error">这个词条有重复的输入码。</p>}</>:<WordRelationsEditor profile={p.profile} anchor={anchor} phrase={name} relations={relations} busy={p.busy} onChange={rs=>{mark();setRelations(rs);}}/>}
 {error&&<p role="alert" className="pw-error">{error}</p>}
 {pending?<div className="pw-confirm" role="alert"><strong>{pending==='leave'?'放弃未保存的修改？':'移除这个输入码？'}</strong><button type="button" onClick={()=>setPending(null)}>取消</button><button type="button" className="pw-danger" onClick={()=>{if(pending==='leave')leaving.current();else{mark();setCodes(s=>s.filter(c=>c.id!==pending));}setPending(null);}}>{pending==='leave'?'放弃修改':'确认移除'}</button></div>:
 <div className="pw-dialog-actions">{!fresh&&<button type="button" className="pw-danger" disabled={p.busy} onClick={e=>p.remove(p.original!,e.currentTarget)}>删除词条</button>}<span/><button type="button" disabled={p.busy} onClick={()=>leave(p.close)}>取消</button><button type="submit" className="pw-primary" disabled={p.busy||exists||duplicate||!name.trim()}>{fresh?'添加词条':'保存修改'}</button></div>}
 </form></DialogContent></Dialog>;
}
