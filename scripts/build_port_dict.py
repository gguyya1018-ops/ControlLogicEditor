"""
build_port_dict.py (v3)
========================
B 버튼에 표시되는 모든 요소에 대해 찾을 수 있는 모든 정보를 수집.

대상 요소 (B 모드 표시 기준):
  - OCB_BLOCK / ALG_BLOCK
  - SIGNAL (non-IN prefix ISA 태그)
  - REF_SIGNAL (D04-078-01 형식 연결 도면 신호)
  - OTHER 중 MAMODE:/MA_xxx/MODE_xxx 패턴 (M/A 스테이션)

각 요소 항목 내용:
  - 발견된 도면 번호, 도면 제목
  - 설비명 (영문)
  - 연결된 신호/도면 목록
  - 계기 타입 (ISA 태그)
  - 크로스 레퍼런스 정보
"""

import csv, json, math, glob, re, sys
from pathlib import Path

BASE         = Path(__file__).parent.parent
DATA_DIR     = BASE / "data"
DRAWINGS_DIR = BASE / "drawings"

# ── 패턴 정의 ──────────────────────────────────────────────────────────────
_REF_PAT       = re.compile(r'^D0*(\d+)-(\d+)-(\d+)$', re.IGNORECASE)
_REF_OTHER_PAT = re.compile(r'^\(D0*(\d+)-(\d+)-(\d+)\)$', re.IGNORECASE)
_ISA_MIN       = re.compile(r'^[A-Z][A-Z0-9-]*\d[A-Z0-9-]*$', re.IGNORECASE)
_NOT_TAG       = re.compile(
    r'^(IN\d*|OUT\d*|PK\d+|PPR\d+|SPR\d+|[A-G]\d*|FLAG|YES|NO|'
    r'STPT|SP|PV|MV|T|NUM|DEN|H|L|ENBL|INIT|RST|SET|CLR|'
    r'Q\d*|QN|CK|D|J|K|R|S|TRIG|HOLD|TRACK|MODE|AUTO|MAN|CAS|'
    r'AND|OR|NOT|X|Y|Z|A\d+|B\d+|C\d+)$', re.IGNORECASE
)
_MA_PAT = re.compile(
    r'^(MAMODE:|MODE_\d+|MA_\d+|[A-Z]{1,4}_\d{4}_\d{4}$)', re.IGNORECASE
)

# ISA 태그 접두사 → 계기 타입
TAG_PREFIX_MAP = {
    'TI':'온도 지시계','TIT':'온도 송신계기','TE':'온도 요소','TC':'온도 제어기','TT':'온도 송신기','TCV':'온도 제어밸브',
    'PI':'압력 지시계','PIT':'압력 송신계기','PE':'압력 요소','PC':'압력 제어기','PT':'압력 송신기',
    'PDI':'차압 지시계','PDIS':'차압 지시 스위치','PCV':'압력 제어밸브',
    'FI':'유량 지시계','FIT':'유량 송신계기','FE':'유량 요소','FC':'유량 제어기','FT':'유량 송신기','FCV':'유량 제어밸브',
    'LI':'레벨 지시계','LIT':'레벨 송신계기','LE':'레벨 요소','LC':'레벨 제어기','LT':'레벨 송신기',
    'AI':'분석 지시계','AIT':'분석 송신계기','AT':'분석 송신기',
    'SIT':'속도 송신계기','SIC':'속도 지시 제어기','SI':'속도 지시계','ST':'속도 송신기',
    'ZI':'위치 지시계','ZT':'위치 송신기','II':'전류 지시계','IT':'전류 송신기',
    'XV':'차단 밸브','HV':'핸드 밸브','CV':'제어 밸브',
    'HS':'핸드 스위치','HIC':'핸드 지시 제어기',
    'LS':'레벨 스위치','TS':'온도 스위치','PS':'압력 스위치','FS':'유량 스위치','ZS':'위치 스위치',
    'TSH':'고온 스위치','TSL':'저온 스위치','PSH':'고압 스위치','PSL':'저압 스위치',
    'PY':'공압 계산기','M':'모터','P':'펌프','K':'압축기','E':'열교환기',
}


def infer_tag_type(tag: str) -> str:
    m = re.match(r'^([A-Z]+)', tag.upper())
    if not m:
        return ''
    p = m.group(1)
    for l in [6,5,4,3,2,1]:
        if p[:l] in TAG_PREFIX_MAP:
            return TAG_PREFIX_MAP[p[:l]]
    return ''


