"""
P&ID PDF를 페이지별 이미지로 분리하는 스크립트
- 각 페이지를 PNG 이미지로 저장
- P&ID 뷰어에서 배경 이미지로 사용 가능
"""

import fitz  # PyMuPDF
import os
from pathlib import Path

def split_pdf_to_images(pdf_path, output_dir, dpi=150):
    """
    PDF를 페이지별 이미지로 분리

    Args:
        pdf_path: PDF 파일 경로
        output_dir: 출력 폴더
        dpi: 이미지 해상도 (기본 150, 높을수록 선명하지만 용량 증가)
    """
    # 출력 폴더 생성
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    print(f"PDF 열기: {pdf_path}")

    try:
        doc = fitz.open(pdf_path)
        total_pages = len(doc)
        print(f"총 페이지 수: {total_pages}")

        for page_num in range(total_pages):
            page = doc[page_num]

            # 페이지를 이미지로 변환
            # zoom = dpi / 72 (PDF 기본 해상도가 72 DPI)
            zoom = dpi / 72
            matrix = fitz.Matrix(zoom, zoom)

            pix = page.get_pixmap(matrix=matrix)

            # 파일명 생성 (PI-M-001 형식으로 매핑 시도)
            # 페이지 번호 기반으로 저장
            output_filename = f"page_{page_num + 1:03d}.png"
            output_path = output_dir / output_filename

            pix.save(str(output_path))
            print(f"[{page_num + 1}/{total_pages}] 저장: {output_filename}")

        doc.close()
        print(f"\n완료! {total_pages}개 이미지가 {output_dir}에 저장됨")

    except Exception as e:
        print(f"오류 발생: {e}")
        raise

def main():
    # 경로 설정
    base_dir = Path(__file__).parent.parent
    pdf_path = base_dir / "data" / "P&ID(위드인천에너지_최종본).pdf"
    output_dir = base_dir / "data" / "pid_images"

    if not pdf_path.exists():
        print(f"PDF 파일을 찾을 수 없습니다: {pdf_path}")
        return

    print(f"PDF 파일: {pdf_path}")
    print(f"출력 폴더: {output_dir}")
    print(f"DPI: 150 (변경하려면 스크립트 수정)")
    print("-" * 50)

    split_pdf_to_images(pdf_path, output_dir, dpi=150)

if __name__ == "__main__":
    main()
