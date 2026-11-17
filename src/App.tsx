'use client';
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { flushSync } from 'react-dom';
import { DropdownMenu } from 'radix-ui';
import {BookOpen,Check,ChevronDown,LibraryBig,Search,Settings2,Upload,CircleHelp,Download,Flower2,Loader2,Plus,Save,ShieldCheck,Settings,X} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from '@/components/ui/alert-dialog';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Toaster, toast } from 'sonner';
import { backupDocument, parseBackup, relationKinds, type Relation, documentSchema, entrySchema, Entry, Format, formats, Lexicon, Profile } from '@/lib/lexicon';
import { exportPackage, guides, planExport } from '@/lib/export';
import { repository, databaseName, DataClearedError } from '@/lib/storage';
import {PhraseSheet} from '@/components/PhraseSheet';
import {Walkthrough} from '@/components/Walkthrough';
import {LibraryPanel} from '@/components/LibraryPanel';
import {pausedWords,setWordStatus} from '@/lib/word-status';
import { SettingsContent } from '@/components/SettingsContent';
import { useDisplayMode } from '@/lib/display-mode';
import { RelationsDialog } from '@/components/RelationsDialog';
import { relationIndex, restoreClearedRelations, withEntries } from '@/lib/relations';
import { containsFemaleComponent } from '@/lib/female-component';
import {GridFooter} from '@/components/GridFooter';
import {GridCells} from '@/components/GridCells';
import {GuidePage} from '@/components/GuidePage';
import {applyDraft,draftFor,category,type Draft,type Kind} from '@/lib/grid-edit';
import {groupEntries} from '@/lib/word-groups';
import {usePageSize} from '@/lib/page-size';
import {useTableLayout} from '@/lib/table-layout';
import {inputSchemes,normalizeCode,codeError,schemeFor,type InputScheme} from '@/lib/input-schemes';
import {mergeGboard} from '@/lib/gboard';
import {IncomingLexicon} from '@/components/IncomingLexicon';
import {builtIns,Shelf} from '@/components/Shelf';
import {BookDirectory,CodeLookup,CompactLookup} from '@/components/WorkspaceRails';
import type {Incoming} from '@/lib/incoming';

