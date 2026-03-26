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