def is_isa_tag(text: str) -> bool:
    t = text.strip()
    if not t or len(t) < 3:
        return False
    if _NOT_TAG.match(t):
        return False
    if not _ISA_MIN.match(t):
        return False
    return True


def parse_ref(text: str) -> dict:
    m = _REF_PAT.match(text.strip())
    if m:
        return {'ref_drawing': f"{m.group(1)}-{m.group(2)}", 'ref_index': m.group(3)}
    return {}


def normalize_ref_key(tag: str) -> str:
    """D3-511-05 → D03-511-05 형식으로 정규화 (cross_reference_index 키 일치용)"""
    m = _REF_PAT.match(tag.strip())
    if m:
        return f"D{int(m.group(1)):02d}-{m.group(2)}-{m.group(3)}"
    return tag


def load_csv(path: str) -> list:
    for enc in ('utf-8-sig', 'utf-8', 'cp949'):
        try:
            with open(path, 'r', encoding=enc) as f:
                rows = list(csv.DictReader(f))
            return [{k.lstrip('\ufeff'): v for k, v in r.items()} for r in rows]
        except UnicodeDecodeError:
            continue
        except Exception as e:
            print(f"  [경고] {path}: {e}", flush=True)
            break
    return []


def extract_drawing_number(path: Path) -> str:
    try:
        rel = path.relative_to(DRAWINGS_DIR)
        parts = rel.parts
        if parts:
            m = re.match(r'^drop_(\d+)', parts[0])
            drop_num = m.group(1) if m else '?'
            sub = parts[1] if len(parts) > 1 else ''
            return f"{drop_num}-{sub}" if sub else drop_num
    except ValueError:
        pass
    return path.parent.name


def dist(a: dict, b: dict) -> float:
    return math.sqrt((float(a['cx'])-float(b['cx']))**2 + (float(a['cy'])-float(b['cy']))**2)


