"""
build_signal_context.py
=======================
모든 도면 CSV에서 PORT ↔ SIGNAL/REF_SIGNAL 매핑을 추출하여
signal_context.json을 생성합니다.

출력 형식:
{
  "drop_3_DH_Apparatus/008": {
    "page": 126,
    "blocks": {
      "ALG-0113015": {
        "block_type": "PID",
        "ports": {
          "A": { "tag": "TIT2641", "tag_type": "온도계기", "sig_type": "SIGNAL" },
          "OUT": { "tag": "D03-524-01", "sig_type": "REF_SIGNAL",
                   "ref_drawing": "3-524", "ref_index": "01" }
        }
      }
    }
  }
}
"""

import csv, json, math, glob, sys, os, re
from pathlib import Path

BASE = Path(__file__).parent.parent
DATA_DIR = BASE / "data"
DRAWINGS_DIR = BASE / "drawings"

# ── ISA 태그명 계기 타입 추론 ──────────────────────────────────────────────
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
    'XV': '차단밸브', 'HV': '핸드밸브', 'PV': '공정밸브', 'CV': '제어밸브',
    'M': '모터', 'P': '펌프', 'K': '압축기', 'E': '열교환기',
    'HS': '핸드스위치', 'HIC': '핸드지시제어기',
    'ZI': '위치지시계', 'ZT': '위치송신기',
    'SI': '속도지시계', 'ST': '속도송신기',
    'II': '전류지시계', 'IT': '전류송신기',
}

def infer_tag_type(tag: str) -> str:
    """ISA 태그명에서 계기 타입 추론."""
    # 숫자 제거하고 앞부분 알파벳 추출
    m = re.match(r'^([A-Z]+)', tag.upper())
    if not m:
        return ''
    prefix = m.group(1)
    # 긴 접두사부터 시도
    for length in [4, 3, 2, 1]:
        p = prefix[:length]
        if p in TAG_PREFIX_MAP:
            return TAG_PREFIX_MAP[p]
    return ''


def parse_ref_signal(text: str) -> dict:
    """
    REF_SIGNAL 형식 파싱.
    예: 'D03-524-01' → {'ref_drawing': '3-524', 'ref_index': '01'}
    예: 'D3-524-01'  → {'ref_drawing': '3-524', 'ref_index': '01'}
    """
    m = re.match(r'^D0*(\d+)-(\d+)-(\d+)$', text.strip(), re.IGNORECASE)
    if m:
        return {
            'ref_drawing': f"{m.group(1)}-{m.group(2)}",
            'ref_index': m.group(3)
        }
    return {}


