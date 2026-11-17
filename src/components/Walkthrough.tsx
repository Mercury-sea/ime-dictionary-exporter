import {useLayoutEffect,useRef,useState} from 'react';
import {Dialog as R} from 'radix-ui';
type Rect={x:number;y:number;w:number;h:number;top:number;left:number};
type Step={target:string;title:string;body:string};
function stepsFor(hasWords:boolean,hasRows:boolean):Step[]{
 return [
  {target:'.flow-current',title:'浏览词库',body:'先看词表。在左侧目录选另一本；看不到目录时，点「切换词库」。有自己的文件也可以点「导入词库」。'},
  {target:'.flow-filters',title:'查找词条',body:'在词表上方输入词语或输入码即可筛选。要单独查一个码，打开「同码查询」：结果只按当前词库的优先级排列。'},
  hasRows?{target:'.gi-table tbody tr',title:'修改词条',body:'双击词语可以改名，双击输入码标签可以改编码和优先级。用触屏时，点行末的「编辑」。'}:
   hasWords?{target:'.gi-empty',title:'返回词表',body:'当前没有符合条件的词条。点「清除筛选」可以回到完整词表，再选择要编辑的词。'}:
    {target:'.gi-empty',title:'添加第一个词条',body:'点「添加第一个词条」，填好词语和输入码。保存后，它就会出现在这张表里。'},
  {target:'.table-width-trigger',title:'调整词表宽度',body:'用「调整宽度」拉宽或收窄整张表。只想给输入码多留一点空间，可以直接拖动表头分隔线。'},
  {target:'.flow-export',title:'导出到输入法',body:(hasWords?'点「导出这本词库」，选好输入法，再下载文件。':'添加词条后，就能从这里选择输入法并下载文件。')+'只需要几个词时，先勾选它们，再从「批量操作」导出。'}
 ];
}
export function Walkthrough({close,hasWords,hasRows,onReturnFocus}:{close:()=>void;hasWords:boolean;hasRows:boolean;onReturnFocus:()=>void}){
 const [i,set]=useState(0),[rect,pos]=useState<Rect|null>(null),panel=useRef<HTMLDivElement>(null);
 const steps=stepsFor(hasWords,hasRows),step=steps[i];
 useLayoutEffect(()=>{
  const grid=document.querySelector<HTMLElement>('.gi-scroll'),x=window.scrollX,y=window.scrollY,left=grid?.scrollLeft||0,top=grid?.scrollTop||0;
  return()=>{if(grid){grid.scrollLeft=left;grid.scrollTop=top;}window.scrollTo(x,y);};
 },[]);
 useLayoutEffect(()=>{
  const target=document.querySelector<HTMLElement>(step.target);if(!target)return;
  target.scrollIntoView({block:'nearest',inline:'nearest',behavior:'auto'});
  function measure(){
   if(!target)return;
   const r=target.getBoundingClientRect(),w=panel.current?.offsetWidth||Math.min(354,innerWidth-24),h=panel.current?.offsetHeight||155;
   const x=Math.max(3,Math.min(innerWidth-4,r.left)),y=Math.max(3,Math.min(innerHeight-4,r.top)),right=Math.max(x+1,Math.min(innerWidth-3,r.right)),bottom=Math.max(y+1,Math.min(innerHeight-3,r.bottom));
   const above=y-h-9,below=bottom+9;
   const next={x,y,w:right-x,h:bottom-y,left:Math.max(8,Math.min(innerWidth-w-8,x+(right-x-w)/2)),top:Math.max(8,Math.min(innerHeight-h-8,below+h+8<=innerHeight||above<8&&innerHeight-bottom>=y?below:above))};
   pos(prev=>prev&&Object.keys(next).every(key=>prev[key as keyof Rect]===next[key as keyof Rect])?prev:next);
  }
  measure();const frame=requestAnimationFrame(measure),observer=new ResizeObserver(measure);observer.observe(target);if(panel.current)observer.observe(panel.current);
  window.addEventListener('resize',measure);window.addEventListener('scroll',measure,true);return()=>{cancelAnimationFrame(frame);observer.disconnect();window.removeEventListener('resize',measure);window.removeEventListener('scroll',measure,true);};
 },[step.target]);
 return <R.Root open onOpenChange={v=>{if(!v)close();}}><R.Portal><R.Overlay className="pw-tour-overlay"/>{rect&&<div aria-hidden="true" className="pw-tour-ring" style={{left:rect.x,top:rect.y,width:rect.w,height:rect.h}}/>}
 <R.Content ref={panel} tabIndex={-1} className="pw-tour-card" style={rect?{left:rect.left,top:rect.top}:undefined} aria-label="使用指北" onOpenAutoFocus={e=>{e.preventDefault();panel.current?.focus({preventScroll:true});}} onCloseAutoFocus={e=>{e.preventDefault();onReturnFocus();}}>
 <small>使用指北 · {i+1} / {steps.length}</small><R.Title>{step.title}</R.Title><R.Description aria-live="polite">{step.body}</R.Description>
 <div><button onClick={close}>退出指北</button><span/>{i>0&&<button onClick={()=>set(i-1)}>上一步</button>}<button className="pw-primary" onClick={()=>{if(i===steps.length-1)close();else set(i+1);}}>{i===steps.length-1?'完成':'下一步'}</button></div>
 </R.Content></R.Portal></R.Root>;
}
