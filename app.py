#!/usr/bin/env python3
"""
Control Logic Editor - PyWebView 앱
PyWebView js_api를 통한 Python-JavaScript 직접 통신
"""

import os
import sys
import json
import csv
import shutil
from pathlib import Path

# 현재 실행 경로 (EXE 또는 스크립트 위치)
if getattr(sys, 'frozen', False):
    # EXE 실행 시
    BASE_DIR = Path(sys.executable).parent
    # 번들된 리소스 경로 (_internal 폴더 안)
    BUNDLE_DIR = Path(sys._MEIPASS)
else:
    # 스크립트 실행 시
    BASE_DIR = Path(__file__).parent
    BUNDLE_DIR = BASE_DIR

SAVE_DIR = BASE_DIR / "saved"
DATA_DIR = BASE_DIR / "data"

# 폴더 생성
SAVE_DIR.mkdir(exist_ok=True)
DATA_DIR.mkdir(exist_ok=True)

# 번들된 데이터를 사용자 폴더로 복사 (최초 실행 시)
def init_data_files():
    """번들된 초기 데이터 파일을 사용자 폴더로 복사"""
    bundle_data = BUNDLE_DIR / "data"
    if not bundle_data.exists():
        return

    for src_file in bundle_data.glob("*.json"):
        dst_file = DATA_DIR / src_file.name
        # 파일이 없으면 복사 (기존 사용자 데이터 보존)
        if not dst_file.exists():
            shutil.copy2(src_file, dst_file)
            print(f"[INIT] 복사됨: {src_file.name}")

init_data_files()


