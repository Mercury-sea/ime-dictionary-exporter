import type {Entry,Profile} from './lexicon';

function legacyPaused(entries:Entry[]){
 const words=new Set(entries.map(e=>e.phrase));for(const e of entries)if(e.enabled)words.delete(e.phrase);return words;
}
// 1.7.1 and earlier had only code-level switches. Read the old state without rewriting any code flags.
export function pausedWords(p:Profile):Set<string>{return p.disabledWords===undefined?legacyPaused(p.entries):new Set(p.disabledWords);}
export function setWordStatus(p:Profile,phrases:Iterable<string>,on:boolean):Profile{
 const present=new Set(p.entries.map(e=>e.phrase)),paused=pausedWords(p);let changed=false;
 for(const w of phrases){if(!present.has(w))continue;if(on){if(paused.delete(w))changed=true;}else if(!paused.has(w)){paused.add(w);changed=true;}}
 return changed?{...p,disabledWords:[...paused]}:p;
}
export function carryWordStatus(p:Profile,entries:Entry[],rename?:{from:string;to:string}):{disabledWords?:string[]}{
 const words=new Set(entries.map(e=>e.phrase)),kept=new Set<string>();
 for(const old of pausedWords(p)){const w=rename&&old===rename.from&&!words.has(old)?rename.to:old;if(words.has(w))kept.add(w);}
 if(p.disabledWords===undefined){const inferred=legacyPaused(entries);if(inferred.size===kept.size&&[...kept].every(w=>inferred.has(w)))return {};}
 return {disabledWords:[...kept]};
}
