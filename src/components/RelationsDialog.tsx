import { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { relationKinds, type Profile, type Relation, type RelationKind } from '@/lib/lexicon';

export function RelationsDialog({profile,initialPhrases,busy,onSave,onClose,onFind,onReturnFocus}:{
 profile:Profile;initialPhrases:string[];busy:boolean;onSave:(relations:Relation[])=>Promise<void>;
 onClose:()=>void;onFind:(phrase:string)=>void;onReturnFocus:()=>void;
}) {
 const [phrases,setPhrases]=useState([...new Set(initialPhrases)]),[kind,setKind]=useState<RelationKind>('related');
 const [search,setSearch]=useState(''),[editing,setEditing]=useState<string|null>(null),[error,setError]=useState(''),[showAll,setShowAll]=useState(false),[shown,setShown]=useState(20);
 const words=useMemo(()=>{
  const map=new Map<string,string[]>();
  for(const entry of profile.entries){const codes=map.get(entry.phrase)||[];if(!codes.includes(entry.code))codes.push(entry.code);map.set(entry.phrase,codes);}
  return [...map].map(([phrase,codes])=>({phrase,codes}));
 },[profile.entries]);
 const matches=words.filter(word=>!search||word.phrase.includes(search)||word.codes.some(code=>code.includes(search.toLowerCase())));
 const groups=(profile.relations||[]).filter(group=>showAll||group.phrases.some(phrase=>initialPhrases.includes(phrase)));
 function reset(){setEditing(null);setPhrases([...new Set(initialPhrases)]);setSearch('');setError('');}
 async function save(){
  setError('');
  if(phrases.length<2||phrases.length>100){setError('请选择 2–100 个不同的词语。');return;}
  const duplicate=(profile.relations||[]).some(group=>group.id!==editing&&group.kind===kind&&group.phrases.length===phrases.length&&group.phrases.every(phrase=>phrases.includes(phrase)));
  if(duplicate){setError('这些词语已有相同标记。');return;}
  const relation:Relation={id:editing||crypto.randomUUID(),kind,phrases};
  try{await onSave(editing?(profile.relations||[]).map(group=>group.id===editing?relation:group):[...(profile.relations||[]),relation]);reset();}
  catch(e){setError(e instanceof Error?e.message:'保存失败，请重试。');}
 }
 async function remove(id:string){try{await onSave((profile.relations||[]).filter(group=>group.id!==id));if(editing===id)reset();setError('');}catch(e){setError(e instanceof Error?e.message:'移除失败，请重试。');}}
 return <Dialog open onOpenChange={open=>{if(!open&&!busy)onClose();}}><DialogContent className="relations-dialog" onCloseAutoFocus={event=>{event.preventDefault();onReturnFocus();}}><DialogHeader><DialogTitle>关联词</DialogTitle><DialogDescription>词库：{profile.name}。标记不改变候选顺序，同一词语的不同输入码共用标记。</DialogDescription></DialogHeader>
  <section className="existing-relations"><div className="relation-section-title"><h3>已有标记</h3><button className="relation-text-button" onClick={()=>{setShowAll(!showAll);setShown(20);}}>{showAll?'只看所选词语':'查看全部标记'}</button></div>
   {groups.length?<div className="relation-groups">{groups.slice(0,shown).map(group=><div className="relation-group" key={group.id}>
    <div className="relation-group-heading"><span className={'relation-kind relation-'+group.kind}>{relationKinds[group.kind]}</span><div><button disabled={busy} onClick={()=>{setEditing(group.id);setKind(group.kind);setPhrases(group.phrases);setSearch('');setError('');}}>编辑</button><button disabled={busy} onClick={()=>void remove(group.id)}>移除标记</button></div></div>
    <div className="related-words">{group.phrases.map(phrase=><button key={phrase} title="在词库中查找" onClick={()=>onFind(phrase)}>{phrase}</button>)}</div>
   </div>)}{groups.length>shown&&<Button variant="ghost" onClick={()=>setShown(shown+20)}>显示更多（还有 {groups.length-shown} 组）</Button>}</div>:<p className="relation-note">暂无标记。</p>}
  </section>
  <section className="relation-form"><div className="relation-section-title"><h3>{editing?'编辑标记':'新建标记'}</h3>{editing&&<button className="relation-text-button" disabled={busy} onClick={reset}>取消编辑</button>}</div>
   <div className="relation-kind-field"><span id="relation-kind-label">关系类型</span><Select value={kind} onValueChange={value=>setKind(value as RelationKind)} disabled={busy}><SelectTrigger aria-labelledby="relation-kind-label"><SelectValue/></SelectTrigger><SelectContent>{Object.entries(relationKinds).map(([value,label])=><SelectItem value={value} key={value}>{label}</SelectItem>)}</SelectContent></Select></div>
   <p className="relation-note">{kind==='synonym'?'含义相同的词语。':kind==='related'?'含义接近，但不一定能互相替换。':'同一个字的不同写法，如「妙／玅」。'}</p>
   <div className="relation-selection" aria-label="已选词语">{phrases.map(phrase=><span key={phrase}>{phrase}<button disabled={busy} aria-label={`取消关联 ${phrase}`} onClick={()=>setPhrases(phrases.filter(word=>word!==phrase))}><X size={13}/></button></span>)}{!phrases.length&&<p className="relation-note">从下方选择词语。</p>}</div>
   <Input value={search} disabled={busy} onChange={event=>setSearch(event.target.value)} aria-label="搜索可关联词语" placeholder="搜索当前词库的词语或输入码"/>
   <div className="relation-word-list" aria-label="可关联词语">{matches.slice(0,50).map(word=><label key={word.phrase}><input type="checkbox" checked={phrases.includes(word.phrase)} disabled={busy||(!phrases.includes(word.phrase)&&phrases.length>=100)} onChange={()=>setPhrases(phrases.includes(word.phrase)?phrases.filter(phrase=>phrase!==word.phrase):[...phrases,word.phrase])}/><span>{word.phrase}</span><small>{word.codes.slice(0,2).map(code=>code||'未设置').join(' / ')}{word.codes.length>2?' …':''}</small></label>)}{!matches.length&&<p className="relation-note">没有其他匹配的词语。</p>}</div>
   {matches.length>50&&<p className="relation-note">显示前 50 个结果，可输入文字缩小范围。</p>}
   {error&&<p className="form-error" role="alert">{error}</p>}
   <div className="relation-form-footer"><span>已选 {phrases.length} 个词语</span><Button disabled={busy||phrases.length<2||phrases.length>100} onClick={()=>void save()}>{busy?'保存中…':'保存标记'}</Button></div>
  </section>
 </DialogContent></Dialog>;
}
