import {useEffect,useRef,useState} from 'react';
import {databaseName} from './storage';

export type Columns=[number,number,number,number,number];
export type SheetWidth='default'|'full'|number;
type Preferences={width:SheetWidth;columns:Columns|null;hideDirectory:boolean;hideLookup:boolean};
const key=databaseName()+':table-layout-v1';
const defaults:Preferences={width:'default',columns:null,hideDirectory:false,hideLookup:false};
export const columnNames=['词条','关联标记','输入码','词条状态','操作'] as const;
const clamp=(n:number,min:number,max:number)=>Math.max(min,Math.min(n,max));
function isWidth(value:unknown):value is SheetWidth{return value==='default'||value==='full'||(typeof value==='number'&&Number.isFinite(value)&&value>0);}
function readPreferences():Preferences{
 try{
  const p=JSON.parse(localStorage.getItem(key)||'null');if(!p||typeof p!=='object')return defaults;
  const cols=p.columns,valid=Array.isArray(cols)&&cols.length===5&&cols.every(n=>typeof n==='number'&&Number.isFinite(n)&&n>0&&n<=1)&&Math.abs(cols.reduce((a,b)=>a+b,0)-1)<0.005;
  return {width:isWidth(p.width)?p.width:'default',columns:valid?cols as Columns:null,hideDirectory:p.hideDirectory===true,hideLookup:p.hideLookup===true};
 }catch{return defaults;}
}
// An explicit table width wins. Panels that won't fit have an equivalent compact entry point.
export function workspaceWidths(max:number,min:number,width:SheetWidth,hideDirectory:boolean,hideLookup:boolean){
 const desired=clamp(width==='default'?1100:width==='full'?max:width,min,max);
 const reserve=width==='default'?Math.min(desired,846):desired;
 const leftSpace=192,rightSpace=238; // panel + its 12px gutter
 const canDirectory=max>=960&&max-leftSpace>=reserve;
 const directory=!hideDirectory&&canDirectory;
 const canLookup=max>=960&&max-(directory?leftSpace:0)-rightSpace>=reserve;
 const lookup=!hideLookup&&canLookup;
 const sides=(directory?leftSpace:0)+(lookup?rightSpace:0);
 const actual=Math.min(desired,max-sides);
 return {directory,lookup,canDirectory,canLookup,actual,outer:actual+sides};
}
export function useTableLayout(){
 const [prefs,setPrefs]=useState(readPreferences),last=useRef(prefs),[failed,setFailed]=useState(false);
 const [viewport,setViewport]=useState(()=>document.documentElement.clientWidth);
 useEffect(()=>{
  const size=()=>setViewport(document.documentElement.clientWidth);
  const o=new ResizeObserver(size);o.observe(document.documentElement);window.addEventListener('resize',size);size();
  const sync=(e:StorageEvent)=>{if(e.key===null||e.key===key){const next=readPreferences();last.current=next;setPrefs(next);setFailed(false);}};
  window.addEventListener('storage',sync);return()=>{o.disconnect();window.removeEventListener('resize',size);window.removeEventListener('storage',sync);};
 },[]);
 // Match the existing page margins; keep the chosen desktop width when the window narrows.
 const margin=viewport<=650?0:viewport<=900?20:36;
 const max=Math.max(1,viewport-margin),min=Math.min(max,720,Math.max(320,Math.floor(max*.78)));
 const rails=workspaceWidths(max,min,prefs.width,prefs.hideDirectory,prefs.hideLookup);
 function update(change:Partial<Preferences>){
  const next={...last.current,...change};last.current=next;setPrefs(next);
  try{localStorage.setItem(key,JSON.stringify(next));setFailed(false);}catch{setFailed(true);}
 }
 return {prefs,actual:rails.actual,rails,min,max,failed,choose:(width:SheetWidth)=>update({width}),setColumns:(columns:Columns|null)=>update({columns}),foldDirectory:(hideDirectory:boolean)=>update({hideDirectory}),foldLookup:(hideLookup:boolean)=>update({hideLookup})};
}
export type TableLayout=ReturnType<typeof useTableLayout>;
// Leave each header and both row actions usable, including after a desktop layout is opened on a phone.
export function minima(room:number):Columns{
 const base:Columns=room<580?[46,42,70,50,58]:[82,78,124,76,78];
 const factor=Math.min(1,room/base.reduce((a,b)=>a+b,0));
 return base.map(v=>v*factor) as Columns;
}
export function shares(widths:Columns):Columns{const sum=widths.reduce((a,b)=>a+b,0);return widths.map(n=>n/sum) as Columns;}
export function fitColumns(weights:Columns,room:number):Columns{
 const floors=minima(room),fitted:Columns=[0,0,0,0,0];let free=room,open=[0,1,2,3,4];
 while(open.length){
  const total=open.reduce((n,i)=>n+weights[i],0),pinned=open.filter(i=>weights[i]/total*free<floors[i]-.001);
  if(!pinned.length){for(const i of open)fitted[i]=Math.max(0,weights[i]/total*free);break;}
  for(const i of pinned){fitted[i]=floors[i];free-=floors[i];}
  open=open.filter(i=>!pinned.includes(i));
 }
 return fitted;
}
export function moveBoundary(cols:Columns,i:number,delta:number):Columns{
 const floors=minima(cols.reduce((a,b)=>a+b,0)),next=[...cols] as Columns;
 // A narrow automatic layout can start below a preferred floor; it must not jump on the first movement.
 const low=Math.min(cols[i],floors[i])-cols[i],high=cols[i+1]-Math.min(cols[i+1],floors[i+1]);
 const move=clamp(delta,low,high);next[i]+=move;next[i+1]-=move;return next;
}
