"""
Ovation 심볼의 Functional Symbol SVG 다이어그램을 자동 생성하여
ovation_symbols.json의 detailFull 앞부분에 삽입하는 스크립트.

포트 구성을 분석하여:
- 주요 입력(IN1,IN2,PV,SP 등) → 상단 또는 왼쪽
- 파라미터(GAIN,BIAS,DIAG 등) → 왼쪽 점선
- 주요 출력(OUT,TOUT 등) → 하단 또는 오른쪽
- 트래킹(TRIN) → 하단 점선

PID 스타일의 다크테마 SVG를 생성.
"""

import json
import re
import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SYMBOLS_PATH = os.path.join(BASE_DIR, 'data', 'ovation_symbols.json')

# === 포트 분류 규칙 ===

# 주요 신호 입력 (블록 상단에 표시)
MAIN_INPUT_PATTERNS = [
    r'^IN\d*$', r'^PV\d*$', r'^SP$', r'^STPT$', r'^MEAS$',
    r'^FLAG$', r'^T$', r'^A$', r'^B$', r'^N$',
    r'^XIC\d*$', r'^XIO\d*$', r'^IN1$', r'^IN2$', r'^IN3$',
    r'^IN4$', r'^IN5$', r'^IN6$', r'^IN7$', r'^IN8$',
    r'^ENBL$', r'^RSET$', r'^ACK$', r'^TEST$',
    r'^INC$', r'^DEC$', r'^HOLD$', r'^SET$', r'^CLR$',
    r'^AUTO$', r'^MAN$', r'^CASC$',
]

# 파라미터 입력 (왼쪽 점선으로 표시)
PARAM_PATTERNS = [
    r'^DIAG$', r'.*G$',  # xxxG = Gain
    r'.*B$',              # xxxB = Bias (but not IN*B)
    r'^TPSC$', r'^BTSC$', r'^TRAT$',
    r'^PGAIN$', r'^INTG$', r'^DGAIN$', r'^DRAT$', r'^DRATE$',
    r'^BASE$', r'^TARG$', r'^QUAL$',
    r'^TYPE$', r'^ACT$', r'^DACT$', r'^MODE$',
    r'^HYST$', r'^DBND$',
    r'^HILM$', r'^LOLM$',
]

# 트래킹 입력 (하단 점선)
TRACK_PATTERNS = [r'^TRIN\d*$', r'^TRK\d*$', r'^RAI$']

# 주요 출력 (하단 또는 오른쪽)
MAIN_OUTPUT_PATTERNS = [
    r'^OUT\d*$', r'^TOUT$', r'^DEVA$',
    r'^YES$', r'^NO$',
    r'^MV$',
]

# 보조 출력 (오른쪽)
AUX_OUTPUT_PATTERNS = [
    r'^TRK\d+$', r'^STAT$', r'^STATUS$', r'^ERR$',
]


def classify_port(name, direction):
    """포트를 위치별로 분류"""
    upper = name.upper()

    if direction == 'output':
        for pat in MAIN_OUTPUT_PATTERNS:
            if re.match(pat, upper):
                return 'main_out'
        return 'aux_out'

    # input
    for pat in TRACK_PATTERNS:
        if re.match(pat, upper):
            return 'track'

    for pat in MAIN_INPUT_PATTERNS:
        if re.match(pat, upper):
            return 'main_in'

    for pat in PARAM_PATTERNS:
        if re.match(pat, upper):
            return 'param'

    # 이름에 G(ain) 또는 B(ias) 접미사면 파라미터
    if re.match(r'^[A-Z]+\d*[GB]$', upper) and upper not in ('FLAG',):
        return 'param'

    # required=True이고 IN 패턴이면 main_in
    return 'main_in'


