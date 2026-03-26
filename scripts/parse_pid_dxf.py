"""
P&ID DXF 파싱 스크립트
- 55개 DXF 파일을 JSON으로 변환
- ControlLogicEditor P&ID 뷰어용 데이터 생성

사용법:
  python parse_pid_dxf.py              # 모든 DXF 파일 변환
  python parse_pid_dxf.py PI-M-007     # 특정 파일만 변환
"""

import ezdxf
import json
import os
import sys
import re
import math
from pathlib import Path
from collections import defaultdict

# ============================================================
# 설정
# ============================================================

DXF_SOURCE_DIR = r"C:\Users\이성규\AppProduct\DXF\temp_dxf"
OUTPUT_DIR = r"C:\Users\이성규\AppProduct\ControlLogicEditor\data\pid"

# 격자 설정 (PI-M-007 기준, 다른 도면은 자동 감지 시도)
DEFAULT_GRID = {
    "x_start": 935.0,
    "x_cell": 80.2,
    "y_start": 38.2,
    "y_cell": 90.95,
    "cols": 8,
    "rows": 6
}

# 계기 타입 정의
INSTRUMENT_TYPES = {
    'LIC': ('레벨지시조절기', 'Level Indicator Controller'),
    'LIA': ('레벨지시경보기', 'Level Indicator Alarm'),
    'LIT': ('레벨지시전송기', 'Level Indicator Transmitter'),
    'LI': ('레벨지시기', 'Level Indicator'),
    'LS': ('레벨스위치', 'Level Switch'),
    'LA': ('레벨경보기', 'Level Alarm'),
    'TIT': ('온도지시전송기', 'Temperature Indicator Transmitter'),
    'TIA': ('온도지시경보기', 'Temperature Indicator Alarm'),
    'TICA': ('온도지시조절경보기', 'Temperature Indicator Controller Alarm'),
    'TDI': ('온도차지시기', 'Temperature Differential Indicator'),
    'TI': ('온도지시기', 'Temperature Indicator'),
    'TE': ('온도검출기', 'Temperature Element'),
    'TCV': ('온도조절밸브', 'Temperature Control Valve'),
    'PIT': ('압력지시전송기', 'Pressure Indicator Transmitter'),
    'PIA': ('압력지시경보기', 'Pressure Indicator Alarm'),
    'PDIT': ('차압지시전송기', 'Pressure Differential Indicator Transmitter'),
    'PDIC': ('차압지시조절기', 'Pressure Differential Indicator Controller'),
    'PI': ('압력지시기', 'Pressure Indicator'),
    'FIT': ('유량지시전송기', 'Flow Indicator Transmitter'),
    'FIC': ('유량지시조절기', 'Flow Indicator Controller'),
    'FIQ': ('유량지시적산기', 'Flow Indicator Quantity'),
    'FIRQ': ('유량지시기록적산기', 'Flow Indicator Recorder Quantity'),
    'FCV': ('유량조절밸브', 'Flow Control Valve'),
    'FE': ('유량검출기', 'Flow Element'),
    'SV': ('안전밸브', 'Safety Valve'),
    'HV': ('핸드밸브', 'Hand Valve'),
    'ZS': ('위치스위치', 'Position Switch'),
    'ZT': ('위치전송기', 'Position Transmitter'),
    'YS': ('리미트스위치', 'Limit Switch'),
    'AIT': ('분석지시전송기', 'Analyzer Indicator Transmitter'),
    'AI': ('분석지시기', 'Analyzer Indicator'),
}

# 밸브 타입 심볼 매핑
VALVE_SYMBOLS = {
    'GATE': 'gate',
    'GLOBE': 'globe',
    'CHECK': 'check',
    'BALL': 'ball',
    'BUTTERFLY': 'butterfly',
    'CONTROL': 'control',
    'SAFETY': 'safety',
    'RELIEF': 'relief',
    'NEEDLE': 'needle',
    'PLUG': 'plug',
}

# ============================================================
# 유틸리티 함수
# ============================================================

