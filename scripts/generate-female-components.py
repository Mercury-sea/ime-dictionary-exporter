"""生成“含女部件”字符表；普通构建直接使用已生成的 JSON，无需 Python 或网络。

手动更新：下载 https://www.babelstone.co.uk/CJK/IDS.TXT 后运行：
python scripts/generate-female-components.py /path/to/IDS.TXT
资料版本改变时先校对差异，再更新 EXPECTED_SHA256，不能无检查地替换。
"""
from collections import defaultdict, deque
import hashlib
import json
from pathlib import Path
import re
import sys

EXPECTED_SHA256 = 'cc2a0a97e6a51ed6ebe59870ef2af66e83f3c3c27387d79b4441bb2d791d78b1'
ROOT = Path(__file__).resolve().parents[1]
BINARY = set('⿰⿱⿴⿵⿶⿷⿸⿹⿺⿻⿼⿽㇯')
TERNARY = set('⿲⿳')
UNARY = set('⿾⿿〾')

def component_leaves(sequence):
    """按结构读取，避免把减去、镜像或旋转的部件误当作原样存在。"""
    tokens = re.findall(r'\{\d+\}|.', sequence)
    def read(index):
        if index >= len(tokens):
            raise ValueError('拆分式不完整：' + sequence)
        token = tokens[index]
        arity = 3 if token in TERNARY else 2 if token in BINARY else 1 if token in UNARY else 0
        index += 1
        if not arity:
            return {token}, index
        leaves = set()
        for _ in range(arity):
            child, index = read(index)
            leaves.update(child)
        # 减笔、镜像、旋转不能证明仍含完整的“女”，保守停止该分支。
        return (set() if token in '㇯⿾⿿' else leaves), index
    leaves, end = read(0)
    if end != len(tokens):
        raise ValueError('拆分式有多余内容：' + sequence)
    return leaves

def generate(path):
    raw = path.read_bytes()
    digest = hashlib.sha256(raw).hexdigest()
    if digest != EXPECTED_SHA256:
        raise ValueError('资料与已核对版本不同，请先检查差异；没有改写字符表。')
    reverse = defaultdict(set)
    rows = {}
    for line in raw.decode('utf-8-sig').splitlines():
        if not line.startswith('U+'):
            continue
        code, char, *fields = line.split('\t')
        assert code == f'U+{ord(char):04X}' and char not in rows
        choices = []
        for field in fields:
            if not field.startswith('^'):
                continue # 注释列不是拆分式
            match = re.fullmatch(r'\^(.+)\$\((.+)\)', field)
            if not match:
                raise ValueError('无法识别的记录：' + line)
            sequence, regions = match.groups()
            component_leaves(sequence) # 所有拆法都先通过格式检查
            real_regions = re.sub(r'\[[^\]]+\]', '', regions)
            if real_regions and real_regions != 'X':
                choices.append((sequence, real_regions))
        # 优先 G 字形；无 G 时用资料列出的首个实际地区字形，不混入 X 假设拆法。
        selected = next((seq for seq, regions in choices if 'G' in regions), choices[0][0] if choices else char)
        rows[char] = selected
        for leaf in component_leaves(selected):
            if leaf != char:
                reverse[leaf].add(char)
    # 从“女”反向查找所有包含它的字；队列与集合也能避免循环引用。
    matched = {'女'}
    pending = deque(matched)
    while pending:
        for char in reverse[pending.popleft()]:
            if char not in matched:
                matched.add(char)
                pending.append(char)
    result = {'source': 'https://www.babelstone.co.uk/CJK/IDS.TXT',
              'sourceDate': '2025-06-27', 'sourceSha256': digest,
              'sourceEntries': len(rows), 'characters': ''.join(sorted(matched))}
    destination = ROOT / 'src/lib/female-components.json'
    destination.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'已核对 {len(rows)} 条拆分记录；生成 {len(matched)} 个含女字符，{destination.stat().st_size} 字节。')

if __name__ == '__main__':
    generate(Path(sys.argv[1]))
