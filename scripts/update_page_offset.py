"""
P&ID 페이지 매핑 오프셋 조정
- PDF 앞에 표지/목차 페이지가 있으면 오프셋 적용
"""

import json
from pathlib import Path

def update_offset(offset=2):
    """
    PDF 페이지 오프셋 적용
    offset=2: PDF 앞에 2페이지(표지, 목차 등)가 있음

    예: PI-M-001은 PDF 3페이지, PI-M-007은 PDF 9페이지
    """
    base_dir = Path(__file__).parent.parent
    index_path = base_dir / "data" / "pid" / "_index.json"
    mapping_path = base_dir / "data" / "pid" / "_page_mapping.json"

    # 인덱스 로드
    with open(index_path, 'r', encoding='utf-8') as f:
        index = json.load(f)

    mapping = {}

    for item in index:
        pid = item.get('pid_number')
        if not pid:
            continue

        old_page = item.get('pdf_page', 0)
        new_page = old_page + offset

        item['pdf_page'] = new_page
        mapping[pid] = new_page

        print(f"{pid}: {old_page} → {new_page}")

    # 저장
    with open(index_path, 'w', encoding='utf-8') as f:
        json.dump(index, f, ensure_ascii=False, indent=2)

    with open(mapping_path, 'w', encoding='utf-8') as f:
        json.dump(mapping, f, ensure_ascii=False, indent=2)

    print(f"\n오프셋 +{offset} 적용 완료")
    print(f"인덱스: {index_path}")
    print(f"매핑: {mapping_path}")

if __name__ == "__main__":
    import sys
    offset = int(sys.argv[1]) if len(sys.argv) > 1 else 2
    update_offset(offset)
