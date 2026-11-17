import {carryWordStatus} from './word-status';
import { relationKey, relationLabel, type Entry, type Profile, type Relation } from './lexicon';

// 标记按词语关联；删除一个输入码时，其他输入码仍保留同一标记。
export function relationsForEntries(relations:Relation[]|undefined,entries:Entry[],rename?:{from:string;to:string}):Relation[]|undefined {
 if(!relations)return undefined;
 const words=new Set(entries.map(e=>e.phrase)),seen=new Set<string>();
 return relations.flatMap(relation=>{
  const phrases=[...new Set(relation.phrases.map(word=>rename&&word===rename.from&&!words.has(word)?rename.to:word))].filter(word=>words.has(word));
  if(phrases.length<(relation.kind==='custom'?1:2))return [];
  const key=relationKey({...relation,phrases});
  if(seen.has(key))return [];
  seen.add(key);return [{...relation,phrases}];
 });
}
export function withEntries(profile:Profile,entries:Entry[],rename?:{from:string;to:string}):Profile {
 const relations=relationsForEntries(profile.relations,entries,rename);
 return {...profile,entries,...carryWordStatus(profile,entries,rename),...(relations?{relations}:{})};
}
export function relationIndex(relations:Relation[]=[]){
 const index=new Map<string,Relation[]>();
 for(const relation of relations)for(const phrase of relation.phrases){
  const list=index.get(phrase)||[];list.push(relation);index.set(phrase,list);
 }
 return index;
}

export type RelationSummary = { kind: Relation['kind']; label: string; targets: string[] };

// 只收集当前词语直接参与的关系；合并同类展示时不推断其他词语之间的关系。
export function summarizeRelations(phrase: string, relations: Relation[]): RelationSummary[] {
 const summaries = new Map<string, RelationSummary>();
 for (const relation of relations) {
  if (!relation.phrases.includes(phrase)) continue;
  const label = relationLabel(relation), key = JSON.stringify([relation.kind, label]);
  const summary = summaries.get(key) || { kind: relation.kind, label, targets: [] };
  if (relation.kind !== 'custom') {
   for (const target of relation.phrases) {
    if (target !== phrase && !summary.targets.includes(target)) summary.targets.push(target);
   }
  }
  summaries.set(key, summary);
 }
 return [...summaries.values()];
}

// 撤销只补回标记：保留清除后新增的标记，也不恢复已删除的词条。
export function restoreClearedRelations(profile: Profile, removed: Relation[]): Relation[] {
 const current = profile.relations || [];
 const keys = new Set(current.map(relationKey)), ids = new Set(current.map(relation => relation.id));
 const restored = (relationsForEntries(removed, profile.entries) || []).filter(relation => !keys.has(relationKey(relation))).map(relation => {
  const id = ids.has(relation.id) ? crypto.randomUUID() : relation.id;
  ids.add(id);
  return { ...relation, id };
 });
 return [...current, ...restored];
}