def process_csv(path: Path, cross_ref_map: dict) -> dict:
    """
    하나의 도면 CSV에서 B 모드 요소별 컨텍스트 수집.
    반환: {element_name: {entry_type, drawing, ...컨텍스트}}
    """
    rows = load_csv(str(path))
    if not rows:
        return {}

    drawing_num = extract_drawing_number(path)

    # 타입별 분리
    ocb_blocks  = [r for r in rows if r.get('type') == 'OCB_BLOCK']
    alg_blocks  = [r for r in rows if r.get('type') == 'ALG_BLOCK']
    all_blocks  = ocb_blocks + alg_blocks

    isa_signals = [r for r in rows if r.get('type') == 'SIGNAL' and is_isa_tag(r.get('text',''))]
    ref_signals = [r for r in rows if r.get('type') == 'REF_SIGNAL' and _REF_PAT.match(r.get('text','').strip())]
    ma_others   = [r for r in rows if r.get('type') == 'OTHER' and _MA_PAT.match(r.get('text','').strip())]

    # OTHER 타입에서 괄호형 REF 변환
    for r in rows:
        if r.get('type') != 'OTHER':
            continue
        m = _REF_OTHER_PAT.match(r.get('text','').strip())
        if m:
            ref_signals.append({**r, 'type': 'REF_SIGNAL',
                                 'text': f"D{m.group(1)}-{m.group(2)}-{m.group(3)}"})

    result = {}

    # ── OCB/ALG 블록: 반경 내 ISA/REF 신호 수집 ──────────────────────────
    for blk in all_blocks:
        name = blk.get('text','').strip()
        if not name:
            continue

        connected = {}  # tag → {tag_type?, ref_drawing?, equipment?, drawing_title?}

        for sig in isa_signals:
            if dist(blk, sig) > 350:
                continue
            tag = sig.get('text','').strip()
            if not tag or tag in connected:
                continue
            info = {}
            tt = infer_tag_type(tag)
            if tt:
                info['tag_type'] = tt
            ctx = cross_ref_map.get(tag, {})
            if ctx.get('equipment'):
                info['equipment'] = ctx['equipment']
            if ctx.get('primary_drawing'):
                info['drawing'] = ctx['primary_drawing']
            if ctx.get('drawing_title'):
                info['drawing_title'] = ctx['drawing_title']
            connected[tag] = info

        for sig in ref_signals:
            if dist(blk, sig) > 450:
                continue
            tag = sig.get('text','').strip()
            if not tag or tag in connected:
                continue
            info = parse_ref(tag)
            # D3-511-05 → D03-511-05 정규화 후 cross_reference 조회
            ctx = cross_ref_map.get(tag) or cross_ref_map.get(normalize_ref_key(tag), {})
            if ctx.get('equipment'):
                info['equipment'] = ctx['equipment']
            if ctx.get('drawing_title'):
                info['drawing_title'] = ctx['drawing_title']
            connected[tag] = info

        if connected:
            entry = result.get(name, {
                'entry_type': 'BLOCK',
                'type': blk.get('type',''),
                'drawings': set(),
                'connected': {},
            })
            entry['drawings'].add(drawing_num)
            for tag, info in connected.items():
                if tag not in entry['connected']:
                    entry['connected'][tag] = info
            result[name] = entry

    # ── ISA SIGNAL 태그: 정보 수집 ────────────────────────────────────────
    for sig in isa_signals:
        tag = sig.get('text','').strip()
        if not tag:
            continue
        entry = result.get(tag, {
            'entry_type': 'SIGNAL',
            'type': 'SIGNAL',
            'tag_type': infer_tag_type(tag),
            'drawings': set(),
        })
        entry['drawings'].add(drawing_num)
        ctx = cross_ref_map.get(tag, {})
        if ctx.get('equipment') and not entry.get('equipment'):
            entry['equipment'] = ctx['equipment']
        if ctx.get('primary_drawing') and not entry.get('primary_drawing'):
            entry['primary_drawing'] = ctx['primary_drawing']
        if ctx.get('drawing_title') and not entry.get('drawing_title'):
            entry['drawing_title'] = ctx['drawing_title']
        if ctx.get('ref_drawings') and not entry.get('ref_drawings'):
            entry['ref_drawings'] = ctx['ref_drawings']
        result[tag] = entry

    # ── REF_SIGNAL: 연결 도면 정보 수집 ──────────────────────────────────
    for sig in ref_signals:
        tag = sig.get('text','').strip()
        if not tag:
            continue
        entry = result.get(tag, {
            'entry_type': 'REF_SIGNAL',
            'type': 'REF_SIGNAL',
            'drawings': set(),
        })
        entry['drawings'].add(drawing_num)
        ref_info = parse_ref(tag)
        if ref_info.get('ref_drawing') and not entry.get('ref_drawing'):
            entry['ref_drawing'] = ref_info['ref_drawing']
        if ref_info.get('ref_index') and not entry.get('ref_index'):
            entry['ref_index'] = ref_info['ref_index']
        ctx = cross_ref_map.get(tag) or cross_ref_map.get(normalize_ref_key(tag), {})
        if ctx.get('equipment') and not entry.get('equipment'):
            entry['equipment'] = ctx['equipment']
        if ctx.get('drawing_title') and not entry.get('drawing_title'):
            entry['drawing_title'] = ctx['drawing_title']
        if ctx.get('all_drawings') and not entry.get('ref_drawings'):
            entry['ref_drawings'] = ctx['all_drawings']
        result[tag] = entry

    # ── M/A 스테이션 OTHER 요소 ────────────────────────────────────────────
    for ma in ma_others:
        name = ma.get('text','').strip()
        if not name:
            continue
        entry = result.get(name, {
            'entry_type': 'BLOCK',
            'type': 'OCB_BLOCK',
            'drawings': set(),
            'connected': {},
        })
        entry['drawings'].add(drawing_num)
        result[name] = entry

    return result