type WordDeletion={profileId:string;phrases:string[];ids:string[];batch:boolean;code?:string};
function selectedPhrases(profile:Profile,ids:string[]){const words=new Map(profile.entries.map(entry=>[entry.id,entry.phrase]));return [...new Set(ids.map(id=>words.get(id)).filter((phrase):phrase is string=>phrase!==undefined))];}
function download(data:Uint8Array|string,name:string,type='application/octet-stream') {const b=typeof data==='string'?data:Uint8Array.from(data);const url=URL.createObjectURL(new Blob([b],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);}
const err=(e:unknown)=>e instanceof Error?e.message:'操作失败，请重试。';
export default function Home() {
 const display = useDisplayMode();
 const [shelf,setShelf]=useState(false),[incoming,setIncoming]=useState(false);
 const [lookupOpen,setLookupOpen]=useState(false),[inspected,setInspected]=useState<{book:string;code:string}|null>(null);
 const lastKey=databaseName()+':last-library';
 const [sheet,setSheet]=useState<{original?:string;revision:number;profileId:string}|null>(null);
 const [tour,setTour]=useState(false);
 function endTour(){setTour(false);try{localStorage.setItem(databaseName()+':tour-v1','done');}catch{}}
 const batchRef=useRef<HTMLButtonElement>(null);
 const pagination=usePageSize(),layout=useTableLayout(),helpButton=useRef<HTMLButtonElement>(null);
 const [guide,setGuide]=useState<'read'|'new'|null>(null),[cat,setCat]=useState<'all'|InputScheme>('all');
 const [manage,setManage]=useState(false),[extra,setExtra]=useState('all');
 const [gboardLanguage,setGboardLanguage]=useState('preserve');
 const [settingsOpen,setSettingsOpen]=useState(false);
 const [cell,setCell]=useState<Draft|null>(null),[cellError,setCellError]=useState('');
 const editorTrigger=useRef<HTMLElement|null>(null);
 const settingsButton=useRef<HTMLButtonElement>(null),clearButton=useRef<HTMLButtonElement>(null);
 const [doc,setDoc]=useState<Lexicon|null>(null),[revision,setRevision]=useState(0),[busy,setBusy]=useState(false),[error,setError]=useState(''),[updated,setUpdated]=useState(''),[storageMode,setStorageMode]=useState<'local'|'memory'>('local');
 const [active,setActive]=useState(()=>{try{return localStorage.getItem(lastKey)||'full';}catch{return 'full';}}),[query,setQuery]=useState(''),[filter,setFilter]=useState('all'),[page,setPage]=useState(0),[selected,setSelected]=useState<string[]>([]);
 const [keyword,setKeyword]=useState(''),[markFilter,setMarkFilter]=useState('all');
 const [femaleOnly,setFemaleOnly]=useState(false);
 const [quietSaving,setQuietSaving]=useState(false),[quietSaveVisible,setQuietSaveVisible]=useState(false);
 const quietLock=useRef(false);
 const [relationUndo,setRelationUndo]=useState<Record<string,Relation[]>>({});
 const [sortOrder,setSortOrder]=useState('original');
 const [formError,setFormError]=useState(''),[deletion,setDeletion]=useState<WordDeletion|null>(null),[exportOpen,setExportOpen]=useState(false),[target,setTarget]=useState<Format>('sogou'),[exportScope,setExportScope]=useState('all');
 const [help,setHelp]=useState(false),[importOpen,setImportOpen]=useState(false),[bulk,setBulk]=useState(''),[restoring,setRestoring]=useState<Lexicon|null>(null);
 const deletionTrigger=useRef<HTMLElement|null>(null);
 const [relationPhrases,setRelationPhrases]=useState<string[]|null>(null);
 const relationTrigger=useRef<HTMLElement|null>(null);
 const [deletingProfile,setDeletingProfile]=useState<string|null>(null);
 const [cleared,setCleared]=useState(false),[clearOpen,setClearOpen]=useState(false);const clearChannel=useRef<BroadcastChannel|null>(null);
 const backupInput=useRef<HTMLInputElement>(null);const state=useRef({doc,revision,active,busy});state.current={doc,revision,active,busy};const lock=useRef(false);
 const profile=doc?.profiles.find(p=>p.id===active)||doc?.profiles[0];
 async function load(){setError('');try{const data=await repository.load();setDoc(data.document);setActive(current=>data.document.profiles.some(p=>p.id===current)?current:data.document.profiles[0].id);setRevision(data.revision);setUpdated(data.updatedAt);setStorageMode(repository.mode);setCleared(false);}catch(e){if(e instanceof DataClearedError)finishClear();else setError(err(e));}}
 function finishClear(){try{localStorage.removeItem(lastKey);}catch{}setActive('full');setInspected(null);setLookupOpen(false);setIncoming(false);setShelf(false);setSheet(null);setTour(false);setRelationUndo({});setDoc(null);setCleared(true);setRelationPhrases(null);setSettingsOpen(false);setClearOpen(false);setHelp(false);setCell(null);setGuide(null);setManage(false);setCat('all');setExtra('all');setBulk('');setRestoring(null);setSelected([]);setQuery('');setKeyword('');setMarkFilter('all');setFilter('all');setFemaleOnly(false);setUpdated('');setDeletion(null);setDeletingProfile(null);setImportOpen(false);setExportOpen(false);setFormError('');setError('');}
 useEffect(()=>{void load();if(typeof BroadcastChannel==='undefined')return;const channel=new BroadcastChannel(databaseName());clearChannel.current=channel;channel.onmessage=event=>{if(event.data==='cleared')finishClear();};return()=>{channel.close();clearChannel.current=null;};},[]);
 async function clearData(){if(lock.current)return;lock.current=true;setBusy(true);try{await repository.clear(state.current.revision);finishClear();clearChannel.current?.postMessage('cleared');}catch(e){if(e instanceof DataClearedError)finishClear();else toast.error(err(e));}finally{lock.current=false;setBusy(false);}}

 useEffect(()=>{if((storageMode!=='memory'&&!cell)||cleared)return;const handler=(e:BeforeUnloadEvent)=>{e.preventDefault();e.returnValue='';};window.addEventListener('beforeunload',handler);return()=>window.removeEventListener('beforeunload',handler);},[storageMode,cleared,!!cell]);
 // 小操作也使用同一保存锁，但不把全页按钮设成半透明；失败时保留原数据。
 useEffect(()=>{
  if(!quietSaving){setQuietSaveVisible(false);return;}
  const timer=setTimeout(()=>setQuietSaveVisible(true),200);
  return()=>clearTimeout(timer);
 },[quietSaving]);
 async function commit(next:Lexicon,quiet=false){
  if(lock.current)throw new Error('正在保存，请稍后再试。');
  const valid=documentSchema.parse(next);lock.current=true;quietLock.current=quiet;
  if(quiet)setQuietSaving(true);else setBusy(true);
  try{
   const result=await repository.save(valid,state.current.revision);
   flushSync(()=>{setDoc(valid);setRevision(result.revision);setUpdated(result.updatedAt);});
   return valid;
  }finally{
   lock.current=false;quietLock.current=false;
   if(quiet)setQuietSaving(false);else setBusy(false);
  }
 }
 async function changeEntries(entries:Entry[],rename?:{from:string;to:string}){const current=state.current.doc;if(!current||!profile)return;await commit({...current,profiles:current.profiles.map(p=>p.id===profile.id?withEntries(p,entries,rename):p)});}
 async function safe(action:()=>Promise<unknown>){try{await action();}catch(e){if(e instanceof DataClearedError)finishClear();else toast.error(err(e));}}
 function switchProfile(p:Profile){setInspected(null);setLookupOpen(false);try{localStorage.setItem(lastKey,p.id);}catch{}setSheet(null);setRelationPhrases(null);setActive(p.id);setQuery('');setKeyword('');setMarkFilter('all');setFilter('all');setFemaleOnly(false);setPage(0);setSelected([]);setTarget(p.format);setCell(null);setCellError('');setExtra('all');setCat(v=>v==='all'||v===category(p)?v:'all');}
 async function moveProfile(id:string,target:string,after:boolean){const current=state.current.doc;if(!current)return;const item=current.profiles.find(p=>p.id===id);if(!item||id===target)return;const profiles=current.profiles.filter(p=>p.id!==id);const index=profiles.findIndex(p=>p.id===target);if(index<0)return;profiles.splice(index+(after?1:0),0,item);if(profiles.every((p,i)=>p.id===current.profiles[i].id))return;await commit({...current,profiles});toast.success('词库顺序已保存');}
 async function renameProfile(id:string,rawName:string){
  const name=rawName.trim(),current=state.current.doc;
  if(!name||name.length>40||/[\u0000-\u001f\u007f]/.test(name))throw new Error('名称需为 1–40 个字符，不能包含换行。');
  const found=current?.profiles.find(p=>p.id===id);
  if(!current||!found)throw new Error('这个词库方案已不存在，请刷新后查看。');
  if(found.name===name)return;
  await commit({...current,profiles:current.profiles.map(p=>p.id===id?{...p,name}:p)});
  toast.success('词库名称已保存');
 }
 async function removeProfile(){const current=state.current.doc;if(!current||!deletingProfile)return;if(current.profiles.length<2)throw new Error('至少保留一个词库方案。');const index=current.profiles.findIndex(p=>p.id===deletingProfile);if(index<0)return;const shown=current.profiles.find(p=>p.id===state.current.active)||current.profiles[0];const profiles=current.profiles.filter(p=>p.id!==deletingProfile);await commit({...current,profiles});if(shown.id===deletingProfile)switchProfile(profiles[Math.min(index,profiles.length-1)]);setDeletingProfile(null);toast.success('词库方案已删除');}
 const counts=useMemo(()=>{const m=new Map<string,number>();profile?.entries.forEach(e=>{if(e.code)m.set(e.code,(m.get(e.code)||0)+1);});return m;},[profile]);
 const wordRelations=useMemo(()=>relationIndex(profile?.relations),[profile?.relations]);
 function openRelations(words:string[],el:HTMLElement){if(!cell&&!lock.current){relationTrigger.current=el;setRelationPhrases([...new Set(words)]);}}
 async function saveRelations(relations:Relation[]){const current=state.current.doc;if(!current||!profile)return;await commit({...current,profiles:current.profiles.map(p=>p.id===profile.id?{...p,relations}:p)});toast.success('关联标记已保存');}
 async function clearRelations(){
  const current=state.current.doc,source=current?.profiles.find(p=>p.id===profile?.id);
  if(!current||!source?.relations?.length)return;
  const removed=source.relations;
  await commit({...current,profiles:current.profiles.map(p=>p.id===source.id?{...p,relations:[]}:p)},true);
  setRelationUndo(previous=>({...previous,[source.id]:removed}));
 }
 async function undoClearRelations(){
  const current=state.current.doc,source=current?.profiles.find(p=>p.id===profile?.id);
  const removed=source&&relationUndo[source.id];
  if(!current||!source||!removed)return;
  const relations=restoreClearedRelations(source,removed);
  await commit({...current,profiles:current.profiles.map(p=>p.id===source.id?{...p,relations}:p)},true);
  setRelationUndo(previous=>{const next={...previous};delete next[source.id];return next;});
  toast.success('已撤销清除标记');
 }
 const hasLib=!!profile;
 const all=useMemo(()=>groupEntries(profile?.entries||[]),[profile?.entries]);
 const paused=useMemo(()=>profile?pausedWords(profile):new Set<string>(),[profile]);
 async function changeStatus(words:string[],on:boolean){const cur=state.current.doc,src=cur?.profiles.find(p=>p.id===profile?.id);if(!cur||!src)return;const updated=setWordStatus(src,words,on);if(updated!==src)await commit({...cur,profiles:cur.profiles.map(p=>p===src?updated:p)},true);}
 function startSheet(original?:string,el?:HTMLElement){if(!profile||lock.current)return;if(el)editorTrigger.current=el;setSheet({original,revision:state.current.revision,profileId:profile.id});}
 async function saveSheet(next:Profile,word:string){const cur=state.current.doc;if(!cur||!sheet||sheet.revision!==state.current.revision||sheet.profileId!==next.id)throw new Error('词库已变化，请重新打开这个词条。');
 await commit({...cur,profiles:cur.profiles.map(p=>p.id===next.id?next:p)},true);
 if(!sheet.original){resetFilters();setSortOrder('original');}else if(picked.has(sheet.original)){const old=new Set(profile!.entries.filter(e=>e.phrase===sheet.original).map(e=>e.id));setSelected(prev=>[...prev.filter(id=>!old.has(id)),...next.entries.filter(e=>e.phrase===word).map(e=>e.id)]);}
 setSheet(null);closeCell(word);toast.success(sheet.original?'词条已保存':'词条已添加');}
 const visible=useMemo(()=>{const q=query.toLowerCase();const matches=all.filter(g=>(!q||g.phrase.toLowerCase().includes(q)||g.entries.some(e=>e.code.toLowerCase().includes(q)))&&(filter==='all'||(filter==='on'?!paused.has(g.phrase):paused.has(g.phrase)))&&(extra==='all'||g.entries.some(e=>e.code&&(counts.get(e.code)||0)>1))&&(markFilter==='all'||(markFilter==='marked'?wordRelations.has(g.phrase):markFilter==='none'?!wordRelations.has(g.phrase):wordRelations.get(g.phrase)?.some(r=>r.kind===markFilter)))&&(!femaleOnly||containsFemaleComponent(g.phrase)));
  if(sortOrder!=='original'){const by=(a:Entry,b:Entry)=>(!a.code&&!!b.code?1:!!a.code&&!b.code?-1:(sortOrder==='code-desc'?-1:1)*a.code.localeCompare(b.code,'en')||a.priority-b.priority);
   const keys=new Map(matches.map(g=>[g,g.entries.reduce((a,b)=>by(a,b)<=0?a:b)]));matches.sort((a,b)=>by(keys.get(a)!,keys.get(b)!));}return matches;},[all,paused,query,filter,extra,markFilter,wordRelations,counts,femaleOnly,sortOrder]);
 const pageCount=Math.max(1,Math.ceil(visible.length/pagination.size)),currentPage=Math.min(page,pageCount-1),rows=visible.slice(currentPage*pagination.size,(currentPage+1)*pagination.size);
 function resetScroll(){const box=document.querySelector<HTMLElement>('.gi-scroll');if(box)box.scrollTop=0;}
 useEffect(()=>{resetScroll();},[currentPage,pagination.size,query,active,cat,filter,extra,markFilter,femaleOnly,sortOrder]);
 const picked=useMemo(()=>new Set(profile?selectedPhrases(profile,selected):[]),[profile,selected]);
 const exportedProfile=useMemo(()=>{if(!exportOpen||!profile)return null;const ids=new Set(selected);return exportScope==='selected'?withEntries(profile,profile.entries.filter(e=>ids.has(e.id))):profile;},[profile,exportScope,selected,exportOpen]);
 const plan=useMemo(()=>exportedProfile?planExport(exportedProfile,target):null,[exportedProfile,target]);
 const [fileDownload,setFileDownload]=useState<{url:string;name:string}|null>(null);
 useEffect(()=>{if(!exportedProfile||!plan?.entries.length){setFileDownload(null);return;}try{const name=target==='gboard'?'PersonalDictionary.zip':'词库-'+exportedProfile.name+'-'+(exportScope==='all'?'整库':'已选词条')+'-'+target+'.zip';const bytes=Uint8Array.from(exportPackage(exportedProfile,target,gboardLanguage==='preserve'?{}:{language:gboardLanguage==='all'?'':gboardLanguage}));const url=URL.createObjectURL(new Blob([bytes],{type:'application/zip'}));setFileDownload({url,name});return ()=>URL.revokeObjectURL(url);}catch(e){setFileDownload(null);toast.error(err(e));}},[exportedProfile,plan,target,gboardLanguage,exportScope]);
 const blocked=busy||quietSaving,locked=blocked||!!cell;
 function resetFilters(){setQuery('');setKeyword('');setMarkFilter('all');setFilter('all');setExtra('all');setFemaleOnly(false);setPage(0);}
 async function acceptExternal(data:Incoming,name:string,merge:boolean){
  const cur=state.current.doc,shown=cur?.profiles.find(p=>p.id===state.current.active);if(!cur||!shown)throw new Error('请重新打开词库。');
  let next:Profile;
  if(merge){
   const result=mergeGboard(shown,data.entries);if(!result.added&&!result.updated)throw new Error('这些词条与输入码都已存在，无需重复导入。');
   if(cur.profiles.reduce((sum,p)=>sum+p.entries.length,0)+result.added>10000)throw new Error('全部词库合计最多可保存 10,000 条输入记录。');next=withEntries(shown,result.entries);await commit({...cur,profiles:cur.profiles.map(p=>p.id===shown.id?next:p)});
   toast.success('已并入 '+result.added+' 条输入记录'+(result.updated?'，更新 '+result.updated+' 条语言标记':'')+(result.duplicates?'，跳过 '+result.duplicates+' 条重复记录':''));
  }else{
   if(cur.profiles.length>=20)throw new Error('最多可保存 20 本词库。');if(cur.profiles.some(p=>p.name===name))throw new Error('已有同名词库，请换个名称。');
   next={id:crypto.randomUUID(),name,description:'导入自'+data.label,format:data.target,inputScheme:'custom',entries:data.entries};
   if(cur.profiles.reduce((sum,p)=>sum+p.entries.length,0)+next.entries.length>10000)throw new Error('全部词库合计最多可保存 10,000 条输入记录。请拆分后导入。');
   await commit({...cur,profiles:[...cur.profiles,next]});toast.success('已打开「'+name+'」');
  }
  switchProfile(next);setIncoming(false);
 }
 function selectWords(words:string[],on:boolean){if(!profile||locked)return;const w=new Set(picked);for(const x of words){if(on)w.add(x);else w.delete(x);}setSelected(profile.entries.filter(e=>w.has(e.phrase)).map(e=>e.id));}
 function edit(kind:Kind,word:string,el:HTMLElement,entry?:Entry){if(!profile||locked||!hasLib)return;editorTrigger.current=el;setCellError('');setCell(draftFor(profile,revision,kind,word,entry));}
 function closeCell(word?:string){setCell(null);setCellError('');requestAnimationFrame(()=>{const r=word?Array.from(document.querySelectorAll<HTMLElement>('tr[data-phrase]')).find(r=>r.dataset.phrase===word):null;const trigger=editorTrigger.current;((trigger?.isConnected&&!trigger.matches(':disabled')?trigger:null)||r?.querySelector<HTMLElement>('.gi-word')||document.querySelector<HTMLElement>('.gi-search input'))?.focus({preventScroll:true});});}
 async function saveCell(){if(!cell||lock.current)return;try{const current=state.current.doc,src=current?.profiles.find(p=>p.id===cell.profileId);if(!current||!src||cell.revision!==state.current.revision)throw new Error('词库已变化，请取消后重新编辑。');const changed=applyDraft(src,cell);await commit({...current,profiles:current.profiles.map(p=>p.id===src.id?changed:p)},true);
  if(cell.kind==='add'&&picked.has(cell.original))setSelected(ids=>[...ids,cell.id]);if(cell.kind==='new'){resetFilters();setSortOrder('original');}closeCell(cell.kind==='new'||cell.kind==='word'?cell.phrase.trim():cell.original);toast.success(cell.kind==='new'?'词条已添加':'修改已保存');}catch(e){if(e instanceof DataClearedError)finishClear();else setCellError(err(e));}}
 function requestWordDeletion(words:string[],el:HTMLElement,batch=false){if(!profile||locked)return;const phrases=new Set(words),ids=profile.entries.filter(e=>phrases.has(e.phrase)).map(e=>e.id);if(ids.length){deletionTrigger.current=el;setDeletion({profileId:profile.id,phrases:[...phrases],ids,batch});}}

 async function confirmWordDeletion(){const current=state.current.doc,src=current?.profiles.find(p=>p.id===deletion?.profileId);if(!deletion||!current||!src)throw new Error('当前词库已不存在。');const ids=new Set(deletion.ids),changed=withEntries(src,src.entries.filter(e=>!ids.has(e.id)));await commit({...current,profiles:current.profiles.map(p=>p.id===src.id?changed:p)});setSelected(v=>v.filter(id=>!ids.has(id)));setDeletion(null);if(sheet?.original&&deletion.phrases.includes(sheet.original)&&deletion.code===undefined)setSheet(null);if(deletion.code!==undefined)closeCell(deletion.phrases[0]);toast.success(deletion.code!==undefined?'输入码已删除':'词条已删除');}
 async function create(name:string,inputScheme:InputScheme,format:Format){const cur=state.current.doc;if(!cur)return;if(cur.profiles.length>=20)throw new Error('最多可保存 20 个词库。');if(cur.profiles.some(p=>p.name===name))throw new Error('已有同名词库，请换个名称。');const p:Profile={id:crypto.randomUUID(),name,description:inputSchemes[inputScheme].label+'词库',format,inputScheme,entries:[]};await commit({...cur,profiles:[...cur.profiles,p]});switchProfile(p);setGuide(null);toast.success('已创建「'+name+'」');}
 function backup(){if(doc)download(JSON.stringify(backupDocument(doc),null,2),'词库-完整备份.json','application/json');}
 async function importBackup(file:File){try{if(file.size>64*1024*1024)throw new Error('备份文件超过 64 MB，请检查是否选错文件。');const obj=JSON.parse(await file.text());const parsed=parseBackup(obj);setRestoring(parsed);}catch(e){toast.error(e instanceof Error&&e.name!=='ZodError'&&e.name!=='SyntaxError'?e.message:'备份格式无效，或关联词不完整。请选择本站导出的 JSON 备份文件。');}}
 async function importLines(){if(!profile)return;setFormError('');try{const lines=bulk.split(/\r?\n/).filter(l=>l.trim());if(!lines.length)throw new Error('请先粘贴词条。');const entries=lines.map((l,i)=>{const cols=l.split('\t');if(cols.length<2||cols.length>3)throw new Error(`第 ${i+1} 行：输入码与词条之间请用 Tab 分隔。`);const code=normalizeCode(profile.inputScheme&&profile.inputScheme!=='custom'?cols[0].trim():cols[0],profile.inputScheme),message=codeError(code,profile.inputScheme);if(message)throw new Error(`第 ${i+1} 行：${message}`);const phrase=cols[1].trim(),sameWord=profile.entries.filter(entry=>entry.phrase===phrase);return entrySchema.parse({id:crypto.randomUUID(),code,phrase,priority:cols[2]?Number(cols[2]):1,enabled:!sameWord.length||sameWord.some(entry=>entry.enabled)});});const existing=new Set(profile.entries.map(e=>JSON.stringify([e.code,e.phrase])));const added=entries.filter(e=>{const key=JSON.stringify([e.code,e.phrase]);if(existing.has(key))return false;existing.add(key);return true;});if(!added.length)throw new Error('所有词条已存在，无需重复导入。');await changeEntries([...added,...profile.entries]);setImportOpen(false);setBulk('');toast.success(`已添加 ${added.length} 条，跳过 ${entries.length-added.length} 条重复项`);}catch(e){setFormError(err(e));}}
 if(cleared)return <main className="loading-screen cleared-screen"><span className="brand-mark"><ShieldCheck size={28}/></span><h1>词库数据已清除</h1><p>{storageMode==='memory'?'当前临时会话已清空。':'此处保存的方案、词条及排序已清除。'}</p><p>可以关闭此页面，并删除本地使用包文件夹。</p><Button disabled={busy} onClick={()=>{setBusy(true);void repository.restart().then(load).catch(e=>setError(err(e))).finally(()=>setBusy(false));}}>重新打开默认词库</Button>{error&&<p role="alert">{error}</p>}</main>;
 if(!doc)return <main className="loading-screen"><span className="brand-mark"><Flower2 size={28}/></span><h1>多平台输入法自定义词库导出器</h1>{error?<><p role="alert">{error}</p><Button onClick={load}>重新载入</Button><Button variant="outline" onClick={()=>download(repository.recoveryText(),'词库恢复数据.json','application/json')}>下载原始保存数据</Button><Button variant="outline" onClick={()=>void repository.startTemporary().then(()=>load())}>在临时会话中打开默认词库</Button></>:<><Loader2 className="animate-spin"/><p>正在载入词库…</p></>}</main>;
 if(!profile)return null;
 const {directory,lookup,canDirectory,canLookup}=layout.rails;
 const setLookupCode=(code:string)=>setInspected({book:profile.id,code});
 const ranks=(book:Profile,values:Record<string,number>)=>{void safe(async()=>{
  const current=state.current.doc?.profiles.find(x=>x.id===book.id);
  if(locked||lock.current||state.current.active!==book.id||current!==book)return;
  await changeEntries(current.entries.map(e=>Object.hasOwn(values,e.id)?{...e,priority:values[e.id]}:e));
 });};
 const lookupProps={profile,code:inspected?.book===profile.id?inspected.code:'',setCode:setLookupCode,locked,save:ranks};
 const openDirectory=()=>{if(canDirectory&&layout.prefs.hideDirectory){layout.foldDirectory(false);}else{setCat('all');setShelf(true);}};
 const openLookup=()=>{if(canLookup&&layout.prefs.hideLookup){layout.foldLookup(false);}else{setLookupOpen(true);}};
 return <div style={{'--rg-width':layout.actual+'px','--work-outer':(guide&&!tour?layout.actual:layout.rails.outer)+'px'} as CSSProperties} className={'gi-app rg-app flow-app'+(guide&&!tour?' rg-reading':'')} aria-busy={blocked} onClickCapture={e=>{if(quietLock.current){e.preventDefault();e.stopPropagation();}}}>
 <Toaster position="top-center" richColors theme={display.resolved}/>
 <header className="gi-top"><div className="rg-top-inner"><div className="gi-brand"><BookOpen size={30} strokeWidth={1.65} aria-hidden="true"/>词库编辑器</div><div className="gi-actions"><span className="gi-local" role="status" title="词库自动保存在当前浏览器"><Save size={17}/>{cell&&!blocked?'尚未保存':busy||quietSaveVisible?'保存中…':storageMode==='memory'?'临时会话':'本地保存'}</span>
 <button className="gi-quiet" disabled={locked} ref={helpButton} onClick={()=>setHelp(true)}><CircleHelp size={17}/>使用指北</button><button className="gi-quiet pw-settings" ref={settingsButton} disabled={locked} onClick={()=>setSettingsOpen(true)}><Settings size={17}/>设置</button></div></div></header>
 {storageMode==='memory'&&<div className="storage-warning" role="alert">当前修改仅保留到本次会话结束，关闭前请在「设置 → 备份与恢复」下载完整备份。</div>}
 {guide&&<GuidePage hidden={tour} key={guide} create={guide==='new'} initial={guide==='new'?(cat==='all'?'pinyin':cat):category(profile)} target={profile.format} back={()=>setGuide(null)} busy={blocked} save={create}/>}
 {(!guide||tour)&&<div className="work-spread" data-left={directory} data-right={lookup}>
 {directory&&<BookDirectory profiles={doc.profiles} active={profile.id} locked={locked} choose={p=>{if(p.id!==profile.id)switchProfile(p);}} fold={()=>layout.foldDirectory(true)} filter={()=>{setCat('all');setShelf(true);}} manage={()=>setManage(true)}/>}
 <main className="gi-pad" aria-label="词条管理">
 <section className="flow-current" aria-label="当前词库">
 <div className="flow-current-text"><div className="flow-eyebrow"><LibraryBig size={14}/><span>{builtIns.has(profile.id)?'内置词库':'我的词库'}</span></div>
 <div className="flow-title"><h1>{profile.name}</h1>{!directory&&<button className="flow-switch" disabled={locked} onClick={openDirectory}>切换词库<ChevronDown size={14}/></button>}</div>
 <p>{profile.description}</p></div><div className="flow-main-actions"><button className="flow-export" disabled={locked||!all.length} onClick={()=>{setTarget(profile.format);setExportScope('all');setExportOpen(true);}}><Download size={17}/>导出这本词库</button>
 <div className="flow-alt"><button disabled={locked} onClick={()=>setIncoming(true)}><Upload size={14}/>导入词库</button><span aria-hidden="true"/><button disabled={locked||doc.profiles.length>=20} onClick={()=>{setCat('all');setGuide('new');}}><Plus size={15}/>新建词库</button></div></div></section>
 <section className="flow-table-head" aria-label="词表工具"><div className="flow-count"><h2>词表</h2><span>{all.length} 个词条<i>·</i>{profile.entries.filter(e=>e.code).length} 个输入码</span></div>
 <div className="gi-toolbar"><div className="gi-actions"><button disabled={locked} onClick={e=>startSheet(undefined,e.currentTarget)}><Plus size={15}/>新增词条</button>
 <button disabled={locked} onClick={()=>{setImportOpen(true);setFormError('');}}>批量添加</button>{!directory&&<button className="pw-library-button" disabled={locked} onClick={()=>setManage(true)}><Settings2 size={14}/>词库管理</button>}{!lookup&&<button className="pw-library-button" disabled={locked} onClick={openLookup}><Search size={14}/>同码查询</button>}</div></div></section>
 <section className="gi-filters flow-filters" aria-label="搜索与筛选"><form className="flow-search-row" role="search" onSubmit={e=>{e.preventDefault();setQuery(keyword);setPage(0);}}>
 <label className="rg-search-field"><span className="sr-only">搜索词条</span><span className="gi-search"><Search size={16} aria-hidden="true"/><input type="search" aria-label="搜索词语或输入码" placeholder="搜索词语或输入码" autoComplete="off" disabled={locked||!hasLib} value={keyword} onChange={e=>{setKeyword(e.target.value);if(!(e.nativeEvent as InputEvent).isComposing){setQuery(e.target.value);setPage(0);}}} onCompositionEnd={e=>{setQuery(e.currentTarget.value);setPage(0);}} onKeyDown={e=>{if(e.key==='Enter'&&(e.nativeEvent.isComposing||e.nativeEvent.keyCode===229))e.preventDefault();}}/>{keyword&&<button type="button" aria-label="清空搜索" onClick={()=>{setKeyword('');setQuery('');setPage(0);}}><X size={13}/></button>}</span></label> <div className="pw-filter-options" aria-label="筛选条件"><button type="button" disabled={locked||!hasLib} aria-pressed={extra==='shared'} aria-label="与其它词条同码" title="与其它词条同码" onClick={()=>{setExtra(extra==='shared'?'all':'shared');setPage(0);}}>同码词条</button><button type="button" disabled={locked||!hasLib} aria-pressed={femaleOnly} onClick={()=>{setFemaleOnly(!femaleOnly);setPage(0);}}>含女字部件</button></div></form><div className="flow-filter-row"><label>词条状态<select aria-label="词条状态筛选" value={filter} disabled={locked||!hasLib} onChange={e=>{setFilter(e.target.value);setPage(0);}}><option value="all">全部</option><option value="on">启用</option><option value="off">停用</option></select></label> <label>关联标记<select aria-label="关联标记筛选" value={markFilter} disabled={locked||!hasLib} onChange={e=>{setMarkFilter(e.target.value);setPage(0);}}><option value="all">全部</option><option value="marked">已标记</option><option value="none">未标记</option>{Object.entries(relationKinds).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label> <label className="rg-sort">排序<select aria-label="排列顺序" value={sortOrder} disabled={locked||!hasLib} onChange={e=>{setSortOrder(e.target.value);setPage(0);}}><option value="original">原有顺序</option><option value="code">输入码 A → Z</option><option value="code-desc">输入码 Z → A</option></select></label>
 {(query||filter!=='all'||extra!=='all'||femaleOnly||markFilter!=='all'||sortOrder!=='original')&&<button className="flow-reset" disabled={locked} onClick={()=>{resetFilters();setSortOrder('original');}}>重置</button>}</div></section>
 {hasLib?<>{picked.size>0&&<div className="gi-selection"><span className="rg-picked" aria-hidden="true"><Check size={14}/></span><strong>已选 {picked.size} 个词条</strong>
 <DropdownMenu.Root><DropdownMenu.Trigger asChild><button ref={batchRef} disabled={locked}>批量操作<ChevronDown size={13}/></button></DropdownMenu.Trigger><DropdownMenu.Portal><DropdownMenu.Content className="app-menu" align="start" sideOffset={4}>
 <DropdownMenu.Item onSelect={()=>{if(batchRef.current)openRelations([...picked],batchRef.current);}}>标记关联</DropdownMenu.Item><DropdownMenu.Item onSelect={()=>void safe(()=>changeStatus([...picked],true))}>启用词条</DropdownMenu.Item><DropdownMenu.Item onSelect={()=>void safe(()=>changeStatus([...picked],false))}>停用词条</DropdownMenu.Item><DropdownMenu.Item onSelect={()=>{setTarget(profile.format);setExportScope('selected');setExportOpen(true);}}>导出已选词条</DropdownMenu.Item><DropdownMenu.Separator/><DropdownMenu.Item className="danger-menu-item" onSelect={()=>{if(batchRef.current)requestWordDeletion([...picked],batchRef.current,true);}}>批量删除</DropdownMenu.Item></DropdownMenu.Content></DropdownMenu.Portal></DropdownMenu.Root>
 <button disabled={locked} onClick={()=>setSelected([])}>取消选择</button><small className="rg-selection-tip">单击词条选择 · 双击改名</small></div>}
 <GridCells inspect={setLookupCode} layout={layout} remove={(w,el)=>requestWordDeletion([w],el)} key={profile.id} rows={rows} selected={picked} marks={wordRelations} paused={paused} busy={blocked} draft={cell} error={cellError} select={selectWords} open={edit} patch={v=>{setCell(d=>d?{...d,...v}:d);setCellError('');}} save={()=>void saveCell()} cancel={()=>{if(!lock.current)closeCell(cell?.original);}} status={(w,on)=>void safe(()=>changeStatus([w],on))} full={startSheet} relations={(w,el)=>openRelations([w],el)}/>
 {!rows.length&&cell?.kind!=='new'&&<div className="gi-empty">{all.length?<><p>没有符合条件的词条。</p><button className="gi-quiet" onClick={resetFilters}>清除筛选</button></>:<><p>这本词库还没有词条。</p><button className="flow-outline" disabled={locked} onClick={e=>startSheet(undefined,e.currentTarget)}>添加第一个词条</button></>}</div>}
 <GridFooter layout={layout} editing={!!cell} total={all.length} match={visible.length} size={pagination.size} failed={pagination.saveFailed} page={currentPage} pages={pageCount} locked={locked} onPage={n=>{setPage(n);resetScroll();}} onSize={n=>{setPage(Math.floor(currentPage*pagination.size/n));pagination.choose(n);}}/>
 </>:<div className="gi-empty"><p>还没有这个类别的词库。</p><button className="gi-quiet" disabled={doc.profiles.length>=20} onClick={()=>setGuide('new')}>在此类别新建词库</button></div>}</main>
 {lookup&&!lookupOpen&&<CodeLookup {...lookupProps} fold={()=>layout.foldLookup(true)}/>}</div>}
 {lookupOpen&&<CompactLookup {...lookupProps} close={()=>setLookupOpen(false)}/>}
 {shelf&&<Shelf profiles={doc.profiles} active={profile.id} filter={cat} setFilter={setCat} close={()=>setShelf(false)} choose={p=>{if(p.id!==profile.id)switchProfile(p);setShelf(false);}}/>}
 {incoming&&<IncomingLexicon current={profile.name} names={doc.profiles.map(p=>p.name)} busy={blocked} canNew={doc.profiles.length<20} close={()=>setIncoming(false)} save={acceptExternal}/>}
 {manage&&<LibraryPanel key={profile.id} profiles={doc.profiles} p={profile} busy={blocked} close={()=>setManage(false)} select={p=>{if(p.id!==profile.id||!hasLib)switchProfile(p);}} move={(id,t,after)=>void safe(()=>moveProfile(id,t,after))} remove={setDeletingProfile} rename={renameProfile}
 template={async scheme=>{const invalid=profile.entries.find(e=>codeError(e.code,scheme));if(invalid)throw new Error('「'+invalid.phrase+'」的输入码不符合此模板，请先修改或选择自定义。');await commit({...doc,profiles:doc.profiles.map(p=>p.id===profile.id?{...p,inputScheme:scheme}:p)});setCat(v=>v==='all'?'all':scheme);toast.success('输入模板已保存');}}
 guide={()=>{setManage(false);setGuide('read');}} rank={async rank=>{await changeEntries(profile.entries.map(e=>rank[e.id]!==undefined?{...e,priority:rank[e.id]}:e));}} marks={saveRelations} clear={clearRelations} undo={undoClearRelations} undoCount={relationUndo[profile.id]?.length||0} find={w=>{setManage(false);resetFilters();setKeyword(w);setQuery(w);}}/>}
 {sheet&&<PhraseSheet key={sheet.profileId+'|'+(sheet.original===undefined?'new':'w:'+sheet.original)} profile={profile} original={sheet.original} busy={blocked} close={()=>{setSheet(null);closeCell(sheet.original);}} save={saveSheet} remove={(w,el)=>requestWordDeletion([w],el)} openExisting={w=>startSheet(w)}/>}
 {relationPhrases&&<RelationsDialog profile={profile} initialPhrases={relationPhrases} busy={busy} onSave={saveRelations} onClear={clearRelations} onUndoClear={undoClearRelations} undoCount={relationUndo[profile.id]?.length||0} onClose={()=>setRelationPhrases(null)} onFind={phrase=>{resetFilters();setQuery(phrase);setKeyword(phrase);setRelationPhrases(null);}} onReturnFocus={()=>{if(relationTrigger.current?.isConnected)relationTrigger.current.focus();}}/>}

 <AlertDialog open={!!deletion} onOpenChange={open=>{if(!open&&!busy)setDeletion(null);}}><AlertDialogContent onCloseAutoFocus={event=>{event.preventDefault();if(deletionTrigger.current?.isConnected)deletionTrigger.current.focus();else document.querySelector<HTMLInputElement>('.gi-search input')?.focus();}}><AlertDialogHeader><AlertDialogTitle>{deletion?.code!==undefined?'删除输入码「'+(deletion.code||'无输入码')+'」？':deletion?.batch?'批量删除这 '+deletion.phrases.length+' 个词条？':'删除词条「'+(deletion?.phrases[0]||'')+'」？'}</AlertDialogTitle><AlertDialogDescription>{deletion?.code!==undefined?'只删除「'+deletion.phrases[0]+'」的这个输入码；其它输入码和标记会保留。':'将删除所选词条的全部 '+(deletion?.ids.length||0)+' 个输入码，同时清理相应标记。删除后不能直接撤销。'}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={busy}>取消</AlertDialogCancel><AlertDialogAction variant="destructive" disabled={busy} onClick={event=>{event.preventDefault();void safe(confirmWordDeletion);}}>确认删除</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
 <AlertDialog open={!!deletingProfile} onOpenChange={open=>{if(!open&&!busy)setDeletingProfile(null);}}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>删除词库「{doc.profiles.find(p=>p.id===deletingProfile)?.name}」？</AlertDialogTitle><AlertDialogDescription>将删除这个方案及其中的 {doc.profiles.find(p=>p.id===deletingProfile)?.entries.length} 条记录，其它方案不受影响。删除后可通过之前下载的 JSON 备份恢复。</AlertDialogDescription></AlertDialogHeader><button className="text-action" onClick={backup}>先下载完整备份</button><AlertDialogFooter><AlertDialogCancel disabled={busy}>取消</AlertDialogCancel><AlertDialogAction disabled={busy} onClick={e=>{e.preventDefault();void safe(removeProfile);}}>删除整个词库</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
 <Dialog open={exportOpen} onOpenChange={setExportOpen}><DialogContent className="export-dialog trial-export"><DialogHeader><DialogTitle>{exportScope==='all'?'导出当前词库':'导出已选词条'}</DialogTitle><DialogDescription>词库：{profile.name}</DialogDescription></DialogHeader><div className="form-stack"><label>目标输入法<Select value={target} onValueChange={v=>setTarget(v as Format)}><SelectTrigger className="w-full"><SelectValue/></SelectTrigger><SelectContent>{Object.entries(formats).map(([id,name])=><SelectItem value={id} key={id}>{name}</SelectItem>)}</SelectContent></Select></label>{target==='gboard'&&<label>Gboard 词条语言<Select value={gboardLanguage} onValueChange={setGboardLanguage}><SelectTrigger className="w-full"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="preserve">保留原语言；新词条使用简体中文</SelectItem><SelectItem value="zh-CN">全部设为简体中文</SelectItem><SelectItem value="zh-TW">全部设为繁体中文</SelectItem><SelectItem value="en-US">全部设为英语</SelectItem><SelectItem value="all">全部设为所有语言</SelectItem></SelectContent></Select></label>}<section className="trial-export-summary" aria-label="导出范围与数量"><div><span>范围</span><b>{exportScope==='all'?'整个词库':'仅已选词条'} · {exportedProfile?new Set(exportedProfile.entries.map(e=>e.phrase)).size:0} 个词条</b></div><div><span>本次导出</span><b>{new Set(plan?.entries.map(e=>e.phrase)).size} 个词条 · {target==='iflytek'?'仅词语':(plan?.entries.filter(e=>e.code).length||0)+' 个输入码'}</b></div>{!!exportedProfile&&<small>停用跳过 {exportedProfile.entries.length-(plan?.entries.length||0)-(plan?.excluded.length||0)} 条记录{plan?.excluded.length?' · 格式未收录 '+plan.excluded.length+' 条':''}</small>}</section>{!!plan?.excluded.length&&<details className="exclusions"><summary>查看未导出的 {plan.excluded.length} 条</summary><div>{plan.excluded.map(({entry,reason},i)=><p key={i}><b>{entry.phrase}</b> <code>{entry.code}</code><br/><span>{reason}</span></p>)}</div></details>}{!!plan?.entries.length&&<details className="trial-export-help"><summary>查看本次导出内容</summary><div className="trial-export-rows">{plan.entries.slice(0,40).map(e=><div key={e.id}><span>{e.phrase}</span>{target!=='iflytek'&&<code>{e.code||'无快捷码'}</code>}</div>)}{plan.entries.length>40&&<small>仅预览前 40 条，下载包含全部。</small>}</div></details>}{!!plan?.notes.length&&<details className="trial-export-help"><summary>这个格式的限制</summary>{plan.notes.map(n=><p key={n}>{n}</p>)}</details>}<section className="flow-how"><h3>下载后怎么用</h3><p>{target!=='gboard'?'解压下载的 ZIP。':''}{guides[target]}</p></section><DialogFooter><Button variant="outline" onClick={()=>setExportOpen(false)}>返回词表</Button>{fileDownload?<a className="trial-download" href={fileDownload.url} download={fileDownload.name}><Download size={16}/>{target==='gboard'?'下载 Gboard 词库':'下载输入法包'}</a>:<Button disabled>下载输入法包</Button>}</DialogFooter></div></DialogContent></Dialog>
 <Dialog open={importOpen} onOpenChange={v=>{if(!busy)setImportOpen(v);}}><DialogContent className="import-dialog"><DialogHeader><DialogTitle>批量添加词条</DialogTitle><DialogDescription>添加到「{profile.name}」。每行一个输入码和词条，用 Tab 分隔。</DialogDescription></DialogHeader><div className="form-stack"><label>词条文本<textarea value={bulk} onChange={e=>setBulk(e.target.value)} placeholder={schemeFor(profile).sample} rows={6} disabled={busy}/></label><small>第三列可填优先级，省略时为 1。相同输入码与词条会跳过。</small>{formError&&<p className="form-error" role="alert">{formError}</p>}<DialogFooter><Button variant="outline" disabled={busy} onClick={()=>setImportOpen(false)}>取消</Button><Button disabled={busy||!bulk.trim()} onClick={()=>void importLines()}>添加到当前词库</Button></DialogFooter></div></DialogContent></Dialog>

 <input type="file" accept=".json,application/json" ref={backupInput} hidden onChange={e=>{const file=e.target.files?.[0];if(file)void importBackup(file);e.target.value='';}}/>
 <AlertDialog open={!!restoring} onOpenChange={open=>{if(!open)setRestoring(null);}}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>用备份替换全部词库？</AlertDialogTitle><AlertDialogDescription>备份包含 {restoring?.profiles.length} 个词库、{restoring?.profiles.reduce((n,p)=>n+p.entries.length,0)} 条词条。恢复将替换当前全部词库，建议先下载当前备份。</AlertDialogDescription></AlertDialogHeader><button className="text-action" onClick={backup}>下载当前完整备份</button><AlertDialogFooter><AlertDialogCancel disabled={busy}>取消</AlertDialogCancel><AlertDialogAction disabled={busy} onClick={e=>{e.preventDefault();void safe(async()=>{if(restoring){await commit(restoring);switchProfile(restoring.profiles[0]);setRelationUndo({});setRestoring(null);setImportOpen(false);setSettingsOpen(false);toast.success('词库已恢复');}});}}>替换并恢复</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
 <Dialog open={help} onOpenChange={setHelp}><DialogContent className="pw-help" onCloseAutoFocus={event=>{event.preventDefault();if(!tour&&!guide)helpButton.current?.focus({preventScroll:true});}}><DialogHeader><DialogTitle>使用指北</DialogTitle><DialogDescription className="sr-only">词表的常用操作和分步演示</DialogDescription></DialogHeader>
 <dl className="help-basics"><div><dt>查词</dt><dd>在搜索框里输入词语或输入码。</dd></div><div><dt>编辑</dt><dd>双击词语或输入码就能修改。用触屏时，点行末的「编辑」。</dd></div><div><dt>导出</dt><dd>点「导出这本词库」，选择输入法，再下载文件。</dd></div></dl>
 <button type="button" className="pw-primary help-replay" onClick={()=>{setHelp(false);setTour(true);}}>重播使用指北</button><button type="button" className="flow-outline" onClick={()=>{setHelp(false);setGuide('read');}}>查看输入码与优先级技巧</button></DialogContent></Dialog>
 {tour&&<Walkthrough close={endTour} hasWords={!!all.length} hasRows={!!rows.length} onReturnFocus={()=>helpButton.current?.focus({preventScroll:true})}/>}
 <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}><DialogContent className="settings-dialog" onCloseAutoFocus={event=>{event.preventDefault();settingsButton.current?.focus();}}><DialogHeader><DialogTitle>设置</DialogTitle><DialogDescription>显示模式与本地词库数据管理。</DialogDescription></DialogHeader><SettingsContent displayMode={display.mode} onDisplayMode={display.choose} saveFailed={display.saveFailed} onBackup={backup} onRestore={()=>backupInput.current?.click()} profileCount={doc.profiles.length} onClear={()=>setClearOpen(true)} clearButtonRef={clearButton} busy={busy} storageMode={storageMode}/></DialogContent></Dialog>
 <AlertDialog open={clearOpen} onOpenChange={open=>{if(!open&&!busy)setClearOpen(false);}}><AlertDialogContent onCloseAutoFocus={event=>{event.preventDefault();clearButton.current?.focus();}}><AlertDialogHeader><AlertDialogTitle>清除全部词库数据？</AlertDialogTitle><AlertDialogDescription>将清除 {doc.profiles.length} 个方案及其中的 {doc.profiles.reduce((n,p)=>n+p.entries.length,0)} 条记录，包括自定义修改与排序。清除后只能通过已下载的备份恢复。{storageMode==='memory'?'本次仅清除临时会话。':'此操作作用于当前页面使用的词库存储。'}</AlertDialogDescription></AlertDialogHeader><button className="text-action" onClick={backup} disabled={busy}>先下载完整备份</button><AlertDialogFooter><AlertDialogCancel disabled={busy}>取消</AlertDialogCancel><AlertDialogAction disabled={busy} onClick={event=>{event.preventDefault();void clearData();}}>确认清除全部数据</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
 </div>;
}
