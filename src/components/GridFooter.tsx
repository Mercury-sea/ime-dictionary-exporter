import {ChevronLeft,ChevronRight} from 'lucide-react';
import {pageSizes} from '@/lib/page-size';
import {TableWidth} from './TableWidth';
import type {TableLayout} from '@/lib/table-layout';
type Props={layout:TableLayout;editing:boolean;size:number;failed:boolean;total:number;match:number;page:number;pages:number;locked:boolean;onSize:(n:number)=>void;onPage:(n:number)=>void};
function links(page:number,count:number){
 const keep=new Set([0,count-1,page-1,page,page+1]);
 if(page<3){keep.add(1);keep.add(2);}if(page>=count-3){keep.add(count-2);keep.add(count-3);}
 const ns=[...keep].filter(n=>n>=0&&n<count).sort((a,b)=>a-b),result:(number|string)[]=[];
 ns.forEach((n,i)=>{if(i&&n-ns[i-1]===2)result.push(n-1);else if(i&&n-ns[i-1]>2)result.push('gap-'+n);result.push(n);});return result;
}
export function GridFooter(p:Props){
 return <footer className="gi-under"><div className="rg-footer-left"><span>{p.match===p.total?'共 '+p.total.toLocaleString()+' 个词条':'筛出 '+p.match.toLocaleString()+' / '+p.total.toLocaleString()+' 个词条'}</span>
 <select aria-label="每页词条数" value={p.size} disabled={p.locked} onChange={e=>p.onSize(Number(e.target.value))}>{pageSizes.map(n=><option value={n} key={n}>每页 {n} 条</option>)}</select></div>
 <div className="table-footer-middle">{p.editing?<small className="rg-keys"><span className="gi-mouse">Enter 保存 · Esc 取消</span><span className="gi-touch">点 ✓ 保存 · 点 × 取消</span></small>:<TableWidth layout={p.layout} disabled={p.locked}/>}</div>
 <nav aria-label="词表分页" className="gi-pager"><button aria-label="上一页" disabled={p.locked||p.page<=0} onClick={()=>p.onPage(p.page-1)}><ChevronLeft size={16}/></button>
 {links(p.page,p.pages).map(n=>typeof n==='number'?<button key={n} className="rg-number" aria-label={'第 '+(n+1)+' 页'} aria-current={n===p.page?'page':undefined} disabled={p.locked} onClick={()=>p.onPage(n)}>{n+1}</button>:<span className="rg-gap" aria-hidden="true" key={n}>…</span>)}
 <button aria-label="下一页" disabled={p.locked||p.page+1>=p.pages} onClick={()=>p.onPage(p.page+1)}><ChevronRight size={16}/></button><span className="rg-page-count">{p.page+1} / {p.pages}</span></nav>{p.failed&&<small>本次选择未能记住。</small>}</footer>;
}
