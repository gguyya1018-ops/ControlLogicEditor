"""
P&ID 검색 인덱스 생성 스크립트
- 모든 P&ID JSON 파일에서 밸브/계기 데이터 추출
- 검색에 필요한 최소 정보만 포함한 인덱스 파일 생성
"""

import json
import os
from pathlib import Path

def main():
    pid_dir = Path(__file__).parent.parent / 'data' / 'pid'
    output_file = pid_dir / '_search_index.json'

    search_index = {
        'valves': [],
        'instruments': []
    }

    # 모든 P&ID JSON 파일 처리
    for json_file in sorted(pid_dir.glob('PI-M-*.json')):
        try:
            with open(json_file, 'r', encoding='utf-8') as f:
                data = json.load(f)

            pid_number = data.get('pid_number', '')
            pid_name = data.get('name', '')

            # 밸브 추출
            valves = data.get('valves', [])
            for v in valves:
                if v.get('id'):
                    search_index['valves'].append({
                        'id': v['id'],
                        'type': v.get('type', ''),
                        'pid': pid_number,
                        'name': pid_name
                    })

            # 계기 추출
            instruments = data.get('instruments', [])
            for inst in instruments:
                if inst.get('id'):
                    search_index['instruments'].append({
                        'id': inst['id'],
                        'type': inst.get('type', ''),
                        'type_kor': inst.get('type_kor', ''),
                        'pid': pid_number,
                        'name': pid_name
                    })

            print(f"[OK] {json_file.name}: 밸브 {len(valves)}, 계기 {len(instruments)}")

        except Exception as e:
            print(f"[ERROR] {json_file.name}: {e}")

    # 결과 저장
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(search_index, f, ensure_ascii=False, indent=2)

    total_valves = len(search_index['valves'])
    total_instruments = len(search_index['instruments'])
    print(f"\n검색 인덱스 생성 완료: {output_file}")
    print(f"총 밸브: {total_valves}, 총 계기: {total_instruments}")

if __name__ == '__main__':
    main()
