export const inputSchemes = {
 pinyin:{label:'全拼',summary:'完整拼音，也可使用首字母简码',hint:'使用小写字母，可加数字或英文单引号分隔音节。',example:'nihao',sample:'nihao\t你好\t1',pattern:/^[a-z0-9']*$/},
 double:{label:'双拼',summary:'按正在使用的双拼方案填写',hint:'使用小写字母、数字、英文分号或单引号；不限定为两个字符，支持多音节和简码。',example:'nihc',sample:'nihc\t你好\t1',pattern:/^[a-z0-9;']*$/},
 wubi:{label:'五笔',summary:'常规一至四码，兼容简码',hint:'使用 a–y，最多四个字母。编码请按你的五笔版本填写；扩展编码可使用自定义模板。',example:'vbg',sample:'vbg\t好\t1',pattern:/^[a-y]{0,4}$/},
 custom:{label:'自定义',summary:'自由设置快捷输入码',hint:'保留大小写，支持字母、数字、符号和其他文字；可包含空格，不可包含换行、Tab 或控制字符。',example:':hello',sample:':hello\t你好\t1',pattern:/^[^\u0000-\u001f\u007f]*$/},
} as const;
export type InputScheme=keyof typeof inputSchemes;
export function schemeFor(profile:{inputScheme?:InputScheme}){return inputSchemes[profile.inputScheme||'custom'];}
export function normalizeCode(code:string,scheme?:InputScheme){return scheme&&scheme!=='custom'?code.toLowerCase():code;}
export function codeError(code:string,scheme?:InputScheme):string|undefined{
 if(code.length>100||/[\u0000-\u001f\u007f]/.test(code))return '输入码最多 100 个字符，不能包含换行、Tab 或控制字符。';
 const template=inputSchemes[scheme||'custom'];if(!template.pattern.test(code))return `${template.label}模板：${template.hint}`;
}
