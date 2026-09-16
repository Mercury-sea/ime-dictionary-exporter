import type { Entry, Profile, Relation } from './lexicon';

// Relations refer to exact phrases within a profile, so multiple input codes share a mark.
export function relationsForEntries(relations:Relation[]|undefined,entries:Entry[],rename?:{from:string;to:string}):Relation[]|undefined {
 if(!relations)return undefined;
 const words=new Set(entries.map(e=>e.phrase)),seen=new Set<string>();
 return relations.flatMap(relation=>{
  const phrases=[...new Set(relation.phrases.map(word=>rename&&word===rename.from&&!words.has(word)?rename.to:word))].filter(word=>words.has(word));
  if(phrases.length<2)return [];
  const key=JSON.stringify([relation.kind,[...phrases].sort()]);
  if(seen.has(key))return [];
  seen.add(key);return [{...relation,phrases}];
 });
}
export function withEntries(profile:Profile,entries:Entry[],rename?:{from:string;to:string}):Profile {
 const relations=relationsForEntries(profile.relations,entries,rename);
 return {...profile,entries,...(relations?{relations}:{})};
}
export function relationIndex(relations:Relation[]=[]){
 const index=new Map<string,Relation[]>();
 for(const relation of relations)for(const phrase of relation.phrases){
  const list=index.get(phrase)||[];list.push(relation);index.set(phrase,list);
 }
 return index;
}