def xy_to_grid(x, y, grid_config=None):
    """X,Y 좌표를 격자 좌표로 변환"""
    g = grid_config or DEFAULT_GRID

    col_idx = int((x - g["x_start"]) / g["x_cell"])
    col = g["cols"] - col_idx
    col = max(1, min(col, g["cols"]))

    row_idx = int((y - g["y_start"]) / g["y_cell"])
    row_idx = max(0, min(row_idx, g["rows"] - 1))
    row = chr(ord('A') + row_idx)

    return f"{col}{row}"


def get_instrument_type(name):
    """계기 이름에서 타입 정보 추출"""
    for prefix in sorted(INSTRUMENT_TYPES.keys(), key=len, reverse=True):
        if name.upper().startswith(prefix):
            return prefix, INSTRUMENT_TYPES[prefix]
    return None, (None, None)


def parse_pid_number(filename):
    """파일명에서 P&ID 번호와 시스템명 추출"""
    # PI-M-007(주보일러증기계통).dxf → PI-M-007, 주보일러증기계통
    match = re.match(r'(PI-M-\d+(?:-\d+)?)\((.+?)\)\.dxf', filename, re.IGNORECASE)
    if match:
        return match.group(1), match.group(2)

    # PI-M-007.dxf
    match = re.match(r'(PI-M-\d+(?:-\d+)?)\.dxf', filename, re.IGNORECASE)
    if match:
        return match.group(1), None

    return None, filename.replace('.dxf', '')


def generate_search_variants(name):
    """검색어 변형 생성"""
    variants = [name.upper()]

    # 공백 제거 버전
    no_space = name.replace(' ', '').replace('-', '').upper()
    if no_space not in variants:
        variants.append(no_space)

    # 하이픈 버전
    hyphen_ver = name.replace(' ', '-').upper()
    if hyphen_ver not in variants:
        variants.append(hyphen_ver)

    # 공백 버전
    space_ver = name.replace('-', ' ').upper()
    if space_ver not in variants:
        variants.append(space_ver)

    return variants


# ============================================================
# DXF 파싱 함수
# ============================================================

def extract_lines(msp):
    """배관 라인 추출 (LINE, POLYLINE, LWPOLYLINE)"""
    lines = []

    for entity in msp:
        etype = entity.dxftype()
        layer = entity.dxf.layer if hasattr(entity.dxf, 'layer') else ''

        if etype == 'LINE':
            lines.append({
                "type": "line",
                "points": [
                    [round(entity.dxf.start.x, 1), round(entity.dxf.start.y, 1)],
                    [round(entity.dxf.end.x, 1), round(entity.dxf.end.y, 1)]
                ],
                "layer": layer
            })

        elif etype == 'LWPOLYLINE':
            points = []
            for pt in entity.get_points('xy'):
                points.append([round(pt[0], 1), round(pt[1], 1)])
            if len(points) >= 2:
                lines.append({
                    "type": "polyline",
                    "points": points,
                    "closed": entity.closed,
                    "layer": layer
                })

        elif etype == 'POLYLINE':
            points = []
            for vertex in entity.vertices:
                if hasattr(vertex.dxf, 'location'):
                    loc = vertex.dxf.location
                    points.append([round(loc.x, 1), round(loc.y, 1)])
            if len(points) >= 2:
                lines.append({
                    "type": "polyline",
                    "points": points,
                    "closed": entity.is_closed,
                    "layer": layer
                })

        elif etype == 'CIRCLE':
            lines.append({
                "type": "circle",
                "center": [round(entity.dxf.center.x, 1), round(entity.dxf.center.y, 1)],
                "radius": round(entity.dxf.radius, 1),
                "layer": layer
            })

        elif etype == 'ARC':
            lines.append({
                "type": "arc",
                "center": [round(entity.dxf.center.x, 1), round(entity.dxf.center.y, 1)],
                "radius": round(entity.dxf.radius, 1),
                "start_angle": round(entity.dxf.start_angle, 1),
                "end_angle": round(entity.dxf.end_angle, 1),
                "layer": layer
            })

    return lines