def sets_to_lists(obj):
    """set → list 변환 (JSON 직렬화용)"""
    if isinstance(obj, set):
        return sorted(obj)
    if isinstance(obj, dict):
        return {k: sets_to_lists(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [sets_to_lists(i) for i in obj]
    return obj


def main():
    sys.stdout.reconfigure(encoding='utf-8')

    # cross_reference_index.json 로드 → tag 검색용 맵 구축
    cri_path = DATA_DIR / 'cross_reference_index.json'
    cross_ref_map: dict = {}   # tag → {equipment, drawing_title, primary_drawing, ref_drawings, all_drawings}
    if cri_path.exists():
        with open(cri_path, 'r', encoding='utf-8') as f:
            cri = json.load(f)
        for entry in cri:
            tag = entry.get('tag','')
            if not tag:
                continue
            drawings = entry.get('drawings', [])
            primary = next((d for d in drawings if d.get('primary')), None) or (drawings[0] if drawings else {})
            all_drw_nums = [d.get('num','') for d in drawings if d.get('num')]
            cross_ref_map[tag] = {
                'equipment':       primary.get('title', ''),
                'drawing_title':   primary.get('title', ''),
                'primary_drawing': primary.get('num', ''),
                'all_drawings':    all_drw_nums,
                'ref_drawings':    [d.get('num','') for d in drawings if not d.get('primary') and d.get('num')],
            }
        print(f"cross_reference_index: {len(cross_ref_map)}개", flush=True)
    else:
        print("cross_reference_index.json 없음", flush=True)

    # tag_context.json 추가 로드 (한글 설비명 등 보완)
    tc_path = DATA_DIR / 'tag_context.json'
    tag_ctx: dict = {}
    if tc_path.exists():
        with open(tc_path, 'r', encoding='utf-8') as f:
            tag_ctx = json.load(f)
        print(f"tag_context: {len(tag_ctx)}개", flush=True)

    # ── 도면번호 → ISA 태그 목록 역방향 캐시 빌드 ────────────────────────────
    # tag_context의 각 태그가 어느 도면에 주로 등장하는지 매핑
    # ref_drawing (예: "3-511") → [(base_tag, equipment), ...]
    drawing_to_tags: dict = {}  # "3-511" → {base_tag: equipment_str}
    _suffix_re = re.compile(
        r'(RNS|RMS|RUN|SAT|SPC|SPS|STC|STP|RDY|RUN_HR|RUN_M|'
        r'AUTO|MAN|CAS|MODE|STATUS|FAIL|TRIP|RUN|STOP|START|'
        r'PV|SP|MV|OUT|FB|ERR|_[A-Z0-9]+)$',
        re.IGNORECASE
    )
    for tag, ctx in tag_ctx.items():
        drw = ctx.get('primary_drawing', '')
        equip = ctx.get('equipment', '') or ctx.get('drawing_title', '')
        if not drw or not equip:
            continue
        base = _suffix_re.sub('', tag).rstrip('_')
        if len(base) < 3:
            continue
        if drw not in drawing_to_tags:
            drawing_to_tags[drw] = {}
        if base not in drawing_to_tags[drw]:
            drawing_to_tags[drw][base] = equip
        # ref_drawings에도 추가
        for rd in ctx.get('ref_drawings', []):
            if rd not in drawing_to_tags:
                drawing_to_tags[rd] = {}
            if base not in drawing_to_tags[rd]:
                drawing_to_tags[rd][base] = equip
    print(f"도면→태그 역방향 캐시: {len(drawing_to_tags)}개 도면", flush=True)

    layout_files = sorted(glob.glob(str(DRAWINGS_DIR / '**' / '*_layout.csv'), recursive=True))
    print(f"처리할 도면 CSV: {len(layout_files)}개", flush=True)

    port_dict: dict = {}

    for i, path_str in enumerate(layout_files, 1):
        path = Path(path_str)
        page_result = process_csv(path, cross_ref_map)

        for name, data in page_result.items():
            if name not in port_dict:
                port_dict[name] = data
            else:
                # 도면 목록 합치기
                existing = port_dict[name]
                existing.setdefault('drawings', set())
                if isinstance(data.get('drawings'), set):
                    existing['drawings'] |= data['drawings']
                # connected 신호 합치기 (BLOCK 타입)
                if data.get('connected'):
                    existing.setdefault('connected', {})
                    for tag, info in data['connected'].items():
                        if tag not in existing['connected']:
                            existing['connected'][tag] = info
                # SIGNAL/REF_SIGNAL: 누락된 필드 보완
                for fld in ('equipment','drawing_title','primary_drawing','ref_drawings','tag_type','ref_drawing'):
                    if data.get(fld) and not existing.get(fld):
                        existing[fld] = data[fld]

        if i % 100 == 0:
            print(f"  {i}/{len(layout_files)} 완료...", flush=True)

    # ── base_tag_equip: 접미사 제거 → 장치명 매핑 ────────────────────────────
    # PP252001RNS → base "PP252001" → "DH CIRCU. PUMP-A (252-M-PP-001)"
    base_tag_equip: dict = {}  # base_tag → equipment
    for tc_tag, ctx in tag_ctx.items():
        equip = ctx.get('equipment','') or ctx.get('drawing_title','')
        if not equip:
            continue
        base = _suffix_re.sub('', tc_tag).rstrip('_')
        if len(base) >= 3 and base not in base_tag_equip:
            base_tag_equip[base] = equip
    print(f"base_tag_equip 캐시: {len(base_tag_equip)}개", flush=True)

    # ── 수집된 SIGNAL 항목에 base_tag_equip으로 설비명 보강 ──────────────────
    for name, data in port_dict.items():
        if data.get('entry_type') != 'SIGNAL':
            continue
        if not data.get('equipment'):
            eq = base_tag_equip.get(name, '')
            if eq:
                data['equipment'] = eq

    # ── drawing_num → ISA 태그 목록 빌드 (수집된 SIGNAL 항목 기반) ───────────
    # PP252001.drawings = ["3-511"] → drawing_isa_tags["3-511"] = {PP252001: equip}
    drawing_isa_tags: dict = {}  # drawing_num → {isa_tag: equipment}
    for name, data in port_dict.items():
        if data.get('entry_type') != 'SIGNAL':
            continue
        equip = data.get('equipment','') or base_tag_equip.get(name,'')
        for drw in (data.get('drawings') or []):
            if isinstance(drw, set):
                drw_list = sorted(drw)
            else:
                drw_list = [drw] if isinstance(drw, str) else drw
            for d in (drw_list if isinstance(drw_list, list) else [drw_list]):
                if d not in drawing_isa_tags:
                    drawing_isa_tags[d] = {}
                drawing_isa_tags[d][name] = equip
    print(f"도면→ISA 태그 캐시: {len(drawing_isa_tags)}개 도면", flush=True)

    # ── BLOCK의 REF_SIGNAL connected 항목에 역방향 ISA 태그 보강 ─────────────
    print("REF_SIGNAL 역방향 장치 정보 보강 중...", flush=True)
    for name, data in port_dict.items():
        if data.get('entry_type') != 'BLOCK':
            continue
        for tag, info in data.get('connected', {}).items():
            ref_drw = info.get('ref_drawing', '')
            if not ref_drw:
                continue
            isa_on_drw = drawing_isa_tags.get(ref_drw, {})
            if not isa_on_drw:
                continue
            # 해당 도면에 있는 ISA 태그 목록 (PP 계열 번호순 우선, 최대 6개)
            all_devs = [(t, e) for t, e in isa_on_drw.items() if e]
            pp_devs  = sorted([d for d in all_devs if re.match(r'^[A-Z]{2}\d{6}', d[0])], key=lambda x: x[0])
            devices  = (pp_devs + [d for d in all_devs if d not in pp_devs])[:6]
            if devices:
                info['resolved_tags']  = [d[0] for d in devices]
                info['resolved_equip'] = list(dict.fromkeys(d[1] for d in devices))
                # 대표 설비명: PP 계열 첫 번째 우선
                lead = pp_devs[0][1] if pp_devs else devices[0][1]
                info['equipment'] = lead

    # tag_context 병합: 한글 설비명 + 태그타입 보완
    for name, data in port_dict.items():
        if data.get('entry_type') == 'SIGNAL':
            tc = tag_ctx.get(name, {})
            if tc.get('tag_type') and not data.get('tag_type'):
                data['tag_type'] = tc['tag_type']
            if tc.get('equipment') and not data.get('equipment'):
                data['equipment'] = tc['equipment']
            if tc.get('primary_drawing') and not data.get('primary_drawing'):
                data['primary_drawing'] = tc['primary_drawing']
        # BLOCK: connected 신호의 tag_type/equipment 보완
        if data.get('connected'):
            for tag, info in data['connected'].items():
                tc = tag_ctx.get(tag, {})
                if tc.get('tag_type') and not info.get('tag_type'):
                    info['tag_type'] = tc['tag_type']
                if tc.get('equipment') and not info.get('equipment'):
                    info['equipment'] = tc['equipment']

    # set → list 변환 후 저장
    port_dict = sets_to_lists(port_dict)

    out_path = DATA_DIR / 'block_port_dict.json'
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(port_dict, f, ensure_ascii=False, indent=2)

    # 통계
    blocks   = sum(1 for v in port_dict.values() if v.get('entry_type') == 'BLOCK')
    signals  = sum(1 for v in port_dict.values() if v.get('entry_type') == 'SIGNAL')
    refsigs  = sum(1 for v in port_dict.values() if v.get('entry_type') == 'REF_SIGNAL')
    connected_total = sum(len(v.get('connected',{})) for v in port_dict.values())

    print(f"\n완료: {out_path}")
    print(f"  전체 항목     : {len(port_dict)}개")
    print(f"  BLOCK         : {blocks}개")
    print(f"  SIGNAL (ISA)  : {signals}개")
    print(f"  REF_SIGNAL    : {refsigs}개")
    print(f"  연결 신호 합계: {connected_total}개")


if __name__ == '__main__':
    main()
