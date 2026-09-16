import { Fragment, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { formats, type Format } from '@/lib/lexicon';
import { guides } from '@/lib/export';
import usage from '../../docs/使用说明.md';
import counts from '../../docs/词库数量说明.md';
import source from '../../docs/词库来源.md';

function inline(text:string):ReactNode[]{return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part,i)=>part.startsWith('**')?<strong key={i}>{part.slice(2,-2)}</strong>:part.startsWith('`')?<code key={i}>{part.slice(1,-1)}</code>:<Fragment key={i}>{part}</Fragment>);}
// Render the small, controlled Markdown subset used by the bundled help files. Text stays escaped by React.
function HelpDocument({text}:{text:string}){
 const lines=text.trim().split(/\r?\n/),blocks:ReactNode[]=[];let i=0;
 while(i<lines.length){
  const line=lines[i];if(!line.trim()){i++;continue;}
  if(/^#{1,3} /.test(line)){blocks.push(<h3 key={i}>{inline(line.replace(/^#+ /,''))}</h3>);i++;continue;}
  if(line.startsWith('|')){const start=i,rows:string[][]=[];while(i<lines.length&&lines[i].startsWith('|')){rows.push(lines[i].split('|').slice(1,-1).map(x=>x.trim()));i++;}blocks.push(<div className="guide-table" key={start}><table><thead><tr>{rows[0].map((cell,j)=><th key={j}>{inline(cell)}</th>)}</tr></thead><tbody>{rows.slice(2).map((row,j)=><tr key={j}>{row.map((cell,k)=><td key={k}>{inline(cell)}</td>)}</tr>)}</tbody></table></div>);continue;}
  if(line.startsWith('- ')){const start=i,items:string[]=[];while(i<lines.length&&lines[i].startsWith('- '))items.push(lines[i++].slice(2));blocks.push(<ul key={start}>{items.map((item,j)=><li key={j}>{inline(item)}</li>)}</ul>);continue;}
  const start=i,paragraph:string[]=[];while(i<lines.length&&lines[i].trim()&&!/^(#{1,3} |\||- )/.test(lines[i]))paragraph.push(lines[i++]);blocks.push(<p key={start}>{inline(paragraph.join(' '))}</p>);
 }
 return <div className="help-document">{blocks}</div>;
}
function licenses():{project:string;thirdParty:string}{try{return JSON.parse(document.getElementById('license-data')?.textContent||'{}');}catch{return {project:'',thirdParty:''};}}
export function HelpContent({onBackup,updated}:{onBackup:()=>void;updated:string}){
 const [section,setSection]=useState('usage');const legal=licenses();
 return <>
  <nav className="guide-menu" aria-label="指南章节">{[['usage','使用说明'],['counts','数量说明'],['source','词库来源']].map(([id,label])=><button key={id} aria-pressed={section===id} onClick={()=>setSection(id)}>{label}</button>)}</nav>
  <div key={section} className="help-content guide-body">
   {section==='usage'&&<><HelpDocument text={usage}/><h3>各输入法导入方式</h3><div className="help-formats">{Object.entries(formats).map(([id,name])=><details key={id}><summary>{name}</summary><p>{guides[id as Format]}</p></details>)}</div><small>最近保存：{updated?new Date(updated).toLocaleString('zh-CN'):'—'}</small><Button variant="outline" onClick={onBackup}>下载完整备份</Button></>}
   {section==='counts'&&<HelpDocument text={counts}/>}
   {section==='source'&&<><HelpDocument text={source}/><details className="license-details"><summary>程序许可（MIT）</summary><pre>{legal.project}</pre></details><details className="license-details"><summary>第三方组件许可</summary><pre>{legal.thirdParty}</pre></details></>}
  </div>
 </>;
}