def extract_valves(msp, grid_config=None):
    """밸브 데이터 추출"""
    valves = []

    for entity in msp:
        if entity.dxftype() != 'INSERT':
            continue

        x = entity.dxf.insert.x
        y = entity.dxf.insert.y

        attribs = {}
        if hasattr(entity, 'attribs'):
            for attr in entity.attribs:
                attribs[attr.dxf.tag.upper()] = attr.dxf.text

        # 밸브 판별
        if 'VALVE' in attribs or 'NO.' in attribs or 'V-NUMBER' in entity.dxf.layer.upper():
            valve_id = attribs.get('VALVE', '') + attribs.get('NO.', '')
            if not valve_id:
                valve_id = attribs.get('TAG', '') or attribs.get('NAME', '')

            if not valve_id:
                continue

            valve_type = attribs.get('TYPE', '').upper()
            symbol = VALVE_SYMBOLS.get(valve_type, 'generic')

            valves.append({
                "id": valve_id,
                "type": valve_type or "VALVE",
                "symbol": symbol,
                "size": attribs.get('SIZE', ''),
                "description": attribs.get('DESCRIPTION', ''),
                "x": round(x, 1),
                "y": round(y, 1),
                "grid": xy_to_grid(x, y, grid_config),
                "rotation": round(entity.dxf.rotation, 1) if hasattr(entity.dxf, 'rotation') else 0,
                "layer": entity.dxf.layer,
                "variants": generate_search_variants(valve_id)
            })

    return valves


def extract_instruments(msp, grid_config=None):
    """계기 데이터 추출"""
    instruments = []
    inst_texts = []

    # INST 레이어에서 텍스트 수집
    for entity in msp:
        if entity.dxftype() in ('TEXT', 'MTEXT'):
            layer = entity.dxf.layer if hasattr(entity.dxf, 'layer') else ''

            if entity.dxftype() == 'TEXT':
                text = entity.dxf.text.strip() if hasattr(entity.dxf, 'text') else ''
                x = entity.dxf.insert.x
                y = entity.dxf.insert.y
            else:  # MTEXT
                text = entity.text.strip() if hasattr(entity, 'text') else ''
                x = entity.dxf.insert.x
                y = entity.dxf.insert.y

            if text and 'INST' in layer.upper():
                inst_texts.append({
                    "text": text,
                    "x": x,
                    "y": y,
                    "layer": layer
                })

    # 타입과 번호 분리
    types = []
    numbers = []

    for t in inst_texts:
        text = t['text']
        if text and text[0].isalpha():
            if not re.match(r'[A-Z]+\d+', text):
                types.append(t)
            else:
                # 이미 완전한 계기명
                prefix, type_info = get_instrument_type(text)
                if prefix:
                    instruments.append({
                        "id": text,
                        "type_prefix": prefix,
                        "type_kor": type_info[0],
                        "type_eng": type_info[1],
                        "x": round(t['x'], 1),
                        "y": round(t['y'], 1),
                        "grid": xy_to_grid(t['x'], t['y'], grid_config),
                        "layer": t['layer'],
                        "variants": generate_search_variants(text)
                    })
        elif text and text[0].isdigit():
            numbers.append(t)

    # 타입과 번호 매칭 (인접한 것끼리)
    used_numbers = set()
    distance_threshold = 25

    for type_item in types:
        tx, ty = type_item['x'], type_item['y']
        type_name = type_item['text']

        best_number = None
        best_dist = float('inf')

        for i, num_item in enumerate(numbers):
            if i in used_numbers:
                continue

            nx, ny = num_item['x'], num_item['y']
            dist = math.sqrt((tx - nx)**2 + (ty - ny)**2)

            if dist < best_dist and dist < distance_threshold:
                best_dist = dist
                best_number = (i, num_item)

        if best_number:
            idx, num_item = best_number
            used_numbers.add(idx)

            full_name = f"{type_name} {num_item['text']}"
            prefix, type_info = get_instrument_type(type_name)

            instruments.append({
                "id": full_name,
                "type_prefix": prefix,
                "type_kor": type_info[0] if type_info[0] else '',
                "type_eng": type_info[1] if type_info[1] else '',
                "x": round((tx + num_item['x']) / 2, 1),
                "y": round((ty + num_item['y']) / 2, 1),
                "grid": xy_to_grid(tx, ty, grid_config),
                "layer": type_item['layer'],
                "variants": generate_search_variants(full_name)
            })

    return instruments


