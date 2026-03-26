"""
P&ID 번호와 PDF 페이지 번호 매핑 생성
- P&ID 인덱스에 pdf_page 필드 추가
"""

import json
from pathlib import Path

def create_mapping():
    base_dir = Path(__file__).parent.parent
    index_path = base_dir / "data" / "pid" / "_index.json"

    with open(index_path, 'r', encoding='utf-8') as f:
        index = json.load(f)

    # 페이지 매핑 (수동 조정 필요할 수 있음)
    # PI-M-001 ~ PI-M-005는 심볼 페이지 (PDF 1~5페이지)
    # PI-M-006부터 실제 도면 시작

    mapping = {}
    page_num = 1

    for item in index:
        pid = item['pid_number']

        # 기본 매핑: 순서대로
        item['pdf_page'] = page_num
        mapping[pid] = page_num

        print(f"{pid}: page {page_num}")
        page_num += 1

    # 업데이트된 인덱스 저장
    with open(index_path, 'w', encoding='utf-8') as f:
        json.dump(index, f, ensure_ascii=False, indent=2)

    print(f"\n인덱스 업데이트 완료: {index_path}")
    print(f"총 {len(mapping)}개 P&ID 매핑")

    # 매핑 파일 별도 저장
    mapping_path = base_dir / "data" / "pid" / "_page_mapping.json"
    with open(mapping_path, 'w', encoding='utf-8') as f:
        json.dump(mapping, f, ensure_ascii=False, indent=2)

    print(f"매핑 파일 저장: {mapping_path}")

if __name__ == "__main__":
    create_mapping()