def generate_svg(sym_id, sym_data):
    """심볼 데이터로부터 Functional Symbol SVG를 생성"""
    ports = sym_data.get('ports', [])
    if not ports:
        return ''

    # 포트 분류
    main_ins = []
    params = []
    tracks = []
    main_outs = []
    aux_outs = []

    for p in ports:
        name = p['name']
        direction = p.get('direction', 'input')
        cat = classify_port(name, direction)

        if cat == 'main_in':
            main_ins.append(name)
        elif cat == 'param':
            params.append(name)
        elif cat == 'track':
            tracks.append(name)
        elif cat == 'main_out':
            main_outs.append(name)
        elif cat == 'aux_out':
            aux_outs.append(name)

    # TOUT가 output에 있으면 상단 출력으로 이동
    tout_items = [n for n in main_outs if n.upper() == 'TOUT']
    if tout_items:
        main_outs = [n for n in main_outs if n.upper() != 'TOUT']

    # 레이아웃 계산
    max_left = max(len(params), 1)
    max_top = max(len(main_ins) + len(tout_items), 1)
    max_bottom = max(len(main_outs) + len(tracks), 1)
    max_right = max(len(aux_outs), 0)

    # SVG 크기 계산
    box_w = max(160, max_top * 55)
    box_h = max(80, max_left * 25 + 40)

    pad_left = 120 if params else 30
    pad_top = 50 if (main_ins or tout_items) else 20
    pad_bottom = 50 if (main_outs or tracks) else 20
    pad_right = 100 if (aux_outs or True) else 30  # DEVA 등 오른쪽 출력용

    svg_w = pad_left + box_w + pad_right
    svg_h = pad_top + box_h + pad_bottom

    # 블록 좌표
    bx = pad_left
    by = pad_top

    # 심볼 텍스트 (블록 중앙에 표시)
    name_text = sym_data.get('name', sym_id)
    formula = sym_data.get('formula', '')

    # 블록 내부 레이블 결정
    inner_label = sym_id
    if len(sym_id) > 8:
        inner_label = sym_id[:8]

    # 고유 marker ID (페이지에 여러 SVG가 있을 수 있으므로)
    mid = sym_id.lower()

    lines = []
    lines.append(f'<svg viewBox="0 0 {svg_w} {svg_h}" style="width:100%; max-width:{svg_w}px; display:block; margin:12px auto;">')

    # Defs - arrow markers
    lines.append(f'<defs>')
    lines.append(f'<marker id="{mid}_a1" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><path d="M0,0 L8,3 L0,6" fill="#4fc3f7"/></marker>')
    lines.append(f'<marker id="{mid}_a2" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><path d="M0,0 L8,3 L0,6" fill="#ff9800"/></marker>')
    lines.append(f'<marker id="{mid}_a3" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><path d="M0,0 L8,3 L0,6" fill="rgba(255,255,255,0.4)"/></marker>')
    lines.append(f'<marker id="{mid}_a4" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><path d="M0,0 L8,3 L0,6" fill="#10b981"/></marker>')
    lines.append(f'<marker id="{mid}_a5" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><path d="M0,0 L8,3 L0,6" fill="#a78bfa"/></marker>')
    lines.append(f'</defs>')

    # 메인 블록 박스
    lines.append(f'<rect x="{bx}" y="{by}" width="{box_w}" height="{box_h}" rx="6" fill="rgba(79,195,247,0.06)" stroke="rgba(79,195,247,0.3)" stroke-width="1.5"/>')

    # 블록 내부 텍스트
    cx = bx + box_w / 2
    cy = by + box_h / 2
    lines.append(f'<text x="{cx}" y="{cy + 5}" fill="#4fc3f7" font-size="16" text-anchor="middle" font-weight="bold">{inner_label}</text>')

    # === 상단: 주요 입력 + TOUT ===
    top_items = main_ins + tout_items
    if top_items:
        spacing = box_w / (len(top_items) + 1)
        for i, name in enumerate(top_items):
            px = bx + spacing * (i + 1)
            is_tout = name.upper() == 'TOUT'

            if is_tout:
                # TOUT: 위로 나가는 출력 (보라색)
                lines.append(f'<text x="{px}" y="{by - 22}" fill="#a78bfa" font-size="11" font-weight="600" text-anchor="middle">{name}</text>')
                lines.append(f'<line x1="{px}" y1="{by}" x2="{px}" y2="{by - 15}" stroke="#a78bfa" stroke-width="1.5" marker-end="url(#{mid}_a5)"/>')
            else:
                # 입력: 위에서 아래로 (주황색)
                lines.append(f'<text x="{px}" y="{by - 22}" fill="#ff9800" font-size="11" font-weight="600" text-anchor="middle">{name}</text>')
                lines.append(f'<line x1="{px}" y1="{by - 15}" x2="{px}" y2="{by}" stroke="#ff9800" stroke-width="1.5" marker-end="url(#{mid}_a2)"/>')

    # === 왼쪽: 파라미터 (점선) ===
    if params:
        p_spacing = box_h / (len(params) + 1)
        for i, name in enumerate(params):
            py = by + p_spacing * (i + 1)
            text_x = bx - 65
            lines.append(f'<text x="{text_x}" y="{py + 4}" fill="rgba(255,255,255,0.5)" font-size="10" text-anchor="start">{name}</text>')
            line_x1 = bx - 15
            lines.append(f'<line x1="{line_x1}" y1="{py}" x2="{bx}" y2="{py}" stroke="rgba(255,255,255,0.3)" stroke-width="1" stroke-dasharray="4,3" marker-end="url(#{mid}_a3)"/>')

    # === 하단: 주요 출력 ===
    bottom_items = main_outs
    if bottom_items:
        spacing = box_w / (len(bottom_items) + 1)
        for i, name in enumerate(bottom_items):
            px = bx + spacing * (i + 1)
            lines.append(f'<line x1="{px}" y1="{by + box_h}" x2="{px}" y2="{by + box_h + 25}" stroke="#4fc3f7" stroke-width="1.5" marker-end="url(#{mid}_a1)"/>')
            lines.append(f'<text x="{px}" y="{by + box_h + 42}" fill="#4fc3f7" font-size="12" text-anchor="middle" font-weight="bold">{name}</text>')

    # === 하단 점선: 트래킹 ===
    if tracks:
        for i, name in enumerate(tracks):
            px = bx + 30 + i * 50
            lines.append(f'<text x="{px - 10}" y="{by + box_h + 42}" fill="rgba(255,255,255,0.4)" font-size="10">{name}</text>')
            lines.append(f'<line x1="{px}" y1="{by + box_h + 30}" x2="{px}" y2="{by + box_h + 5}" stroke="rgba(255,255,255,0.3)" stroke-width="1" stroke-dasharray="4,3" marker-end="url(#{mid}_a3)"/>')

    # === 오른쪽: 보조 출력 ===
    if aux_outs:
        a_spacing = box_h / (len(aux_outs) + 1)
        for i, name in enumerate(aux_outs):
            py = by + a_spacing * (i + 1)
            lines.append(f'<line x1="{bx + box_w}" y1="{py}" x2="{bx + box_w + 40}" y2="{py}" stroke="#10b981" stroke-width="1.5" marker-end="url(#{mid}_a4)"/>')
            lines.append(f'<text x="{bx + box_w + 48}" y="{py + 4}" fill="#10b981" font-size="11" font-weight="600">{name}</text>')

    # ▼ Functional Symbol 타이틀
    lines.insert(1, f'<text x="{svg_w/2}" y="12" fill="rgba(255,255,255,0.3)" font-size="10" text-anchor="middle">▼ Functional Symbol</text>')

    lines.append('</svg>')
    return ''.join(lines)


