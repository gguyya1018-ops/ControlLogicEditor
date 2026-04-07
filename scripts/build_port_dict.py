"""
build_port_dict.py
==================
각 OCB/ALG 블록 근처의 실제 신호 태그를 수집하여 block_port_dict.json 생성.

접근법:
- BLOCK → 반경 내 SIGNAL/REF_SIGNAL 직접 수집 (PORT 요소 무시)
- SIGNAL 필터: 실제 ISA 계기 태그만 (IN1~IN16, OUT1~OUT16 등 포트명 제외)
- 포트 구조(어떤 포트에 연결됐는지)는 canvas 템플릿이 처리
"""

import csv, json, math, glob, re, sys
from pathlib import Path

BASE = Path(__file__).parent.parent
DATA_DIR = BASE / "data"
DRAWINGS_DIR = BASE / "drawings"

# ── 포트명 / 내부 신호명 패턴 (SIGNAL 타입에 섞여 있음) ──────────────────────
# 이 패턴에 매칭되면 실제 계기 태그가 아님 → 제외
_NOT_TAG = re.compile(
    r'^('
    r'IN\d*|OUT\d*|'                     # AND/OR 입출력
    r'PK\d+|PPR\d+|SPR\d+|'             # 내부 참조 신호
    r'[A-G]\d*|FLAG|YES|NO|'            # ALG 포트
    r'STPT|SP|PV|MV|T|NUM|DEN|H|L|'    # PID 포트
    r'ENBL|INIT|RST|SET|CLR|'           # 제어 포트
    r'Q\d*|QN|CK|D|J|K|R|S|'           # 논리 포트
    r'TRIG|HOLD|TRACK|MODE|'            # 상태 포트
    r'AUTO|MAN|CAS|'                    # 운전 모드
    r'X|Y|Z|A\d+|B\d+|C\d+'           # 계산 포트
    r')$',
    re.IGNORECASE
)

# REF_SIGNAL 패턴: D03-511-05 형식
_REF_PAT = re.compile(r'^D0*(\d+)-(\d+)-(\d+)$', re.IGNORECASE)
# OTHER 타입에서 괄호로 감싼 REF: (D03-511-05)
_REF_OTHER_PAT = re.compile(r'^\(D0*(\d+)-(\d+)-(\d+)\)$', re.IGNORECASE)
# ISA 태그 최소 조건: 글자로 시작하고 숫자 포함
_ISA_MIN = re.compile(r'^[A-Z][A-Z0-9-]*\d[A-Z0-9-]*$', re.IGNORECASE)


def is_real_tag(text: str) -> bool:
    """실제 ISA 계기 태그인지 판별"""
    t = text.strip()
    if not t or len(t) < 3:
        return False
    if _NOT_TAG.match(t):
        return False
    if not _ISA_MIN.match(t):
        return False
    return True


def parse_ref_signal(text: str) -> dict:
    m = _REF_PAT.match(text.strip())
    if m:
        return {'ref_drawing': f"{m.group(1)}-{m.group(2)}", 'ref_index': m.group(3)}
    return {}


def infer_tag_type(tag: str) -> str:
    TAG_PREFIX_MAP = {
        'TI': '온도지시계', 'TIT': '온도지시계기', 'TE': '온도요소',
        'TC': '온도제어기', 'TT': '온도송신기',
        'PI': '압력지시계', 'PIT': '압력지시계기', 'PE': '압력요소',
        'PC': '압력제어기', 'PT': '압력송신기', 'PDI': '차압지시계',
        'FI': '유량지시계', 'FIT': '유량지시계기', 'FE': '유량요소',
        'FC': '유량제어기', 'FT': '유량송신기', 'FCV': '유량제어밸브',
        'LI': '레벨지시계', 'LIT': '레벨지시계기', 'LE': '레벨요소',
        'LC': '레벨제어기', 'LT': '레벨송신기',
        'AI': '분석지시계', 'AIT': '분석지시계기', 'AT': '분석송신기',
        'XV': '차단밸브', 'HV': '핸드밸브', 'CV': '제어밸브',
        'M': '모터', 'P': '펌프', 'K': '압축기', 'E': '열교환기',
        'HS': '핸드스위치', 'HIC': '핸드지시제어기',
        'ZI': '위치지시계', 'ZT': '위치송신기',
        'SI': '속도지시계', 'ST': '속도송신기', 'SIT': '속도지시계기',
        'SIC': '속도지시제어기',
        'II': '전류지시계', 'IT': '전류송신기',
        'LS': '레벨스위치', 'TS': '온도스위치', 'PS': '압력스위치',
        'FS': '유량스위치', 'ZS': '위치스위치',
        'TSH': '고온스위치', 'TSL': '저온스위치',
        'PSH': '고압스위치', 'PSL': '저압스위치',
        'PY': '공압계산기',
    }
    m = re.match(r'^([A-Z]+)', tag.upper())
    if not m:
        return ''
    prefix = m.group(1)
    for length in [4, 3, 2, 1]:
        p = prefix[:length]
        if p in TAG_PREFIX_MAP:
            return TAG_PREFIX_MAP[p]
    return ''


def load_csv(path: str) -> list:
    for enc in ('utf-8-sig', 'utf-8', 'cp949'):
        try:
            with open(path, 'r', encoding=enc) as f:
                rows = list(csv.DictReader(f))
            return [{k.lstrip('\ufeff'): v for k, v in r.items()} for r in rows]
        except UnicodeDecodeError:
            continue
        except Exception as e:
            print(f"  [경고] {path}: {e}")
            break
    return []