def extract_texts(msp, grid_config=None):
    """일반 텍스트 추출"""
    texts = []

    for entity in msp:
        if entity.dxftype() == 'TEXT':
            text = entity.dxf.text.strip() if hasattr(entity.dxf, 'text') else ''
            if text and len(text) > 1:
                x = entity.dxf.insert.x
                y = entity.dxf.insert.y
                height = entity.dxf.height if hasattr(entity.dxf, 'height') else 2.5

                texts.append({
                    "text": text,
                    "x": round(x, 1),
                    "y": round(y, 1),
                    "height": round(height, 1),
                    "rotation": round(entity.dxf.rotation, 1) if hasattr(entity.dxf, 'rotation') else 0,
                    "layer": entity.dxf.layer if hasattr(entity.dxf, 'layer') else ''
                })

        elif entity.dxftype() == 'MTEXT':
            text = entity.text.strip() if hasattr(entity, 'text') else ''
            # MTEXT 포맷 태그 제거
            text = re.sub(r'\\[A-Za-z]+;', '', text)
            text = re.sub(r'\{|\}', '', text)

            if text and len(text) > 1:
                x = entity.dxf.insert.x
                y = entity.dxf.insert.y

                texts.append({
                    "text": text,
                    "x": round(x, 1),
                    "y": round(y, 1),
                    "height": round(entity.dxf.char_height, 1) if hasattr(entity.dxf, 'char_height') else 2.5,
                    "rotation": round(entity.dxf.rotation, 1) if hasattr(entity.dxf, 'rotation') else 0,
                    "layer": entity.dxf.layer if hasattr(entity.dxf, 'layer') else ''
                })

    return texts


def extract_blocks(msp, grid_config=None):
    """장비 블록 추출"""
    blocks = []

    for entity in msp:
        if entity.dxftype() != 'INSERT':
            continue

        x = entity.dxf.insert.x
        y = entity.dxf.insert.y
        block_name = entity.dxf.name
        layer = entity.dxf.layer if hasattr(entity.dxf, 'layer') else ''

        # 밸브가 아닌 블록만
        attribs = {}
        if hasattr(entity, 'attribs'):
            for attr in entity.attribs:
                attribs[attr.dxf.tag.upper()] = attr.dxf.text

        if 'VALVE' in attribs or 'V-NUMBER' in layer.upper():
            continue

        # 시스템 블록 제외
        if block_name in ('ACAD', 'AVE_RENDER', 'AVE_GLOBAL', '*Model_Space', '*Paper_Space'):
            continue

        blocks.append({
            "name": block_name,
            "x": round(x, 1),
            "y": round(y, 1),
            "grid": xy_to_grid(x, y, grid_config),
            "rotation": round(entity.dxf.rotation, 1) if hasattr(entity.dxf, 'rotation') else 0,
            "scale_x": round(entity.dxf.xscale, 2) if hasattr(entity.dxf, 'xscale') else 1,
            "scale_y": round(entity.dxf.yscale, 2) if hasattr(entity.dxf, 'yscale') else 1,
            "layer": layer,
            "attribs": attribs
        })

    return blocks