def generate_detail_header(sym_id, sym_data):
    """detailFull 상단의 HTML 헤더 생성"""
    section = sym_data.get('section', '')
    pages = sym_data.get('pdfPages', [])
    page_str = f'p.{pages[0]}~{pages[1]}' if len(pages) >= 2 else ''

    header = f'<h3 style="color:#4fc3f7; margin:0 0 4px;">{sym_id} 알고리즘 상세 가이드</h3>'
    header += f'<div style="color:rgba(255,255,255,0.35); font-size:10px; margin-bottom:16px;">Ovation Algorithms Reference Manual Section {section} ({page_str}) 기반</div>'
    return header


def generate_detail_body(sym_id, sym_data):
    """diagramDesc 기반으로 상세 설명 본문 생성"""
    desc = sym_data.get('diagramDesc', '')
    formula = sym_data.get('formula', '')
    ai = sym_data.get('ai', '')

    body = ''

    # 1. 개요
    body += '<h4 style="color:#4fc3f7; margin:20px 0 8px;">1. 개요</h4>'
    body += f'<p>{ai or desc}</p>'

    # 2. 수식 (있으면)
    if formula:
        body += '<h4 style="color:#4fc3f7; margin:20px 0 8px;">2. 동작 수식</h4>'
        body += f'<div style="background:rgba(79,195,247,0.06); border:1px solid rgba(79,195,247,0.2); border-radius:6px; padding:10px 14px; font-family:monospace; color:#4fc3f7; font-size:13px;">{formula}</div>'

    # 3. 포트 설명
    ports = sym_data.get('ports', [])
    if ports:
        body += '<h4 style="color:#4fc3f7; margin:20px 0 8px;">3. 포트 상세</h4>'
        body += '<table style="width:100%; border-collapse:collapse; font-size:11px;">'
        body += '<tr style="border-bottom:1px solid rgba(255,255,255,0.1);"><th style="text-align:left; padding:4px 8px; color:#ff9800;">포트</th><th style="text-align:left; padding:4px 8px; color:#ff9800;">방향</th><th style="text-align:left; padding:4px 8px; color:#ff9800;">설명</th></tr>'
        for p in ports:
            dir_color = '#ff9800' if p.get('direction') == 'input' else '#4fc3f7'
            dir_label = '입력' if p.get('direction') == 'input' else '출력'
            desc_text = p.get('description', '')
            body += f'<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:3px 8px; color:{dir_color}; font-weight:600;">{p["name"]}</td><td style="padding:3px 8px; color:rgba(255,255,255,0.5);">{dir_label}</td><td style="padding:3px 8px; color:rgba(255,255,255,0.7);">{desc_text}</td></tr>'
        body += '</table>'

    return body


def main():
    with open(SYMBOLS_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)

    updated = 0
    skipped = 0
    errors = []

    for sym_id, sym in data.items():
        existing = sym.get('detailFull', '')

        # 이미 SVG가 있는 심볼은 건너뜀
        if '<svg' in existing:
            skipped += 1
            continue

        ports = sym.get('ports', [])
        if not ports:
            errors.append(f'{sym_id}: 포트 데이터 없음')
            continue

        try:
            svg = generate_svg(sym_id, sym)
            header = generate_detail_header(sym_id, sym)
            body = generate_detail_body(sym_id, sym)

            if existing:
                # 기존 detailFull 앞에 SVG 다이어그램 삽입
                new_detail = header + svg + existing
            else:
                # 새로 생성
                new_detail = header + svg + body

            sym['detailFull'] = new_detail
            updated += 1
        except Exception as e:
            errors.append(f'{sym_id}: {e}')

    # 저장
    with open(SYMBOLS_PATH, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f'완료: {updated}개 업데이트, {skipped}개 스킵 (이미 SVG 있음)')
    if errors:
        print(f'에러 ({len(errors)}):')
        for e in errors:
            print(f'  {e}')


if __name__ == '__main__':
    main()