def load_csv(path: str) -> list:
    rows = []
    try:
        with open(path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for r in reader:
                # BOM 제거
                cleaned = {k.lstrip('\ufeff'): v for k, v in r.items()}
                rows.append(cleaned)
    except Exception as e:
        print(f"  [경고] {path}: {e}")
    return rows


def match_port_to_signal(port: dict, candidates: list,
                         x_tol: float = 40, dist_tol: float = 120) -> dict | None:
    """
    PORT에 가장 가깝고 x좌표가 정렬된 SIGNAL/REF_SIGNAL 반환.
    우선순위: x좌표 오차 < x_tol 인 것 중 거리가 가장 짧은 것.
    그런 게 없으면 dist_tol 이내의 가장 가까운 것.
    """
    px, py = float(port['cx']), float(port['cy'])
    best_x = None
    best_x_dist = 9999
    best_any = None
    best_any_dist = 9999

    for s in candidates:
        sx, sy = float(s['cx']), float(s['cy'])
        dx = abs(px - sx)
        d = math.sqrt((px - sx) ** 2 + (py - sy) ** 2)
        if dx < x_tol and d < best_x_dist:
            best_x = s
            best_x_dist = d
        if d < best_any_dist:
            best_any = s
            best_any_dist = d

    if best_x:
        return best_x
    if best_any_dist <= dist_tol:
        return best_any
    return None


def find_nearest_block(element: dict, blocks: list, radius: float = 200) -> dict | None:
    """요소에서 가장 가까운 블록 인스턴스 반환."""
    ex, ey = float(element['cx']), float(element['cy'])
    nearest = None
    min_dist = radius
    for b in blocks:
        bx, by = float(b['cx']), float(b['cy'])
        d = math.sqrt((ex - bx) ** 2 + (ey - by) ** 2)
        if d < min_dist:
            min_dist = d
            nearest = b
    return nearest


def process_drawing(layout_path: str, drawing_key: str) -> dict:
    """하나의 도면 CSV에서 블록-포트-신호 매핑 생성."""
    rows = load_csv(layout_path)
    if not rows:
        return {}

    # 요소 타입별 분리
    ports = [r for r in rows if r.get('type') == 'PORT']
    signals = [r for r in rows if r.get('type') == 'SIGNAL']
    ref_signals = [r for r in rows if r.get('type') == 'REF_SIGNAL']
    block_types = [r for r in rows if r.get('type') == 'BLOCK_TYPE']
    ocb_blocks = [r for r in rows if r.get('type') == 'OCB_BLOCK']
    alg_blocks = [r for r in rows if r.get('type') == 'ALG_BLOCK']
    all_blocks = ocb_blocks + alg_blocks
    all_signals = signals + ref_signals

    if not ports or not all_signals:
        return {}

    # 블록별 BLOCK_TYPE 매핑 (가장 가까운 BLOCK_TYPE)
    block_type_map = {}
    for blk in all_blocks:
        bname = blk.get('text', '')
        nearest_bt = find_nearest_block(blk, block_types, radius=150)
        block_type_map[bname] = nearest_bt['text'] if nearest_bt else ''

    # PORT → SIGNAL 매칭
    port_signal_map = {}
    for port in ports:
        pname = port.get('text', '')
        matched = match_port_to_signal(port, all_signals)
        if matched:
            sig_text = matched.get('text', '')
            sig_type = matched.get('type', 'SIGNAL')
            entry = {
                'tag': sig_text,
                'sig_type': sig_type,
            }
            if sig_type == 'SIGNAL':
                tag_type = infer_tag_type(sig_text)
                if tag_type:
                    entry['tag_type'] = tag_type
            elif sig_type == 'REF_SIGNAL':
                parsed = parse_ref_signal(sig_text)
                entry.update(parsed)

            # 좌표도 저장 (디버깅 / 블록 귀속에 활용)
            entry['_port_cx'] = float(port['cx'])
            entry['_port_cy'] = float(port['cy'])
            port_signal_map[id(port)] = (pname, entry, port)

    # PORT를 가장 가까운 블록에 귀속
    block_port_map = {}  # block_name → {port_name: signal_entry}
    for pid, (pname, sig_entry, port) in port_signal_map.items():
        nearest_blk = find_nearest_block(port, all_blocks, radius=300)
        bname = nearest_blk['text'] if nearest_blk else '__unassigned__'
        if bname not in block_port_map:
            block_port_map[bname] = {}
        # 같은 포트명이 중복될 경우 더 가까운 것 우선 (일단 덮어쓰기)
        block_port_map[bname][pname] = {
            k: v for k, v in sig_entry.items() if not k.startswith('_')
        }

    # 결과 조합
    blocks_result = {}
    for blk in all_blocks:
        bname = blk.get('text', '')
        ports_data = block_port_map.get(bname, {})
        if not ports_data:
            continue
        blocks_result[bname] = {
            'block_type': block_type_map.get(bname, ''),
            'blk_type_raw': blk.get('type', ''),  # OCB_BLOCK / ALG_BLOCK
            'ports': ports_data
        }

    return blocks_result


def main():
    output = {}
    layout_files = sorted(glob.glob(str(DRAWINGS_DIR / '**' / '*layout*.csv'), recursive=True))
    layout_files += [str(DATA_DIR / 'page_187_layout.csv')]  # 루트 레벨 파일도 포함

    sys.stdout.reconfigure(encoding='utf-8')
    print(f"처리할 도면 CSV 수: {len(layout_files)}")

    for path in layout_files:
        # drawing_key 생성 (drawings/ 이후 경로)
        try:
            rel = Path(path).relative_to(DRAWINGS_DIR)
            drawing_key = str(rel.parent).replace('\\', '/')
        except ValueError:
            drawing_key = Path(path).stem

        result = process_drawing(path, drawing_key)
        if result:
            key = f"{drawing_key}/{Path(path).stem}"
            output[key] = {
                'source_file': str(Path(path).relative_to(BASE)).replace('\\', '/'),
                'blocks': result
            }
            print(f"  OK {key}: {len(result)}개 블록")

    out_path = DATA_DIR / 'signal_context.json'
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    # 통계
    total_blocks = sum(len(v['blocks']) for v in output.values())
    total_ports = sum(
        sum(len(b['ports']) for b in v['blocks'].values())
        for v in output.values()
    )
    print(f"\n완료: {out_path}")
    print(f"  도면 수: {len(output)}")
    print(f"  블록 수: {total_blocks}")
    print(f"  포트-신호 매핑 수: {total_ports}")


if __name__ == '__main__':
    main()
