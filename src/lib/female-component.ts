import data from './female-components.json';

// 预先生成字符表，查询只做集合判断；不在浏览器中加载或递归解析整本字典。
const femaleCharacters = new Set(data.characters);

export function containsFemaleComponent(phrase: string): boolean {
  // for…of 按完整 Unicode 字符遍历，生僻字不会被拆成两段。
  for (const character of phrase) {
    if (femaleCharacters.has(character)) return true;
    const code = character.codePointAt(0)!;
    // 仅对兼容汉字和女部首符号做查询归一化，不改写原词条或导出内容。
    if (character === '⼥' || (code >= 0xf900 && code <= 0xfaff) || (code >= 0x2f800 && code <= 0x2fa1f)) {
      if (femaleCharacters.has(character.normalize('NFKC'))) return true;
    }
  }
  return false;
}
