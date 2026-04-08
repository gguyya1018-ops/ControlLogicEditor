"""
build_tag_context.py
====================
cross_reference_index.json + ISA 태그 분석으로 tag_context.json 생성.

출력 형식:
{
  "SIT2681A": {
    "tag_type": "속도 송신기",
    "primary_drawing": "3-512",
    "drawing_title": "DH CIRCURATION PP-A(2)",
    "equipment": "DH 순환펌프 A(2)"
  }
}
"""

import json, re, sys
from pathlib import Path

BASE = Path(__file__).parent.parent
DATA_DIR = BASE / "data"

# ── ISA 태그 접두사 → 계기 타입 ──────────────────────────────────────────
TAG_PREFIX_MAP = {
    'TI': '온도 지시계', 'TIT': '온도 송신계기', 'TE': '온도 요소',
    'TC': '온도 제어기', 'TT': '온도 송신기', 'TCV': '온도 제어밸브',
    'TISH': '온도 지시 고경보', 'TISL': '온도 지시 저경보',
    'PI': '압력 지시계', 'PIT': '압력 송신계기', 'PE': '압력 요소',
    'PC': '압력 제어기', 'PT': '압력 송신기', 'PDI': '차압 지시계',
    'PDIS': '차압 지시 스위치', 'PCV': '압력 제어밸브',
    'FI': '유량 지시계', 'FIT': '유량 송신계기', 'FE': '유량 요소',
    'FC': '유량 제어기', 'FT': '유량 송신기', 'FCV': '유량 제어밸브',
    'LI': '레벨 지시계', 'LIT': '레벨 송신계기', 'LE': '레벨 요소',
    'LC': '레벨 제어기', 'LT': '레벨 송신기',
    'AI': '분석 지시계', 'AIT': '분석 송신계기', 'AT': '분석 송신기',
    'SIT': '속도 송신계기', 'SIC': '속도 지시 제어기', 'SI': '속도 지시계',
    'ST': '속도 송신기', 'ST': '속도 송신기',
    'ZI': '위치 지시계', 'ZT': '위치 송신기',
    'II': '전류 지시계', 'IT': '전류 송신기',
    'XV': '차단 밸브', 'HV': '핸드 밸브', 'PV': '공정 밸브', 'CV': '제어 밸브',
    'FCV': '유량 제어밸브',
    'HS': '핸드 스위치', 'HIC': '핸드 지시 제어기',
    'M': '모터', 'P': '펌프', 'K': '압축기', 'E': '열교환기',
    'ILS': '인터록 저경보', 'IPSL': '공압 저경보 스위치', 'IPSLL': '공압 저저경보 스위치',
    'IPDIS': '공압 차압 지시 스위치', 'ITISH': '인터록 온도 지시 고경보',
}

def infer_tag_type(tag: str) -> str:
    m = re.match(r'^([A-Z]+)', tag.upper())
    if not m:
        return ''
    prefix = m.group(1)
    for length in [6, 5, 4, 3, 2, 1]:
        p = prefix[:length]
        if p in TAG_PREFIX_MAP:
            return TAG_PREFIX_MAP[p]
    return ''


