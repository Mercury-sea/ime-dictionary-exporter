import {type Profile} from './lexicon';
import {saveWordGroup,type CodeDraft} from './word-groups';
import {codeError,normalizeCode} from './input-schemes';
import {setWordStatus} from './word-status';

export function savePhraseSheet(p:Profile,original:string|undefined,name:string,codes:CodeDraft[],on:boolean):Profile{
 const phrase=name.trim();
 if(!phrase||phrase.length>500||/[\u0000-\u001f\u007f]/.test(phrase))throw new Error('请填写有效词条，最多 500 个字符。');
 if(phrase!==original&&p.entries.some(e=>e.phrase===phrase))throw new Error('当前词库已有这个词条，请打开已有词条添加输入码。');
 const seen=new Set<string>();const drafts=codes.map(d=>{const code=normalizeCode(d.code,p.inputScheme),bad=codeError(code,p.inputScheme);if(bad)throw new Error(bad);
  if(seen.has(code))throw new Error('同一词条的输入码重复。');seen.add(code);
  if(!Number.isInteger(d.priority)||d.priority<1||d.priority>99)throw new Error('优先级须为 1–99 的整数。');return {...d,code};});
 if(p.entries.filter(e=>e.phrase!==original).length+drafts.length>10000)throw new Error('每个词库最多保存 10,000 条编码记录。');
 return setWordStatus(saveWordGroup(p,original,phrase,drafts,true),[phrase],on);
}
