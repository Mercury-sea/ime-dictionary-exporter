import {useLayoutEffect,useRef,useState,type KeyboardEvent,type PointerEvent} from 'react';
import {columnNames,fitColumns,minima,moveBoundary,shares,type Columns} from '@/lib/table-layout';

type Drag={id:number;index:number;x:number;start:Columns};
type Measured={room:number;cols:Columns};
function equal(a:Measured|null,b:Measured){return a&&Math.abs(a.room-b.room)<.05&&a.cols.every((n,i)=>Math.abs(n-b.cols[i])<.05);}
export function useColumnDividers(saved:Columns|null,save:(v:Columns|null)=>void){
 const table=useRef<HTMLTableElement>(null),drag=useRef<Drag|null>(null);
 const [measured,setMeasured]=useState<Measured|null>(null),[preview,previewColumns]=useState<Columns|null>(null);
 function read():Measured|null{
  const cells=table.current?.tHead?.rows[0]?.cells;if(!cells||cells.length!==6)return null;
  const cols=Array.from(cells).slice(1).map(th=>th.getBoundingClientRect().width) as Columns;
  const room=table.current!.parentElement!.clientWidth-cells[0].getBoundingClientRect().width;
  return room>0&&cols.every(n=>n>0)?{room,cols}:null;
 }
 useLayoutEffect(()=>{
  const el=table.current;if(!el?.tHead)return;
  const measure=()=>{const next=read();if(next)setMeasured(prev=>equal(prev,next)?prev:next);};
  const obs=new ResizeObserver(measure);obs.observe(el.parentElement!);obs.observe(el);for(const th of Array.from(el.tHead.rows[0].cells))obs.observe(th);
  measure();return()=>obs.disconnect();
 },[]);
 const widths=preview||(saved&&measured?fitColumns(saved,measured.room):null);
 function start(i:number,e:PointerEvent<HTMLSpanElement>){
  if(!e.isPrimary||e.button!==0||drag.current)return;const m=read();if(!m)return;
  e.preventDefault();e.stopPropagation();e.currentTarget.focus({preventScroll:true});e.currentTarget.setPointerCapture(e.pointerId);
  drag.current={id:e.pointerId,index:i,x:e.clientX,start:m.cols};
 }
 function move(e:PointerEvent<HTMLSpanElement>){const d=drag.current;if(!d||d.id!==e.pointerId)return;e.preventDefault();previewColumns(moveBoundary(d.start,d.index,e.clientX-d.x));}
 function finish(e:PointerEvent<HTMLSpanElement>,commit:boolean){
  const d=drag.current;if(!d||d.id!==e.pointerId)return;
  drag.current=null;if(commit&&Math.abs(e.clientX-d.x)>.5)save(shares(moveBoundary(d.start,d.index,e.clientX-d.x)));previewColumns(null);
  if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);
 }
 function key(i:number,e:KeyboardEvent<HTMLSpanElement>){
  const d=e.shiftKey?32:8,delta=e.key==='ArrowLeft'?-d:e.key==='ArrowRight'?d:e.key==='Home'?-Infinity:e.key==='End'?Infinity:null;
  if(delta===null)return;const m=read();if(!m)return;e.preventDefault();e.stopPropagation();save(shares(moveBoundary(m.cols,i,delta)));
 }
 function divider(i:number){
  const cols=measured?.cols,minimum=measured&&cols?Math.round(Math.min(cols[i],minima(measured.room)[i])):0;
  const maximum=measured&&cols?Math.round(cols[i]+cols[i+1]-Math.min(cols[i+1],minima(measured.room)[i+1])):1000;
  const width=cols?Math.round(cols[i]):minimum;
  return <span className="column-divider" role="separator" tabIndex={0} aria-orientation="vertical" aria-label={'调整'+columnNames[i]+'列宽'} aria-valuemin={minimum} aria-valuemax={maximum} aria-valuenow={width} aria-valuetext={width+' 像素'} title={'拖动调整'+columnNames[i]+'列宽，也可按左右方向键'} onPointerDown={e=>start(i,e)} onPointerMove={move} onPointerUp={e=>finish(e,true)} onPointerCancel={e=>finish(e,false)} onLostPointerCapture={e=>finish(e,false)} onKeyDown={e=>key(i,e)}/>;
 }
 return {table,widths,divider};
}