# ── 도면 제목 → 설비명 변환 ────────────────────────────────────────────────
# 영문 약어 → 한글 설비명
TITLE_MAP = [
    (r'DH\s+CIRCURATION\s+PP[- ]?A',  'DH 순환펌프 A'),
    (r'DH\s+CIRCURATION\s+PP[- ]?B',  'DH 순환펌프 B'),
    (r'DH\s+CIRCURATION\s+PP[- ]?C',  'DH 순환펌프 C'),
    (r'DH\s+CIRCURATION\s+PP[- ]?D',  'DH 순환펌프 D'),
    (r'DH\s+CIRCURATION\s+PP[- ]?E',  'DH 순환펌프 E'),
    (r'DH\s+CIRCURATION\s+LINE\((\d+)\)', r'DH 순환라인(\1)'),
    (r'CIRCURATION\s+LINE\((\d+)\)',   r'순환라인(\1)'),
    (r'CIRCURATION\s+LINE',            '순환라인'),
    (r'INCIN\s+COM[- ]?DI',           '소각로 공통 DI'),
    (r'INCIN\s+COM[- ]?DO',           '소각로 공통 DO'),
    (r'INCIN\s+COM[- ]?AI',           '소각로 공통 AI'),
    (r'INCIN\s+COM[- ]?AO',           '소각로 공통 AO'),
    (r'INCIN\s+(\d+)',                 r'소각로 \1'),
    (r'S[-\s]POWER\s+INLET\s+LINE',   'S-파워 공급라인'),
    (r'S[-\s]POWER\s+SUPPLY\s+LINE',  'S-파워 공급라인'),
    (r'MIRAEN\s+INLET\s+LINE',        '미래엔 공급라인'),
    (r'LC\s+COMMUNICATION',           'LC 통신'),
    (r'FCV[-\s](\w+)',                 r'유량제어밸브 \1'),
    (r'TCV[-\s](\w+)',                 r'온도제어밸브 \1'),
    (r'PCV[-\s](\w+)',                 r'압력제어밸브 \1'),
    (r'CONDITION',                     '조건 로직'),
    (r'APPARATUS',                     '기기 장치'),
    (r'DH\s+',                        'DH '),
]

def title_to_equipment(title: str) -> str:
    """도면 제목에서 설비명 추출"""
    t = title.strip()
    for pattern, replacement in TITLE_MAP:
        result = re.sub(pattern, replacement, t, flags=re.IGNORECASE)
        if result != t:
            return result.strip()
    # 매핑 없으면 원본 반환 (괄호 인덱스 제거)
    return re.sub(r'\(\d+\)\s*$', '', t).strip()


def main():
    sys.stdout.reconfigure(encoding='utf-8')

    with open(DATA_DIR / 'cross_reference_index.json', encoding='utf-8') as f:
        cross_ref = json.load(f)

    # tag → {tag_type, primary_drawing, drawing_title, equipment, all_drawings}
    tag_ctx = {}

    for entry in cross_ref:
        tag = entry.get('tag', '')
        if not tag:
            continue

        tag_type = infer_tag_type(tag)
        drawings = entry.get('drawings', [])

        # primary 도면 우선, 없으면 가장 구체적인 도면 선택
        primary = next((d for d in drawings if d.get('primary')), None)
        if not primary and drawings:
            # 구체적인 설비 도면 우선 (LINE/COMMON/CONDITION 등 일반 도면 후순위)
            GENERIC = re.compile(r'\b(LINE|COMMON|COM|CONDITION|COMMUNICATION|STATUS)\b', re.I)
            specific = [d for d in drawings if not GENERIC.search(d.get('title', ''))]
            primary = specific[0] if specific else drawings[0]

        ctx = {}
        if tag_type:
            ctx['tag_type'] = tag_type

        if primary:
            ctx['primary_drawing'] = primary.get('num', '')
            ctx['drawing_title']   = primary.get('title', '')
            ctx['equipment']       = title_to_equipment(primary.get('title', ''))

        # 참조 도면 목록 (primary 제외)
        ref_drawings = [d.get('num', '') for d in drawings if not d.get('primary') and d.get('num')]
        if ref_drawings:
            ctx['ref_drawings'] = ref_drawings

        if ctx:
            tag_ctx[tag] = ctx

    out_path = DATA_DIR / 'tag_context.json'
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(tag_ctx, f, ensure_ascii=False, indent=2)

    with_type    = sum(1 for v in tag_ctx.values() if v.get('tag_type'))
    with_drawing = sum(1 for v in tag_ctx.values() if v.get('primary_drawing'))
    print(f"완료: {out_path}")
    print(f"  태그 수: {len(tag_ctx)}")
    print(f"  계기 타입 추론: {with_type}개")
    print(f"  도면 연결: {with_drawing}개")

    # 샘플
    print("\n--- 샘플 ---")
    samples = ['SIT2681A', 'TIT2641', 'FIT9013', 'TCV9604B', 'SIC2681A']
    for s in samples:
        c = tag_ctx.get(s)
        if c:
            print(f"  {s}: {c.get('tag_type','')} / {c.get('equipment','')} [{c.get('primary_drawing','')}]")
        else:
            print(f"  {s}: 없음")


if __name__ == '__main__':
    main()