def extract_drawing_number(path: Path) -> str:
    try:
        rel = path.relative_to(DRAWINGS_DIR)
        parts = rel.parts
        if parts:
            drop_part = parts[0]
            m = re.match(r'^drop_(\d+)', drop_part)
            drop_num = m.group(1) if m else '?'
            sub = parts[1] if len(parts) > 1 else ''
            return f"{drop_num}-{sub}" if sub else drop_num
    except ValueError:
        pass
    return path.parent.name


def dist(a: dict, b: dict) -> float:
    return math.sqrt((float(a['cx']) - float(b['cx']))**2 +
                     (float(a['cy']) - float(b['cy']))**2)


def process_csv(layout_path: Path) -> dict:
    """
    하나의 도면 CSV에서 블록별 신호 연결 수집.
    PORT 요소 무시, BLOCK → 인근 SIGNAL/REF_SIGNAL 직접 매핑.
    """
    rows = load_csv(str(layout_path))
    if not rows:
        return {}

    ocb_blocks = [r for r in rows if r.get('type') == 'OCB_BLOCK']
    alg_blocks = [r for r in rows if r.get('type') == 'ALG_BLOCK']
    all_blocks = ocb_blocks + alg_blocks
    if not all_blocks:
        return {}

    # 실제 ISA 태그만 추출 (포트명 / 내부 레이블 제외)
    signals = [r for r in rows if r.get('type') == 'SIGNAL'
               and is_real_tag(r.get('text', ''))]

    # REF_SIGNAL: D03-511-05 형식
    ref_signals = [r for r in rows if r.get('type') == 'REF_SIGNAL'
                   and _REF_PAT.match(r.get('text', '').strip())]

    # OTHER 타입에서 (D03-XXX-XX) 형식 변환
    other_refs = []
    for r in rows:
        if r.get('type') != 'OTHER':
            continue
        m = _REF_OTHER_PAT.match(r.get('text', '').strip())
        if m:
            norm = f"D{m.group(1)}-{m.group(2)}-{m.group(3)}"
            other_refs.append({**r, 'type': 'REF_SIGNAL', 'text': norm})

    all_signals = signals + ref_signals + other_refs
    if not all_signals:
        return {}

    drawing_num = extract_drawing_number(layout_path)

    # 블록별로 인근 신호 수집
    result = {}
    for blk in all_blocks:
        bname = blk.get('text', '')
        if not bname:
            continue

        # SIGNAL: 반경 350 이내
        # REF_SIGNAL: 반경 450 이내 (도면 엣지에 배치되는 경우 있음)
        collected = {}  # tag → {tag_type?, ref_drawing?, ref_index?}

        for sig in all_signals:
            d = dist(blk, sig)
            sig_type = sig.get('type', 'SIGNAL')
            radius = 450 if sig_type == 'REF_SIGNAL' else 350

            if d > radius:
                continue

            tag = sig.get('text', '').strip()
            if not tag:
                continue

            if tag in collected:
                continue  # 이미 수집됨

            entry = {}
            if sig_type == 'SIGNAL':
                tt = infer_tag_type(tag)
                if tt:
                    entry['tag_type'] = tt
            elif sig_type == 'REF_SIGNAL':
                ref = parse_ref_signal(tag)
                entry.update(ref)

            collected[tag] = entry

        if collected:
            result[bname] = {
                'drawing': drawing_num,
                'signals': collected,
            }

    return result


def main():
    sys.stdout.reconfigure(encoding='utf-8')

    # tag_context.json 로드
    tag_ctx_path = DATA_DIR / 'tag_context.json'
    if not tag_ctx_path.exists():
        print("tag_context.json 없음 — build_tag_context.py 먼저 실행하세요")
        tag_ctx = {}
    else:
        with open(tag_ctx_path, 'r', encoding='utf-8') as f:
            tag_ctx = json.load(f)
        print(f"태그 컨텍스트: {len(tag_ctx)}개")

    layout_files = sorted(glob.glob(str(DRAWINGS_DIR / '**' / '*_layout.csv'), recursive=True))
    print(f"처리할 도면 CSV: {len(layout_files)}개")

    port_dict = {}
    skipped = 0

    for path_str in layout_files:
        path = Path(path_str)
        result = process_csv(path)
        if not result:
            skipped += 1
            continue
        for bname, bdata in result.items():
            if bname in port_dict:
                # 기존 항목에 새 신호 추가 (중복 없이)
                existing_signals = port_dict[bname]['signals']
                for tag, tdata in bdata['signals'].items():
                    if tag not in existing_signals:
                        existing_signals[tag] = tdata
            else:
                port_dict[bname] = bdata

        print(f"  OK {path.parent.name}/{path.name}: {len(result)}개 블록")

    # tag_context로 보강 (equipment, src_drawing, tag_type)
    print("\ntag_context 병합 중...")
    for bname, bdata in port_dict.items():
        for tag, tdata in bdata['signals'].items():
            ctx = tag_ctx.get(tag, {})
            if ctx.get('equipment'):
                tdata['equipment'] = ctx['equipment']
            if ctx.get('primary_drawing') and not tdata.get('ref_drawing'):
                tdata['src_drawing'] = ctx['primary_drawing']
            if not tdata.get('tag_type') and ctx.get('tag_type'):
                tdata['tag_type'] = ctx['tag_type']

    out_path = DATA_DIR / 'block_port_dict.json'
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(port_dict, f, ensure_ascii=False, indent=2)

    total_signals = sum(len(v['signals']) for v in port_dict.values())
    with_equipment = sum(
        1 for v in port_dict.values()
        for t in v['signals'].values() if t.get('equipment')
    )
    print(f"\n완료: {out_path}")
    print(f"  블록 인스턴스: {len(port_dict)}개")
    print(f"  신호 연결: {total_signals}개")
    print(f"  설비명 확인: {with_equipment}개")
    print(f"  건너뜀: {skipped}개 파일")


if __name__ == '__main__':
    main()
