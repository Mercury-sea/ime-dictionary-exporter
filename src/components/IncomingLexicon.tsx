import {useRef,useState} from 'react';
import {FileUp} from 'lucide-react';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription,DialogFooter} from './ui/dialog';
import {Button} from './ui/button';
import {readIncoming,readIncomingText,type Incoming} from '@/lib/incoming';
type Props={current:string;names:string[];busy:boolean;canNew:boolean;close:()=>void;save:(data:Incoming,name:string,merge:boolean)=>Promise<void>};
export function IncomingLexicon(p:Props){
 const [mode,setMode]=useState<'file'|'text'>('file'),[text,setText]=useState(''),[data,setData]=useState<Incoming|null>(null),[filename,setFilename]=useState(''),[name,setName]=useState(''),[merge,setMerge]=useState(false),[error,setError]=useState(''),[reading,setReading]=useState(false);const token=useRef(0);
 const pending=p.busy||reading;
 function reset(){token.current++;setData(null);setError('');setReading(false);setName('');setFilename('');}
 function prepare(d:Incoming,title:string){if(!d.entries.length)throw new Error('文件中没有可导入的词条。');setData(d);let base=title.slice(0,36)||'导入的词库',next=base;for(let i=2;p.names.includes(next);i++)next=base+' '+i;setName(next);}
 async function file(f:File){reset();const t=token.current;setReading(true);setFilename(f.name);try{const d=await readIncoming(f);if(t===token.current)prepare(d,f.name.replace(/\.[^.]+$/,''));}catch(e){if(t===token.current)setError((e as Error).message);}finally{if(t===token.current)setReading(false);}}
 async function submit(){setError('');if(!data)return;if(!merge&&(!name.trim()||p.names.includes(name.trim()))){setError('请填写尚未使用的词库名称。');return;}try{await p.save(data,name.trim(),merge);}catch(e){setError((e as Error).message);}}
 return <Dialog open onOpenChange={v=>{if(!v&&!p.busy)p.close();}}><DialogContent className="flow-dialog flow-import"><DialogHeader><DialogTitle>导入外部词库</DialogTitle><DialogDescription>先核对词条，再决定单独打开还是并入当前词库。</DialogDescription></DialogHeader>
 <div className="flow-tabs" aria-label="词库来源">{(['file','text'] as const).map(m=><button type="button" disabled={p.busy} aria-pressed={m===mode} key={m} onClick={()=>{if(m!==mode){reset();setMode(m);}}}>{m==='file'?'选择文件':'粘贴文本'}</button>)}</div>
 {mode==='file'?<div className="flow-file"><label><FileUp size={19}/><b>{filename||'选择词库文件'}</b><input type="file" aria-label="选择词库文件" accept=".zip,.txt,.tsv,.ini" disabled={pending} onChange={e=>{const f=e.target.files?.[0];if(f)void file(f);e.target.value='';}}/></label><small>Gboard 个人字典 ZIP / TXT、电脑搜狗 TXT、QQ 短语 INI、Tab 分隔文本。</small></div>:<div className="flow-paste"><label>词库文本<textarea autoFocus value={text} onChange={e=>{setText(e.target.value);reset();}} placeholder={'输入码\t词条\t优先级（可不填）'}/></label><button className="flow-outline" disabled={!text.trim()||pending} onClick={()=>{try{reset();prepare(readIncomingText(text),'导入的词库');}catch(e){setError((e as Error).message);}}}>预览词条</button></div>}
 {reading&&<p role="status">正在读取文件…</p>}{data&&<><section className="flow-preview" aria-label="导入预览"><b>{data.label} · {new Set(data.entries.map(e=>e.phrase)).size} 个词条</b><small>{data.entries.length} 条输入记录{data.duplicates?' · 已合并 '+data.duplicates+' 条重复记录':''}</small><ul>{data.entries.slice(0,3).map(e=><li key={e.id}><span>{e.phrase}</span><code>{e.code||'无输入码'}</code></li>)}</ul></section>
 <fieldset className="flow-dest"><legend>导入到哪里</legend><label><input type="radio" name="destination" checked={!merge} onChange={()=>setMerge(false)}/>单独打开为新词库</label><label><input type="radio" name="destination" checked={merge} onChange={()=>setMerge(true)}/>并入「{p.current}」</label></fieldset>
 {!merge&&<label className="flow-field">词库名称<input maxLength={40} value={name} onChange={e=>setName(e.target.value)}/></label>}{(!p.canNew&&!merge)&&<p role="status">已达到 20 本上限，可以并入当前词库。</p>}</>}
 {error&&<p role="alert" className="gi-error">{error}</p>}<DialogFooter><Button variant="outline" disabled={p.busy} onClick={p.close}>取消</Button><Button disabled={!data||pending||(!merge&&!p.canNew)} onClick={()=>void submit()}>{merge?'确认并入':'导入并打开'}</Button></DialogFooter></DialogContent></Dialog>;
}