class Api:
    """JavaScript에서 호출할 수 있는 Python API"""

    def get_base_path(self):
        """기본 경로 반환"""
        return str(BASE_DIR)

    # ============ 데이터 API (templates, patterns, recent) ============

    def load_data(self, data_type):
        """데이터 파일 로드 (templates, patterns, recent, pid/xxx 등)"""
        try:
            # 경로에 / 포함되면 하위 폴더 지원
            if '/' in data_type:
                file_path = DATA_DIR / data_type
            else:
                file_path = DATA_DIR / f"{data_type}.json"

            if file_path.exists():
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = json.load(f)
                return {'success': True, 'data': content}
            else:
                return {'success': True, 'data': None}
        except Exception as e:
            return {'success': False, 'error': str(e)}

    def save_data(self, data_type, content):
        """데이터 파일 저장"""
        try:
            file_path = DATA_DIR / f"{data_type}.json"
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(content, f, ensure_ascii=False, indent=2)
            return {'success': True, 'path': str(file_path)}
        except Exception as e:
            return {'success': False, 'error': str(e)}

    def load_file_as_base64(self, file_path):
        """파일을 base64로 로드 (이미지 등)"""
        import base64
        try:
            full_path = BASE_DIR / file_path
            print(f"[API] load_file_as_base64: {file_path}")
            print(f"[API] full_path: {full_path}")
            print(f"[API] exists: {full_path.exists()}")

            if full_path.exists():
                with open(full_path, 'rb') as f:
                    data = base64.b64encode(f.read()).decode('utf-8')
                print(f"[API] 로드 성공: {len(data)} bytes (base64)")
                return {'success': True, 'data': data}
            else:
                print(f"[API] 파일 없음: {full_path}")
                return {'success': False, 'error': f'File not found: {full_path}'}
        except Exception as e:
            print(f"[API] 예외: {e}")
            return {'success': False, 'error': str(e)}

    # ============ 파일 저장/로드 API ============

    def save_file(self, filename, content, subfolder=''):
        """파일 저장"""
        try:
            if subfolder:
                save_path = SAVE_DIR / subfolder
                save_path.mkdir(parents=True, exist_ok=True)
            else:
                save_path = SAVE_DIR

            file_path = save_path / filename
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(content, f, ensure_ascii=False, indent=2)

            return {
                'success': True,
                'path': str(file_path),
                'filename': filename
            }
        except Exception as e:
            return {'success': False, 'error': str(e)}

    def save_text_file(self, filename, content, subfolder=''):
        """텍스트 파일 저장"""
        try:
            if subfolder:
                save_path = SAVE_DIR / subfolder
                save_path.mkdir(parents=True, exist_ok=True)
            else:
                save_path = SAVE_DIR

            file_path = save_path / filename
            with open(file_path, 'w', encoding='utf-8-sig') as f:
                f.write(content)

            return {
                'success': True,
                'path': str(file_path),
                'filename': filename
            }
        except Exception as e:
            return {'success': False, 'error': str(e)}

    def load_file(self, filename):
        """저장된 파일 로드"""
        try:
            file_path = SAVE_DIR / filename
            if not file_path.exists():
                return {'success': False, 'error': 'File not found'}

            with open(file_path, 'r', encoding='utf-8') as f:
                content = json.load(f)

            return {'success': True, 'data': content}
        except Exception as e:
            return {'success': False, 'error': str(e)}

    def list_files(self):
        """저장된 파일 목록"""
        try:
            files = []
            for file_path in SAVE_DIR.rglob('*.json'):
                stat = file_path.stat()
                rel_path = file_path.relative_to(SAVE_DIR)
                files.append({
                    'filename': file_path.name,
                    'path': str(rel_path),
                    'modified': stat.st_mtime,
                    'size': stat.st_size
                })
            files.sort(key=lambda x: x['modified'], reverse=True)
            return {'success': True, 'files': files}
        except Exception as e:
            return {'success': False, 'error': str(e)}

    # ============ 도면 파일 API ============

    def read_text_file(self, relative_path):
        """텍스트 파일 읽기 (CSV, JSON 등)"""
        try:
            file_path = BASE_DIR / relative_path
            if not file_path.exists():
                return {'success': False, 'error': 'File not found'}

            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()

            return {'success': True, 'data': content}
        except Exception as e:
            return {'success': False, 'error': str(e)}

    def read_json_file(self, relative_path):
        """JSON 파일 읽기"""
        try:
            file_path = BASE_DIR / relative_path
            if not file_path.exists():
                return {'success': False, 'error': 'File not found'}

            with open(file_path, 'r', encoding='utf-8') as f:
                content = json.load(f)

            return {'success': True, 'data': content}
        except Exception as e:
            return {'success': False, 'error': str(e)}

    def file_exists(self, relative_path):
        """파일 존재 여부 확인"""
        file_path = BASE_DIR / relative_path
        return file_path.exists()

    def get_page_blocks(self, layout_csv_path):
        """
        특정 도면 레이아웃 CSV에서 블록 목록을 추출하고
        ovation_symbols.json(심볼사전)의 포트 설명과 결합하여 반환.

        반환 형식:
        {
          "OCB0088016": {
            "block_type": "ABS",
            "block_desc": "절대값 블록 — ...",
            "ports": {
              "IN":  { "direction": "input",  "description": "입력값",     "tag": "TIT2641", "tag_type": "온도계기" },
              "OUT": { "direction": "output", "description": "절대값 출력", "tag": "SIT2681", "tag_type": "속도지시계" }
            }
          }
        }
        """
        import math, re as _re
        import_re = _re   # equipment 문자열 처리용

        try:
            # ── 1. layout CSV 로드 ──────────────────────────────────────────
            csv_path = BASE_DIR / layout_csv_path
            if not csv_path.exists():
                return {'success': False, 'error': f'파일 없음: {layout_csv_path}'}

            rows = []
            with open(csv_path, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                for r in reader:
                    cleaned = {k.lstrip('\ufeff'): v for k, v in r.items()}
                    rows.append(cleaned)

            # ── 2. 요소 타입별 분류 ────────────────────────────────────────
            ocb_blocks  = [r for r in rows if r.get('type') == 'OCB_BLOCK']
            alg_blocks  = [r for r in rows if r.get('type') == 'ALG_BLOCK']
            block_types = [r for r in rows if r.get('type') == 'BLOCK_TYPE']
            ports       = [r for r in rows if r.get('type') == 'PORT']
            ref_signals = [r for r in rows if r.get('type') == 'REF_SIGNAL']
            all_blocks  = ocb_blocks + alg_blocks

            # 공통 포트명 패턴 — SIGNAL로 잘못 분류된 경우 제외
            # (IN1, IN2, OUT, A, G 등은 실제 계기 태그가 아님)
            # N_1813_2211 형식은 Ovation 내부 로직 노드 참조 (NOT/AND 게이트 출력)
            _PORT_NAMES = _re.compile(
                r'^(IN\d*|OUT\d*|[A-G]|FLAG|YES|NO|STPT|SP|PV|MV|T|NUM|DEN|H|L|'
                r'ENBL|INIT|RST|SET|CLR|Q|QN|CK|D|J|K|R|S|TRIG|HOLD|TRACK|MODE|'
                r'AUTO|MAN|CAS|X|Y|Z|A\d+|B\d+|C\d+|'
                r'[A-Z]_\d+_\d+)$', _re.IGNORECASE   # 내부 노드 (N_1813_2211 등)
            )
            signals = [r for r in rows
                       if r.get('type') == 'SIGNAL'
                       and not _PORT_NAMES.match(r.get('text', '').strip())]
            all_signals = signals + ref_signals

            def dist(a, b):
                return math.sqrt((float(a['cx'])-float(b['cx']))**2 + (float(a['cy'])-float(b['cy']))**2)

            def nearest(elem, candidates, radius=200):
                best, bd = None, radius
                for c in candidates:
                    d = dist(elem, c)
                    if d < bd:
                        best, bd = c, d
                return best

            # BLOCK_TYPE 근접 매핑 제거 — 위치 기반 타입 추정은 오류 잦음
            # 타입 식별은 JS identifyBlockType(canvas 포트 패턴 매칭)이 담당
            block_type_map = {blk['text']: '' for blk in all_blocks}

            # ── 4. PORT → 가장 가까운 SIGNAL 매핑 ─────────────────────────
            #   우선순위: x오차 <40px인 것 중 가장 가까운 것
            def match_signal(port):
                px, py = float(port['cx']), float(port['cy'])
                best_x, bxd = None, 9999
                best_a, bad = None, 9999
                for s in all_signals:
                    sx, sy = float(s['cx']), float(s['cy'])
                    dx = abs(px - sx)
                    d  = math.sqrt((px-sx)**2 + (py-sy)**2)
                    if dx < 40 and d < bxd:
                        best_x, bxd = s, d
                    if d < bad:
                        best_a, bad = s, d
                result = best_x if best_x else (best_a if bad <= 120 else None)
                return result

            # PORT → SIGNAL 매핑 테이블
            port_signal = {}   # port element id → (port_name, signal_entry)
            for p in ports:
                sig = match_signal(p)
                if not sig:
                    continue
                tag = sig['text']
                sig_type = sig.get('type', 'SIGNAL')
                entry = {'tag': tag, 'sig_type': sig_type}
                if sig_type == 'REF_SIGNAL':
                    import re
                    m = re.match(r'^D0*(\d+)-(\d+)-(\d+)$', tag, re.I)
                    if m:
                        entry['ref_drawing'] = f"{m.group(1)}-{m.group(2)}"
                        entry['ref_index']   = m.group(3)
                port_signal[id(p)] = (p['text'], entry, p)

            # ── 5. PORT를 가장 가까운 블록에 귀속 ────────────────────────
            block_port_map = {}   # block_name → {port_name: signal_entry}
            for pid_val, (pname, sig_entry, port) in port_signal.items():
                blk = nearest(port, all_blocks, radius=300)
                bname = blk['text'] if blk else '__unassigned__'
                block_port_map.setdefault(bname, {})[pname] = sig_entry

            # ── 6. 심볼사전 + 태그 컨텍스트 로드 ───────────────────────
            sym_path = DATA_DIR / 'ovation_symbols.json'
            ovation = {}
            if sym_path.exists():
                with open(sym_path, 'r', encoding='utf-8') as f:
                    ovation = json.load(f)

            tag_ctx_path = DATA_DIR / 'tag_context.json'
            tag_ctx = {}
            if tag_ctx_path.exists():
                with open(tag_ctx_path, 'r', encoding='utf-8') as f:
                    tag_ctx = json.load(f)

            # 태그 타입 추론 (ISA 접두사)
            ISA_PREFIX = {
                'TIT':'온도계기','TI':'온도지시','TT':'온도송신','TC':'온도제어','TE':'온도요소',
                'PIT':'압력계기','PI':'압력지시','PT':'압력송신','PC':'압력제어','PDI':'차압지시',
                'FIT':'유량계기','FI':'유량지시','FT':'유량송신','FC':'유량제어','FCV':'유량제어밸브',
                'LIT':'레벨계기','LI':'레벨지시','LT':'레벨송신','LC':'레벨제어',
                'AIT':'분석계기','AI':'분석지시','AT':'분석송신',
                'SIT':'속도계기','SI':'속도지시','ST':'속도송신',
                'XV':'차단밸브','HV':'핸드밸브','PV':'공정밸브','CV':'제어밸브',
                'HS':'핸드스위치','HIC':'핸드지시제어',
                'ZI':'위치지시','ZT':'위치송신',
            }
            def tag_type(tag):
                m = _re.match(r'^([A-Z]+)', tag.upper())
                if not m: return ''
                prefix = m.group(1)
                for l in [4, 3, 2, 1]:
                    if prefix[:l] in ISA_PREFIX:
                        return ISA_PREFIX[prefix[:l]]
                return ''

            # ── 7. 최종 결합 ──────────────────────────────────────────────
            result = {}
            for blk in all_blocks:
                bname = blk['text']
                btype = block_type_map.get(bname, '')
                sym   = ovation.get(btype, {})

                # 심볼사전 포트 설명을 딕셔너리로 정리
                sym_ports = {}
                for p in sym.get('ports', []):
                    sym_ports[p['name']] = {
                        'direction':   p.get('direction', ''),
                        'description': p.get('description', ''),
                    }

                # 신호 컨텍스트 병합
                connected = block_port_map.get(bname, {})
                merged_ports = {}

                # 심볼사전에 정의된 포트 기준으로 먼저 채우기
                for pname, pinfo in sym_ports.items():
                    entry = dict(pinfo)
                    if pname in connected:
                        sig = connected[pname]
                        entry['tag'] = sig['tag']
                        if sig.get('sig_type') == 'SIGNAL':
                            tt = tag_type(sig['tag'])
                            if tt: entry['tag_type'] = tt
                        elif sig.get('sig_type') == 'REF_SIGNAL':
                            entry['ref_drawing'] = sig.get('ref_drawing','')
                            entry['ref_index']   = sig.get('ref_index','')
                    merged_ports[pname] = entry

                # 도면에는 있으나 심볼사전에 없는 포트도 추가
                for pname, sig in connected.items():
                    if pname not in merged_ports:
                        entry = {'direction': '', 'description': '', 'tag': sig['tag']}
                        if sig.get('sig_type') == 'SIGNAL':
                            tt = tag_type(sig['tag'])
                            if tt: entry['tag_type'] = tt
                        elif sig.get('sig_type') == 'REF_SIGNAL':
                            entry['ref_drawing'] = sig.get('ref_drawing','')
                            entry['ref_index']   = sig.get('ref_index','')
                        merged_ports[pname] = entry

                # tag_context로 포트 설비명 보강
                equipments, ttypes = [], set()
                for pinfo in merged_ports.values():
                    t = pinfo.get('tag', '')
                    if not t:
                        continue
                    ctx = tag_ctx.get(t, {})
                    if ctx.get('equipment'):
                        pinfo['equipment'] = ctx['equipment']
                        short = import_re.sub(r'\(\d+\)\s*$', '', ctx['equipment']).strip()
                        if short not in equipments:
                            equipments.append(short)
                    if ctx.get('primary_drawing'):
                        pinfo['src_drawing'] = ctx['primary_drawing']
                    if not pinfo.get('tag_type') and ctx.get('tag_type'):
                        pinfo['tag_type'] = ctx['tag_type']
                    tt = pinfo.get('tag_type', '')
                    if tt:
                        ttypes.add(tt)

                # 블록 역할 추론
                ROLE_TMPL = {
                    'AND': '{} 조건 AND', 'OR': '{} 조건 OR', 'N': '{} 조건 반전',
                    'H': '{} H값 선택', 'L': '{} L값 선택', 'T': '{} 신호 전달',
                    'K': '{} 게인 조정', 'X': '{} 신호 승산', 'SUM': '{} 합산', 'ABS': '{} 절대값',
                }
                subj = ' / '.join(equipments[:2]) if equipments else (' / '.join(list(ttypes)[:1]) if ttypes else '')
                tmpl = ROLE_TMPL.get(btype, '')
                block_role = tmpl.format(subj) if (tmpl and subj) else (f'{subj}' if subj else '')

                if btype or merged_ports:
                    result[bname] = {
                        'block_type':     btype,
                        'block_raw_type': blk.get('type', ''),
                        'block_desc':     sym.get('desc', '') if sym else '',
                        'block_role':     block_role,
                        'ports':          merged_ports,
                    }

            return {'success': True, 'blocks': result, 'total': len(result)}

        except Exception as e:
            import traceback
            return {'success': False, 'error': str(e), 'trace': traceback.format_exc()}

    def load_port_dict(self):
        """포트사전 로드 (data/block_port_dict.json)"""
        try:
            path = DATA_DIR / 'block_port_dict.json'
            if not path.exists():
                return {'success': True, 'data': {}}
            with open(path, 'r', encoding='utf-8') as f:
                return {'success': True, 'data': json.load(f)}
        except Exception as e:
            return {'success': False, 'error': str(e)}

    def save_port_dict(self, data):
        """포트사전 저장 (data/block_port_dict.json) — 기존 데이터에 병합"""
        try:
            path = DATA_DIR / 'block_port_dict.json'
            existing = {}
            if path.exists():
                with open(path, 'r', encoding='utf-8') as f:
                    existing = json.load(f)
            existing.update(data)   # 병합 (동일 블록은 덮어쓰기)
            with open(path, 'w', encoding='utf-8') as f:
                json.dump(existing, f, ensure_ascii=False, indent=2)
            return {'success': True, 'total': len(existing)}
        except Exception as e:
            return {'success': False, 'error': str(e)}

    def load_tag_context(self):
        """태그 컨텍스트 로드 (data/tag_context.json) — 계기태그별 설비명/타입/도면"""
        try:
            path = DATA_DIR / 'tag_context.json'
            if not path.exists():
                return {'success': True, 'data': {}}
            with open(path, 'r', encoding='utf-8') as f:
                return {'success': True, 'data': json.load(f)}
        except Exception as e:
            return {'success': False, 'error': str(e)}

    def save_port_dict_full(self, data):
        """포트사전 전체 저장 (덮어쓰기 — 삭제/초기화용)"""
        try:
            path = DATA_DIR / 'block_port_dict.json'
            with open(path, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            return {'success': True, 'total': len(data)}
        except Exception as e:
            return {'success': False, 'error': str(e)}

    def load_block_dict(self):
        """블록사전 로드 (data/block_dict.json)"""
        try:
            path = DATA_DIR / 'block_dict.json'
            if not path.exists():
                return {'success': True, 'data': {}}
            with open(path, 'r', encoding='utf-8') as f:
                return {'success': True, 'data': json.load(f)}
        except Exception as e:
            return {'success': False, 'error': str(e)}

    def save_block_dict(self, data):
        """블록사전 저장 (data/block_dict.json) — 기존 데이터에 병합"""
        try:
            path = DATA_DIR / 'block_dict.json'
            existing = {}
            if path.exists():
                with open(path, 'r', encoding='utf-8') as f:
                    existing = json.load(f)
            # data: { anchor: [ {drawing, equipment, memo, ...}, ... ] }
            for anchor, entries in data.items():
                if anchor not in existing:
                    existing[anchor] = []
                if isinstance(entries, list):
                    for new_entry in entries:
                        drw = new_entry.get('drawing', '')
                        # 같은 도면 항목 교체, 없으면 추가
                        replaced = False
                        for i, ex in enumerate(existing[anchor]):
                            if ex.get('drawing') == drw:
                                existing[anchor][i] = new_entry
                                replaced = True
                                break
                        if not replaced:
                            existing[anchor].append(new_entry)
            with open(path, 'w', encoding='utf-8') as f:
                json.dump(existing, f, ensure_ascii=False, indent=2)
            return {'success': True, 'total': len(existing)}
        except Exception as e:
            return {'success': False, 'error': str(e)}

    def scan_all_drawings(self):
        """모든 도면에서 기능 블록 타입 수집 (layout.csv 파일 파싱)"""
        try:
            drawings_dir = BASE_DIR / "drawings"
            if not drawings_dir.exists():
                return {'success': False, 'error': 'drawings 폴더가 없습니다'}

            block_types = {}
            scanned_files = 0

            # drawings 폴더 하위의 모든 *_layout.csv 파일 검색
            for csv_file in drawings_dir.rglob("*_layout.csv"):
                try:
                    with open(csv_file, 'r', encoding='utf-8') as f:
                        reader = csv.DictReader(f)

                        scanned_files += 1
                        page_path = str(csv_file.parent.relative_to(drawings_dir))

                        for row in reader:
                            row_type = row.get('type', '')
                            text = row.get('text', '').strip()

                            # BLOCK_TYPE인 행에서 기능 블록 이름 수집 (T, OR, AND, SUB 등)
                            if row_type == 'BLOCK_TYPE' and text:
                                block_id = text.upper()  # 대문자로 정규화

                                if block_id not in block_types:
                                    block_types[block_id] = {
                                        'id': block_id,
                                        'name': block_id,
                                        'instances': [],
                                        'count': 0
                                    }

                                block_types[block_id]['count'] += 1

                                # 인스턴스 정보 추가 (위치)
                                block_types[block_id]['instances'].append({
                                    'path': page_path,
                                    'cx': row.get('cx', ''),
                                    'cy': row.get('cy', '')
                                })

                except Exception as e:
                    print(f"[SCAN] CSV 파일 읽기 실패: {csv_file} - {e}")
                    continue

            return {
                'success': True,
                'blockTypes': block_types,
                'scannedFiles': scanned_files,
                'totalTypes': len(block_types)
            }
        except Exception as e:
            return {'success': False, 'error': str(e)}


    # ============ MISO API 연동 ============

    def miso_load_prompt(self):
        """MISO 분석 프롬프트 로드 (data/miso_prompt.md)"""
        prompt_path = DATA_DIR / 'miso_prompt.md'
        try:
            if prompt_path.exists():
                with open(prompt_path, 'r', encoding='utf-8') as f:
                    return {'success': True, 'data': f.read()}
            return {'success': True, 'data': ''}
        except Exception as e:
            return {'success': False, 'error': str(e)}

    def miso_save_prompt(self, content):
        """MISO 분석 프롬프트 저장"""
        prompt_path = DATA_DIR / 'miso_prompt.md'
        try:
            with open(prompt_path, 'w', encoding='utf-8') as f:
                f.write(content)
            return {'success': True}
        except Exception as e:
            return {'success': False, 'error': str(e)}

    def miso_load_config(self):
        """MISO 설정 로드"""
        config_path = DATA_DIR / 'miso_config.json'
        try:
            if config_path.exists():
                with open(config_path, 'r', encoding='utf-8') as f:
                    return {'success': True, 'data': json.load(f)}
            return {'success': True, 'data': {'api_key': '', 'api_url': 'https://api.holdings.miso.gs/ext/v1/chat', 'user': 'editor_user'}}
        except Exception as e:
            return {'success': False, 'error': str(e)}

    def miso_save_config(self, config):
        """MISO 설정 저장"""
        config_path = DATA_DIR / 'miso_config.json'
        try:
            with open(config_path, 'w', encoding='utf-8') as f:
                json.dump(config, f, ensure_ascii=False, indent=2)
            return {'success': True}
        except Exception as e:
            return {'success': False, 'error': str(e)}

    def miso_load_analyses(self):
        """MISO 분석 결과 로드"""
        path = DATA_DIR / 'miso_analyses.json'
        try:
            if path.exists():
                with open(path, 'r', encoding='utf-8') as f:
                    return {'success': True, 'data': json.load(f)}
            return {'success': True, 'data': {}}
        except Exception as e:
            return {'success': False, 'error': str(e)}

    def miso_save_analyses(self, data):
        """MISO 분석 결과 저장"""
        path = DATA_DIR / 'miso_analyses.json'
        try:
            with open(path, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            return {'success': True}
        except Exception as e:
            return {'success': False, 'error': str(e)}

    # MISO 비동기 작업 저장소 (클래스 변수)
    _miso_tasks = {}

    def miso_chat_async(self, query, conversation_id='', drawing_num='', analysis_timestamp=''):
        """MISO Chat API 비동기 — 즉시 task_id 반환, 스레드에서 직접 HTTP 호출 + 파일 저장"""
        import threading, uuid, urllib.request, urllib.error
        task_id = str(uuid.uuid4())[:8]
        Api._miso_tasks[task_id] = {'status': 'running', 'result': None}

        # 설정 미리 읽기 (메인 스레드에서)
        config_path = DATA_DIR / 'miso_config.json'
        try:
            with open(config_path, 'r', encoding='utf-8') as f:
                config = json.load(f)
        except Exception:
            Api._miso_tasks[task_id] = {'status': 'done', 'result': {'success': False, 'error': 'MISO 설정 없음'}}
            return {'success': True, 'task_id': task_id}

        api_key = config.get('api_key', '')
        api_url = config.get('api_url', 'https://api.holdings.miso.gs/ext/v1/chat')
        user = config.get('user', 'editor_user')

        def run():
            # 스레드에서 직접 HTTP 호출 (self 사용 안 함)
            result = {'success': False, 'error': '알 수 없는 오류'}
            try:
                payload = json.dumps({
                    'query': query, 'mode': 'blocking',
                    'conversation_id': conversation_id,
                    'user': user, 'inputs': {}
                }).encode('utf-8')
                req = urllib.request.Request(api_url, data=payload, headers={
                    'Content-Type': 'application/json',
                    'Authorization': f'Bearer {api_key}'
                })
                with urllib.request.urlopen(req, timeout=300) as resp:
                    r = json.loads(resp.read().decode('utf-8'))
                    answer = ''
                    conv_id = conversation_id
                    if isinstance(r.get('data'), dict):
                        answer = r['data'].get('answer', r['data'].get('text', ''))
                        conv_id = r['data'].get('conversation_id', conversation_id)
                    if not answer:
                        answer = r.get('answer', r.get('message', ''))
                        conv_id = r.get('conversation_id', conv_id)
                    result = {'success': True, 'answer': answer, 'conversation_id': conv_id}
            except urllib.error.HTTPError as e:
                body = e.read().decode('utf-8', errors='replace')[:200]
                result = {'success': False, 'error': f'API 오류 ({e.code}): {body}'}
            except Exception as e:
                result = {'success': False, 'error': str(e)[:200]}

            Api._miso_tasks[task_id] = {'status': 'done', 'result': result}
            print(f'[MISO] 스레드 완료: success={result.get("success")}, answer_len={len(result.get("answer",""))}')

            # 파일에 직접 저장
            if drawing_num and analysis_timestamp:
                try:
                    path = DATA_DIR / 'miso_analyses.json'
                    analyses = {}
                    if path.exists():
                        with open(path, 'r', encoding='utf-8') as f:
                            analyses = json.load(f)
                    entry = analyses.get(drawing_num)
                    if entry and entry.get('analyses'):
                        for a in entry['analyses']:
                            if a.get('timestamp') == analysis_timestamp:
                                if result.get('success') and result.get('answer'):
                                    a['status'] = '완료'
                                    a['answer'] = result['answer']
                                    a['label'] = a.get('label', '').replace('(분석중...)', '').strip()
                                    a['conversation_id'] = result.get('conversation_id', '')
                                    entry['status'] = '완료'
                                    entry['conversation_id'] = result.get('conversation_id', '')
                                else:
                                    a['status'] = '오류'
                                    a['answer'] = result.get('error', '응답 없음')
                                    a['label'] = a.get('label', '').replace('(분석중...)', '(오류)')
                                    entry['status'] = '오류'
                                break
                        with open(path, 'w', encoding='utf-8') as f:
                            json.dump(analyses, f, ensure_ascii=False, indent=2)
                        print(f'[MISO] 파일 저장 완료: {drawing_num}')
                except Exception as e:
                    print(f'[MISO] 파일 저장 오류: {e}')

        t = threading.Thread(target=run, daemon=True)
        t.start()
        return {'success': True, 'task_id': task_id}

    def miso_check_task(self, task_id):
        """비동기 작업 결과 확인"""
        task = Api._miso_tasks.get(task_id)
        if not task:
            return {'success': False, 'error': 'Task not found'}
        if task['status'] == 'running':
            return {'success': True, 'status': 'running'}
        result = task['result']
        del Api._miso_tasks[task_id]
        return {'success': True, 'status': 'done', 'result': result}

    def miso_chat(self, query, conversation_id=''):
        """MISO Chat API 호출 (urllib 사용, CORS 우회)"""
        import urllib.request
        import urllib.error

        # 설정 로드
        config_path = DATA_DIR / 'miso_config.json'
        try:
            with open(config_path, 'r', encoding='utf-8') as f:
                config = json.load(f)
        except Exception:
            return {'success': False, 'error': 'MISO 설정 파일을 찾을 수 없습니다. 설정에서 API 키를 입력하세요.'}

        api_key = config.get('api_key', '')
        api_url = config.get('api_url', 'https://api.holdings.miso.gs/ext/v1/chat')
        user = config.get('user', 'editor_user')

        if not api_key:
            return {'success': False, 'error': 'MISO API 키가 설정되지 않았습니다. 미소사전 설정에서 입력하세요.'}

        payload = json.dumps({
            'query': query,
            'mode': 'blocking',
            'conversation_id': conversation_id,
            'user': user,
            'inputs': {}
        }).encode('utf-8')

        req = urllib.request.Request(
            api_url,
            data=payload,
            headers={
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {api_key}'
            }
        )

        try:
            with urllib.request.urlopen(req, timeout=300) as resp:
                result = json.loads(resp.read().decode('utf-8'))
                # MISO 응답: data.answer 또는 answer 또는 data.outputs.text
                answer = ''
                conv_id = conversation_id
                if isinstance(result.get('data'), dict):
                    answer = result['data'].get('answer', result['data'].get('text', ''))
                    conv_id = result['data'].get('conversation_id', conversation_id)
                if not answer:
                    answer = result.get('answer', result.get('message', ''))
                    conv_id = result.get('conversation_id', conv_id)
                return {'success': True, 'answer': answer, 'conversation_id': conv_id}
        except urllib.error.HTTPError as e:
            body = e.read().decode('utf-8', errors='replace')
            return {'success': False, 'error': f'MISO API 오류 ({e.code}): {body[:200]}'}
        except urllib.error.URLError as e:
            return {'success': False, 'error': f'네트워크 오류: {str(e.reason)}'}
        except Exception as e:
            return {'success': False, 'error': f'MISO 요청 실패: {str(e)}'}


def main():
    import webview

    api = Api()

    # PyWebView 윈도우 생성 (로컬 HTML 파일 직접 로드)
    # EXE 실행 시 번들된 파일은 BUNDLE_DIR에 있음
    html_path = BUNDLE_DIR / "editor.html"

    window = webview.create_window(
        '위드인천에너지 에디터',
        str(html_path),
        js_api=api,
        width=1400,
        height=900,
        resizable=True,
        min_size=(800, 600),
        zoomable=False  # 기본 줌 비활성화 - JS에서 직접 처리
    )

    def apply_icon():
        """윈도우 생성 후 타이틀바 아이콘 + 다크 타이틀바 적용 (Windows 전용)"""
        import time
        import ctypes
        import ctypes.wintypes
        time.sleep(0.3)
        if sys.platform == 'win32':
            try:
                hwnd = ctypes.windll.user32.FindWindowW(None, '위드인천에너지 에디터')
                if hwnd:
                    # 아이콘 적용
                    ico_path = str(BUNDLE_DIR / 'logo' / 'with_logo.ico')
                    hicon = ctypes.windll.user32.LoadImageW(0, ico_path, 1, 0, 0, 0x00000010)
                    if hicon:
                        ctypes.windll.user32.SendMessageW(hwnd, 0x0080, 0, hicon)
                        ctypes.windll.user32.SendMessageW(hwnd, 0x0080, 1, hicon)

                    # 다크 모드 타이틀바
                    dwm = ctypes.windll.dwmapi
                    # DWMWA_USE_IMMERSIVE_DARK_MODE = 20
                    dark_mode = ctypes.c_int(1)
                    dwm.DwmSetWindowAttribute(hwnd, 20, ctypes.byref(dark_mode), ctypes.sizeof(dark_mode))

                    # 타이틀바 배경색 (COLORREF: 0x00BBGGRR) - #0d1117 → RGB(13,17,23) → 0x0017110D
                    # DWMWA_CAPTION_COLOR = 35
                    caption_color = ctypes.c_int(0x0017110D)
                    dwm.DwmSetWindowAttribute(hwnd, 35, ctypes.byref(caption_color), ctypes.sizeof(caption_color))

                    # 타이틀바 텍스트 색상 (회색) - DWMWA_TEXT_COLOR = 36
                    text_color = ctypes.c_int(0x009E948B)  # #8b949e
                    dwm.DwmSetWindowAttribute(hwnd, 36, ctypes.byref(text_color), ctypes.sizeof(text_color))
            except Exception:
                pass

    webview.start(debug=True, func=apply_icon, private_mode=False, storage_path=str(BASE_DIR / 'webview_data'))


if __name__ == '__main__':
    main()
