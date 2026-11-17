import { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { relationKinds, relationKey, relationLabel, type Profile, type Relation, type RelationKind } from '@/lib/lexicon';

export function RelationsDialog({profile,initialPhrases,busy,onSave,onClose,onFind,onReturnFocus,onClear,onUndoClear,undoCount,embedded=false}:{
 profile:Profile;initialPhrases:string[];embedded?:boolean;busy:boolean;onSave:(relations:Relation[])=>Promise<void>;
 onClose:()=>void;onFind:(phrase:string)=>void;onReturnFocus:()=>void;
 onClear:()=>Promise<void>;onUndoClear:()=>Promise<void>;undoCount:number;
}) {
 const [phrases,setPhrases]=useState([...new Set(initialPhrases)]),[kind,setKind]=useState<RelationKind>('related');
 const [label,setLabel]=useState('');
 const minimum=kind==='custom'?1:2;
 const [search,setSearch]=useState(''),[editing,setEditing]=useState<string|null>(null),[error,setError]=useState(''),[showAll,setShowAll]=useState(initialPhrases.length===0),[shown,setShown]=useState(20);
 const words=useMemo(()=>{
  const map=new Map<string,string[]>();
  for(const entry of profile.entries){const codes=map.get(entry.phrase)||[];if(!codes.includes(entry.code))codes.push(entry.code);map.set(entry.phrase,codes);}
  return [...map].map(([phrase,codes])=>({phrase,codes}));
 },[profile.entries]);
 const matches=words.filter(word=>!search||word.phrase.includes(search)||word.codes.some(code=>code.includes(search.toLowerCase())));
 const groups=(profile.relations||[]).filter(group=>showAll||group.phrases.some(phrase=>initialPhrases.includes(phrase)));
 function reset(){setEditing(null);setPhrases([...new Set(initialPhrases)]);setSearch('');setError('');setLabel('');}
 async function save(){
  setError('');
  if(phrases.length<minimum||phrases.length>100){setError(`请选择 ${minimum}–100 个不同的词语。`);return;}
  if(kind==='custom'&&(!label.trim()||label.trim().length>20||/[\u0000-\u001f\u007f]/.test(label))){setError('标签需要 1–20 个字符，不能包含换行。');return;}
  const relation:Relation={id:editing||crypto.randomUUID(),kind,phrases,...(kind==='custom'?{label:label.trim()}:{})};
  const duplicate=(profile.relations||[]).some(group=>group.id!==editing&&relationKey(group)===relationKey(relation));
  if(duplicate){setError('这些词语已有相同标记。');return;}
  try{await onSave(editing?(profile.relations||[]).map(group=>group.id===editing?relation:group):[...(profile.relations||[]),relation]);reset();if(!embedded&&initialPhrases.length>1)onClose();}
  catch(e){setError(e instanceof Error?e.message:'保存失败，请重试。');}
 }
 async function remove(id:string){try{await onSave((profile.relations||[]).filter(group=>group.id!==id));if(editing===id)reset();setError('');}catch(e){setError(e instanceof Error?e.message:'移除失败，请重试。');}}
 async function clearAll(){try{await onClear();reset();}catch(e){setError(e instanceof Error?e.message:'清除失败，请重试。');}}
 async function undoClear(){try{await onUndoClear();reset();}catch(e){setError(e instanceof Error?e.message:'撤销失败，请重试。');}}
 if(!embedded&&initialPhrases.length>1) return <Dialog open onOpenChange={open=>{if(!open&&!busy)onClose();}}><DialogContent className="trial-rel" onCloseAutoFocus={e=>{e.preventDefault();onReturnFocus();}}><DialogHeader><DialogTitle>标记关联</DialogTitle><DialogDescription>{profile.name} · 已选 {phrases.length} 个词条</DialogDescription></DialogHeader><div className="trial-rel-words">{phrases.map(w=><span key={w}>{w}</span>)}</div><label className="trial-rel-field">标记类型<select value={kind} disabled={busy} onChange={e=>{setKind(e.target.value as RelationKind);setError('');}}>{Object.entries(relationKinds).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>{kind==='custom'&&<label className="trial-rel-field">标签名称<input value={label} maxLength={20} onChange={e=>setLabel(e.target.value)} /></label>}{error&&<p role="alert" className="pw-error">{error}</p>}<div className="pw-dialog-actions"><span/><Button variant="outline" onClick={onClose}>取消</Button><Button disabled={busy||phrases.length>100||(kind==='custom'&&!label.trim())} onClick={()=>void save()}>保存标记</Button></div></DialogContent></Dialog>;
 const body=<> 
  <section className="existing-relations"><div className="relation-section-title"><h3>已有标记</h3><button className="relation-text-button" onClick={()=>{setShowAll(!showAll);setShown(20);}}>{showAll?'只看所选词语':'查看全部标记'}</button></div>
   {showAll && <div className="clear-relations-row"><span>当前词库共 {profile.relations?.length||0} 组标记，包含自定义标签。</span><Button type="button" variant="outline" className="clear-relations" disabled={busy||!profile.relations?.length} onClick={()=>void clearAll()}>清除当前词库全部标记</Button></div>}
   {undoCount>0 && <div className="relation-undo" role="status"><span>已清除 {undoCount} 组标记，刷新或关闭网页前可撤销。</span><Button type="button" variant="outline" disabled={busy} onClick={()=>void undoClear()}>撤销清除</Button></div>}
   {groups.length?<div className="relation-groups">{groups.slice(0,shown).map(group=><div className="relation-group" key={group.id}>
    <div className="relation-group-heading"><span className={'relation-kind relation-'+group.kind}>{relationLabel(group)}</span><div><button disabled={busy} onClick={()=>{setEditing(group.id);setKind(group.kind);setLabel(group.label||'');setPhrases(group.phrases);setSearch('');setError('');}}>编辑</button><button disabled={busy} onClick={()=>void remove(group.id)}>移除标记</button></div></div>
    <div className="related-words">{group.phrases.map(phrase=><button key={phrase} title="在词库中查找" onClick={()=>onFind(phrase)}>{phrase}</button>)}</div>
   </div>)}{groups.length>shown&&<Button variant="ghost" onClick={()=>setShown(shown+20)}>显示更多（还有 {groups.length-shown} 组）</Button>}</div>:<p className="relation-note">暂无标记。</p>}
  </section>
  <section className="relation-form"><div className="relation-section-title"><h3>{editing?'编辑标记':'新建标记'}</h3>{editing&&<button className="relation-text-button" disabled={busy} onClick={reset}>取消编辑</button>}</div>
   <div className="relation-kind-field"><span id="relation-kind-label">标记类型</span><Select value={kind} onValueChange={value=>{setKind(value as RelationKind);setError('');}} disabled={busy}><SelectTrigger aria-labelledby="relation-kind-label"><SelectValue/></SelectTrigger><SelectContent>{Object.entries(relationKinds).map(([value,label])=><SelectItem value={value} key={value}>{label}</SelectItem>)}</SelectContent></Select></div>
   {kind==='custom'&&<label className="custom-label-field">标签名称<Input aria-label="自定义标签名称" value={label} disabled={busy} maxLength={20} onChange={event=>setLabel(event.target.value)} placeholder="例如：日常用语" list="existing-custom-labels"/><datalist id="existing-custom-labels">{[...new Set((profile.relations||[]).filter(group=>group.kind==='custom').map(group=>group.label!))].map(name=><option key={name} value={name}/>)}</datalist></label>}
   <p className="relation-note">{kind==='custom'?'自定义标签可标记 1–100 个词语，不表示它们互为同义词。':kind==='synonym'?'含义相同的词语。':kind==='related'?'含义接近，但不一定能互相替换。':'同一个字的不同写法，如「里／裏」。'}</p>
   <div className="relation-selection" aria-label="已选词语">{phrases.map(phrase=><span key={phrase}>{phrase}<button disabled={busy} aria-label={`取消关联 ${phrase}`} onClick={()=>setPhrases(phrases.filter(word=>word!==phrase))}><X size={13}/></button></span>)}{!phrases.length&&<p className="relation-note">从下方选择词语。</p>}</div>
   <Input value={search} disabled={busy} onChange={event=>setSearch(event.target.value)} aria-label="搜索可关联词语" placeholder="搜索当前词库的词语或输入码"/>
   <div className="relation-word-list" aria-label="可关联词语">{matches.slice(0,50).map(word=><label key={word.phrase}><input type="checkbox" checked={phrases.includes(word.phrase)} disabled={busy||(!phrases.includes(word.phrase)&&phrases.length>=100)} onChange={()=>setPhrases(phrases.includes(word.phrase)?phrases.filter(phrase=>phrase!==word.phrase):[...phrases,word.phrase])}/><span>{word.phrase}</span><small>{word.codes.slice(0,2).map(code=>code||'未设置').join(' / ')}{word.codes.length>2?' …':''}</small></label>)}{!matches.length&&<p className="relation-note">没有其它匹配的词语。</p>}</div>
   {matches.length>50&&<p className="relation-note">显示前 50 个结果，可输入文字缩小范围。</p>}
   {error&&<p className="form-error" role="alert">{error}</p>}
   <div className="relation-form-footer"><span>已选 {phrases.length} 个词语</span><Button disabled={busy||phrases.length<minimum||phrases.length>100||(kind==='custom'&&!label.trim())} onClick={()=>void save()}>{busy?'保存中…':'保存标记'}</Button></div>
  </section>
 </>;if(embedded)return <div className="pw-marks-pane">{body}</div>;return <Dialog open onOpenChange={open=>{if(!open&&!busy)onClose();}}><DialogContent className="relations-dialog" onCloseAutoFocus={event=>{event.preventDefault();onReturnFocus();}}><DialogHeader><DialogTitle>关联标记</DialogTitle><DialogDescription>词库：{profile.name}。标记不改变候选顺序，同一词语的不同输入码共用标记。</DialogDescription></DialogHeader>{body}</DialogContent></Dialog>;
}
