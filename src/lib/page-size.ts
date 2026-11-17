import {useState} from 'react';
import {databaseName} from './storage';
export const pageSizes=[10,20,30,50,100] as const;
const oldKey=databaseName()+':page-size',key=oldKey+':compact';
const valid=(n:number)=>pageSizes.some(size=>size===n);
export function initialPageSize(current:string|null,legacy:string|null):number{
 const next=Number(current),previous=Number(legacy);
 if(valid(next))return next;
 // 首次打开默认使用短页；本版主动选择的数量（包括 100）从此独立记住。
 return valid(previous)&&previous!==100?previous:10;
}
export function usePageSize(){
 const [size,setSize]=useState(()=>{try{return initialPageSize(localStorage.getItem(key),localStorage.getItem(oldKey));}catch{return 10;}});
 const [saveFailed,setSaveFailed]=useState(false);
 function choose(next:number){if(!valid(next))return;setSize(next);try{localStorage.setItem(key,String(next));setSaveFailed(false);}catch{setSaveFailed(true);}}
 return {size,choose,saveFailed};
}
