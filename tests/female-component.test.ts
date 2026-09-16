import assert from 'node:assert/strict';
import { containsFemaleComponent } from '../src/lib/female-component';
import presets from '../src/lib/presets.json';

// 覆盖女字本身、左右/上下/包围结构、多层部件，以及预置词库以外的新词。
for (const phrase of ['女','她们','媎妹','妅','妙','安全','怒气','囡','威风','魏','按键','楼层','𡛱']) {
  assert.equal(containsFemaleComponent(phrase), true, phrase);
}
// 只按字形判断，不能按性别含义或同义/异体关系推断。
for (const phrase of ['', '玅', '黴', '母', '男', '雌', '雄', '夫', '公', '海', 'nu', 'nü', '😀']) {
  assert.equal(containsFemaleComponent(phrase), false, phrase);
}
assert.equal(containsFemaleComponent('⼥'), true, '康熙女部首符号');
assert.equal(containsFemaleComponent('女'), true, '兼容汉字女');
assert.equal(containsFemaleComponent('😀𡛱abc'), true, '完整遍历补充平面字符');

// 与已经独立核对过的预置词库结果对照，防止生成表或后续更新漏字。
const before = JSON.stringify(presets);
const expected = '㛓㜲女奶她好妇妈妏妜妳妹妻姐姝姥姪姮姰姼威娇娡娥娬娭娮婃婋婙婞婺媂媊媎媓媖媳媻嫄';
const allCharacters = [...new Set(presets.flatMap(p => p.entries.flatMap(e => [...e.phrase])))];
assert.equal(allCharacters.filter(containsFemaleComponent).sort().join(''), expected);
assert.deepEqual(presets.map(p => p.entries.filter(e => containsFemaleComponent(e.phrase)).length), [114,89,87,114,89,112,89]);
assert.equal(JSON.stringify(presets), before, '检索不改写词库');
console.log('PASS 含女筛选：直接与嵌套结构、生僻字、兼容字、排除语义推断、七方案核对、不改写词库');