def calculate_bounds(lines, valves, instruments, texts, blocks):
    """도면 경계 계산"""
    all_x = []
    all_y = []

    for line in lines:
        if line['type'] == 'circle':
            all_x.append(line['center'][0])
            all_y.append(line['center'][1])
        elif line['type'] == 'arc':
            all_x.append(line['center'][0])
            all_y.append(line['center'][1])
        else:
            for pt in line.get('points', []):
                all_x.append(pt[0])
                all_y.append(pt[1])

    for v in valves:
        all_x.append(v['x'])
        all_y.append(v['y'])

    for i in instruments:
        all_x.append(i['x'])
        all_y.append(i['y'])

    for t in texts:
        all_x.append(t['x'])
        all_y.append(t['y'])

    for b in blocks:
        all_x.append(b['x'])
        all_y.append(b['y'])

    if not all_x or not all_y:
        return {"minX": 0, "maxX": 1000, "minY": 0, "maxY": 1000}

    return {
        "minX": round(min(all_x), 1),
        "maxX": round(max(all_x), 1),
        "minY": round(min(all_y), 1),
        "maxY": round(max(all_y), 1)
    }


def parse_dxf_file(filepath):
    """DXF 파일 파싱"""
    filename = os.path.basename(filepath)
    pid_number, system_name = parse_pid_number(filename)

    print(f"파싱 중: {filename}")
    print(f"  P&ID: {pid_number}, 시스템: {system_name}")

    try:
        doc = ezdxf.readfile(filepath)
    except Exception as e:
        print(f"  [오류] DXF 로드 실패: {e}")
        return None

    msp = doc.modelspace()

    # 데이터 추출
    lines = extract_lines(msp)
    valves = extract_valves(msp)
    instruments = extract_instruments(msp)
    texts = extract_texts(msp)
    blocks = extract_blocks(msp)
    bounds = calculate_bounds(lines, valves, instruments, texts, blocks)

    print(f"  라인: {len(lines)}, 밸브: {len(valves)}, 계기: {len(instruments)}, 텍스트: {len(texts)}, 블록: {len(blocks)}")

    return {
        "pid_number": pid_number,
        "name": system_name,
        "filename": filename,
        "grid": DEFAULT_GRID,
        "bounds": bounds,
        "lines": lines,
        "valves": valves,
        "instruments": instruments,
        "texts": texts,
        "blocks": blocks,
        "stats": {
            "lines": len(lines),
            "valves": len(valves),
            "instruments": len(instruments),
            "texts": len(texts),
            "blocks": len(blocks)
        }
    }


def create_pid_index(parsed_files):
    """P&ID 인덱스 생성"""
    index = []

    for data in parsed_files:
        if not data:
            continue

        index.append({
            "pid_number": data["pid_number"],
            "name": data["name"],
            "filename": data["filename"],
            "stats": data["stats"],
            "bounds": data["bounds"]
        })

    # P&ID 번호로 정렬
    index.sort(key=lambda x: x["pid_number"] or "ZZZ")

    return index


# ============================================================
# 메인
# ============================================================

def main():
    # 출력 디렉토리 생성
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # DXF 파일 목록
    dxf_files = []
    for f in os.listdir(DXF_SOURCE_DIR):
        if f.lower().endswith('.dxf'):
            # 특정 파일 필터링 (선택적)
            if len(sys.argv) > 1:
                if sys.argv[1].upper() not in f.upper():
                    continue
            dxf_files.append(os.path.join(DXF_SOURCE_DIR, f))

    print(f"총 {len(dxf_files)}개 DXF 파일 발견")
    print("=" * 60)

    # 파싱
    parsed_files = []
    for filepath in sorted(dxf_files):
        data = parse_dxf_file(filepath)
        if data:
            # 개별 JSON 저장
            pid_num = data["pid_number"] or "unknown"
            output_path = os.path.join(OUTPUT_DIR, f"{pid_num}.json")
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            print(f"  → 저장: {output_path}")

        parsed_files.append(data)
        print()

    # 인덱스 생성
    index = create_pid_index(parsed_files)
    index_path = os.path.join(OUTPUT_DIR, "_index.json")
    with open(index_path, 'w', encoding='utf-8') as f:
        json.dump(index, f, ensure_ascii=False, indent=2)

    print("=" * 60)
    print(f"완료! 총 {len([p for p in parsed_files if p])}개 파일 변환")
    print(f"인덱스: {index_path}")


if __name__ == "__main__":
    main()
