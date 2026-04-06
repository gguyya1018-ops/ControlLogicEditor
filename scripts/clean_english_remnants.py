"""포트 description에서 한글 번역 뒤 남은 영어 문장 정리"""
import json, sys, re, os

sys.stdout.reconfigure(encoding='utf-8')
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SYMBOLS_PATH = os.path.join(BASE_DIR, 'data', 'ovation_symbols.json')

with open(SYMBOLS_PATH, 'r', encoding='utf-8') as f:
    data = json.load(f)

count = 0
for sym_id, sym in data.items():
    for p in sym.get('ports', []):
        desc = p.get('description', '')
        if not desc:
            continue

        new_desc = desc

        # 패턴1: 한글 뒤에 ". The ..." 또는 ". If ..." 등 영어 문장 제거
        new_desc = re.sub(r'(\S[\uac00-\ud7a3\s]+)\.\s*[A-Z][a-z].*$', r'\1', new_desc)

        # 패턴2: 한글 뒤에 " - The ..." 영어 부연 제거
        new_desc = re.sub(r'(\S[\uac00-\ud7a3\s]+)\s*[-–]\s*[A-Z][a-z].*$', r'\1', new_desc)

        # 패턴3: "Tung diagram" 같은 부분 오타 수정
        new_desc = new_desc.replace('Tung diagram', '튜닝 다이어그램')
        new_desc = new_desc.replace('Tuning diagram', '튜닝 다이어그램')
        new_desc = new_desc.replace('tuning diagram', '튜닝 다이어그램')

        # 패턴4: 순수 영어만 남은 짧은 설명 번역
        remaining_eng = {
            'Sensitivity': '감도',
            'Shed Relay': '셰드 릴레이',
            'Orifice ID': '오리피스 내경',
            'Pipe ID': '배관 내경',
            'Cutf': '차단 주파수',
            'NORMAL': '일반',
            'INDIRECT': '간접',
            'DIRECT': '직접',
            'TRUE': 'TRUE',
            'FALSE': 'FALSE',
            'ramp': '램프',
        }
        for eng, kor in remaining_eng.items():
            new_desc = new_desc.replace(eng, kor)

        # 패턴5: 영어 문장만 남은 경우 (한글 없음) - 단어 단위 번역
        has_korean = any('\uac00' <= c <= '\ud7a3' for c in new_desc)
        if not has_korean and len(new_desc) > 0:
            # 간단 번역
            simple_words = {
                'Input': '입력', 'Output': '출력', 'Analog': '아날로그',
                'Digital': '디지털', 'Gain': '이득', 'Bias': '바이어스',
                'Reset': '리셋', 'Enable': '활성화', 'Disable': '비활성화',
                'Track': '트래킹', 'Alarm': '알람', 'Status': '상태',
                'Control': '제어', 'Value': '값', 'Point': '포인트',
                'Variable': '변수', 'Flag': '플래그', 'Error': '에러',
                'Quality': '품질', 'Mode': '모드', 'Type': '유형',
                'Number': '수', 'Scale': '스케일', 'Limit': '제한',
                'Rate': '변화율', 'Time': '시간', 'Count': '카운트',
                'Maximum': '최대', 'Minimum': '최소', 'Constant': '상수',
                'Factor': '팩터', 'Select': '선택', 'Monitor': '감시',
                'Deviation': '편차', 'Feedback': '피드백', 'Demand': '요구',
                'the': '', 'of': '', 'on': '', 'for': '', 'in': '',
                'and': '및', 'or': '또는', 'is': '', 'a ': '', 'an ': '',
            }
            for eng, kor in sorted(simple_words.items(), key=lambda x: -len(x[0])):
                new_desc = new_desc.replace(eng, kor)
            new_desc = re.sub(r'\s+', ' ', new_desc).strip()

        # 끝 정리
        new_desc = new_desc.strip(' ,.:;')

        if new_desc != desc:
            p['description'] = new_desc
            count += 1

# detailFull 재생성
with open(SYMBOLS_PATH, 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print(f'정리 완료: {count}개 포트 설명 수정')

# 잔여 영어 확인
remaining = 0
for sym_id, sym in data.items():
    for p in sym.get('ports', []):
        desc = p.get('description', '')
        if desc and not any('\uac00' <= c <= '\ud7a3' for c in desc):
            remaining += 1
            if remaining <= 5:
                print(f'  미번역: {sym_id}.{p["name"]}: {desc}')
print(f'잔여 미번역: {remaining}개')
