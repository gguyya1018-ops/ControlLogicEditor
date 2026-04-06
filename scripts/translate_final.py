"""
포트 description 영어→한글 번역 (최종판)
- 단어 경계(\b)를 지켜서 단어 내부 치환 방지
- 긴 구문부터 매칭
- 번역 후 detailFull 재생성
"""
import json, sys, re, os

sys.stdout.reconfigure(encoding='utf-8')
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SYMBOLS_PATH = os.path.join(BASE_DIR, 'data', 'ovation_symbols.json')

# 구문 번역 (정확 매칭, 긴 것부터)
PHRASE_TRANS = [
    # 긴 구문
    ('Track output value mode and status signals for Input 1 variable', '입력1 변수의 트래킹 출력값 모드 및 상태 신호'),
    ('Track output value mode and status signals for Input 2 variable', '입력2 변수의 트래킹 출력값 모드 및 상태 신호'),
    ('Track output value mode and status signals for Input 3 variable', '입력3 변수의 트래킹 출력값 모드 및 상태 신호'),
    ('Track output value mode and status signals for Input 4 variable', '입력4 변수의 트래킹 출력값 모드 및 상태 신호'),
    ('Track output value and status output signals', '트래킹 출력값 및 상태 출력 신호'),
    ('Track output value mode and status signals', '트래킹 출력값 모드 및 상태 신호'),
    ('Tracking & limiting mode signals & tracking value', '트래킹/제한 모드 신호 및 트래킹 값'),
    ('Mode and Status output signals', '모드 및 상태 출력 신호'),
    ('Mode and status output signals', '모드 및 상태 출력 신호'),
    ('Maximum value of the output point', '출력 포인트 최대값'),
    ('Minimum value of the output point', '출력 포인트 최소값'),
    ('Maximum value of output', '출력 최대값'),
    ('Minimum value of output', '출력 최소값'),
    ('Output Top of Scale', '출력 상한 스케일'),
    ('Output Bottom of Scale', '출력 하한 스케일'),
    ('Tuning Diagram Number', '튜닝 다이어그램 번호'),
    ('Tuning Diagram number', '튜닝 다이어그램 번호'),
    ('Tuning diagram number', '튜닝 다이어그램 번호'),
    ('Tung diagram', '튜닝 다이어그램'),
    ('Set point for the high signal monitor trip point', '상한 감시 설정값'),
    ('Set point for the low signal monitor trip point', '하한 감시 설정값'),
    ('Dead band for the high monitor', '상한 감시 데드밴드'),
    ('Dead band for the low monitor', '하한 감시 데드밴드'),
    ('Rate of change limit in units per second', '초당 변화율 제한값'),
    ('Rate of change alarm set point', '변화율 알람 설정값'),
    ('Positive rate dead band', '양방향 변화율 데드밴드'),
    ('Negative rate dead band', '음방향 변화율 데드밴드'),
    ('Positive rate of change alarm set point', '양방향 변화율 알람 설정값'),
    ('Negative rate of change alarm set point', '음방향 변화율 알람 설정값'),
    ('High Alarm monitor value', '상한 알람 감시값'),
    ('Low Alarm monitor value', '하한 알람 감시값'),
    ('Analog Flow Transmitter Delta Pressure Input', '유량 트랜스미터 차압 입력'),
    ('Analog Specific Volume Input', '아날로그 비체적 입력'),
    ('Differential pressure analog input', '차압 아날로그 입력'),
    ('Enthalpy of Saturated Liquid output', '포화액 엔탈피 출력'),
    ('Entropy of Saturated Liquid output', '포화액 엔트로피 출력'),
    ('Specific Volume of Saturated Liquid output', '포화액 비체적 출력'),
    ('Pressure of Saturated Liquid output', '포화액 압력 출력'),
    ('Saturation Temperature output', '포화 온도 출력'),
    ('Saturation Pressure output', '포화 압력 출력'),
    ('Process variable analog input', '프로세스 변수 아날로그 입력'),
    ('Down stream PID control output', '하류 PID 제어 출력'),
    ('Analog input variable', '아날로그 입력 변수'),
    ('Analog output variable', '아날로그 출력 변수'),
    ('Analog bias bar variable output', '아날로그 바이어스 바 출력'),
    ('Analog/Digital input', '아날로그/디지털 입력'),
    ('Track output value', '트래킹 출력값'),
    ('Track Output value', '트래킹 출력값'),
    ('Track input', '트래킹 입력'),
    ('Track Input', '트래킹 입력'),
    ('Track rate', '트래킹 속도'),
    ('Track Rate', '트래킹 속도'),
    ('Enable Calculations', '연산 활성화'),
    ('Valid output flag', '유효 출력 플래그'),
    ('Error flag output', '에러 플래그 출력'),
    ('Error flag', '에러 플래그'),
    ('Alarm Check Output', '알람 검사 출력'),
    ('Type of alarm check', '알람 검사 유형'),
    ('Count Complete Output', '카운트 완료 출력'),
    ('Feedforward Input', '피드포워드 입력'),
    ('Feedforward Bias output', '피드포워드 바이어스 출력'),
    ('Feed Forward Input', '피드포워드 입력'),
    ('Priority Lower input', '우선 하강 입력'),
    ('Priority Raise input', '우선 상승 입력'),
    ('Lower Inhibit input', '하강 금지 입력'),
    ('Raise Inhibit input', '상승 금지 입력'),
    ('Manual Request input', '수동 요청 입력'),
    ('Setpoint Track output', '설정값 트래킹 출력'),
    ('Local Open Logic', '로컬 열림 로직'),
    ('Local Close Logic', '로컬 닫힘 로직'),
    ('Local Stop Logic', '로컬 정지 로직'),
    ('Local Reject', '로컬 거부'),
    ('Emergency Stop', '비상 정지'),
    ('Emergency override', '비상 오버라이드'),
    ('Permissive Trip', '허가 트립'),
    ('Spring return', '스프링 복귀'),
    ('Open feedback', '열림 피드백'),
    ('Close feedback', '닫힘 피드백'),
    ('Run feedback', '가동 피드백'),
    ('Stop feedback', '정지 피드백'),
    ('Start Device', '디바이스 시작'),
    ('Start Input Digital', '시작 입력 디지털'),
    ('Enable Input Digital', '활성화 입력 디지털'),
    ('Percent change of output in first four seconds', '처음 4초간 출력 변화율(%)'),
    ('Number of Steps', '스텝 수'),
    ('Maximum number of steps', '최대 스텝 수'),
    ('Number of inputs', '입력 수'),
    ('Device Number', '디바이스 번호'),
    ('Programmable key', '프로그래머블 키'),
    ('Possible selected output value', '선택 가능 출력값'),
    ('Output values for Step', '스텝 출력값'),
    ('Lead time constant', '리드 시정수'),
    ('Lag time constant', '래그 시정수'),
    ('Smoothing constant', '평활 상수'),
    ('Number of samples', '샘플 수'),
    ('Sample time', '샘플 시간'),
    ('Interpolation type', '보간 유형'),
    ('Dead band', '데드밴드'),
    ('Dead Band', '데드밴드'),
    ('High Limit Reached', '상한 도달'),
    ('Low Limit Reached', '하한 도달'),
    ('Analog input', '아날로그 입력'),
    ('Analog Input', '아날로그 입력'),
    ('Analog output', '아날로그 출력'),
    ('Analog Output', '아날로그 출력'),
    ('Digital input', '디지털 입력'),
    ('Digital Input', '디지털 입력'),
    ('Digital output', '디지털 출력'),
    ('Digital Output', '디지털 출력'),
    ('Temperature input', '온도 입력'),
    ('Pressure input', '압력 입력'),
    ('Enthalpy output', '엔탈피 출력'),
    ('Enthalpy input', '엔탈피 입력'),
    ('Temperature output', '온도 출력'),
    ('Pressure output', '압력 출력'),
    ('Specific Volume output', '비체적 출력'),
    ('Specific Volume', '비체적'),
    ('Entropy output', '엔트로피 출력'),
    ('Electric Drive', '전동 구동'),
    ('Orifice ID', '오리피스 내경'),
    ('Pipe ID', '배관 내경'),
    ('Super compressibility', '초압축 계수'),
    ('Shutdown Rod Gap', '셧다운 봉 갭'),
    ('Input (analog)', '입력 (아날로그)'),
    ('Input (digital)', '입력 (디지털)'),
    ('Input (analog or digital)', '입력 (아날로그 또는 디지털)'),
    ('Output (analog)', '출력 (아날로그)'),
    ('Output (digital)', '출력 (디지털)'),
    ('Output (analog or digital)', '출력 (아날로그 또는 디지털)'),
    ('Reset Input', '리셋 입력'),
    ('Reset input', '리셋 입력'),
    ('Enable input', '활성화 입력'),
    ('Initial Value', '초기값'),
    ('Initial value', '초기값'),
]

# 단어 경계 매칭 (regex \b 사용)
WORD_TRANS = [
    # 복합어 (먼저)
    ('Gain on input', '입력 이득'),
    ('Bias on input', '입력 바이어스'),
    ('Top Scale', '상한 스케일'),
    ('Bottom Scale', '하한 스케일'),
    ('Set Point', '설정값'),
    ('Set point', '설정값'),
    ('Time Delay', '시간 지연'),
    # 단어
    ('Input', '입력'),
    ('Output', '출력'),
    ('Analog', '아날로그'),
    ('Digital', '디지털'),
    ('Gain', '이득'),
    ('Bias', '바이어스'),
    ('Scale', '스케일'),
    ('Alarm', '알람'),
    ('Monitor', '감시'),
    ('Status', '상태'),
    ('Control', '제어'),
    ('Reset', '리셋'),
    ('Enable', '활성화'),
    ('Track', '트래킹'),
    ('Tracking', '트래킹'),
    ('Feedback', '피드백'),
    ('Demand', '요구값'),
    ('Deviation', '편차'),
    ('Setpoint', '설정값'),
    ('Variable', '변수'),
    ('Maximum', '최대'),
    ('Minimum', '최소'),
    ('Value', '값'),
    ('Point', '포인트'),
    ('Limit', '제한'),
    ('Rate', '변화율'),
    ('Time', '시간'),
    ('Count', '카운트'),
    ('Flag', '플래그'),
    ('Error', '에러'),
    ('Quality', '품질'),
    ('Constant', '상수'),
    ('Factor', '팩터'),
    ('Type', '유형'),
    ('Mode', '모드'),
    ('Manual', '수동'),
    ('Auto', '자동'),
    ('Open', '열림'),
    ('Close', '닫힘'),
    ('Stop', '정지'),
    ('Start', '시작'),
    ('Run', '가동'),
    ('Fail', '고장'),
    ('Failure', '고장'),
    ('Trip', '트립'),
    ('Override', '오버라이드'),
    ('Interlock', '인터락'),
    ('Select', '선택'),
    ('Selected', '선택된'),
    ('Direction', '방향'),
    ('Sample', '샘플'),
    ('Smoothing', '평활'),
    ('Average', '평균'),
    ('Calculation', '연산'),
    ('Expression', '수식'),
    ('Coefficient', '계수'),
    ('Polynomial', '다항식'),
    ('Interpolation', '보간'),
    ('Argument', '인수'),
    ('Recorder', '레코더'),
    ('Pressure', '압력'),
    ('Temperature', '온도'),
    ('Enthalpy', '엔탈피'),
    ('Entropy', '엔트로피'),
    ('Saturated', '포화'),
    ('Flow', '유량'),
    ('Gravity', '비중'),
    ('Property', '물성'),
    ('Query', '조회'),
    ('Unit', '단위'),
    ('Step', '스텝'),
    ('Device', '디바이스'),
    ('Master', '마스터'),
    ('Sequence', '시퀀스'),
    ('Drum', '드럼'),
    ('Card', '카드'),
    ('Primary', '주'),
    ('Secondary', '보조'),
    ('Bit', '비트'),
    ('Position', '위치'),
    ('Word', '워드'),
    ('Fuel', '연료'),
    ('Logic', '로직'),
    ('Trend', '트렌드'),
    ('Hardware', '하드웨어'),
    ('Software', '소프트웨어'),
    ('Configuration', '설정'),
    ('Condition', '조건'),
    ('Number', '수'),
    ('Sensitivity', '감도'),
    ('Relay', '릴레이'),
    ('Transition', '전환'),
    ('Timer', '타이머'),
    ('Respond', '응답'),
    ('Record', '레코드'),
    ('Reject', '거부'),
    ('Emergency', '비상'),
    ('Permissive', '허가'),
    ('Priority', '우선'),
    ('Lower', '하강'),
    ('Raise', '상승'),
    ('Inhibit', '금지'),
    ('Request', '요청'),
    ('Downstream', '하류'),
    ('downstream', '하류'),
    ('Upstream', '상류'),
    ('upstream', '상류'),
    ('Horn', '경보음'),
    ('Previous', '이전'),
    ('Current', '현재'),
    ('Mole', '몰'),
    ('Static', '정압'),
    ('Shift', '교대'),
    ('hour', '시간'),
    ('commands', '명령'),
    ('signal', '신호'),
    ('signals', '신호'),
    ('variable', '변수'),
    ('input', '입력'),
    ('output', '출력'),
    ('analog', '아날로그'),
    ('digital', '디지털'),
    ('the', ''),
    ('The', ''),
    ('of', ''),
    ('for', ''),
    ('and', '및'),
    ('with', ''),
    ('from', ''),
    ('that', ''),
    ('which', ''),
    ('has', ''),
    ('been', ''),
    ('not', '안'),
    ('this', ''),
    ('should', ''),
    ('never', '절대'),
    ('zero', '0'),
    ('one', '하나'),
    ('two', '두'),
    ('three', '세'),
    ('four', '네'),
    ('first', '첫번째'),
    ('second', '두번째'),
    ('third', '세번째'),
]


def translate_desc(desc):
    """영어 설명을 한글로 번역"""
    if not desc:
        return desc
    if any('\uac00' <= c <= '\ud7a3' for c in desc):
        return desc  # 이미 한글

    result = desc

    # 1단계: 구문 매칭 (문자열 치환)
    for eng, kor in PHRASE_TRANS:
        if eng in result:
            result = result.replace(eng, kor)

    # 이미 전부 한글이면 종료
    if not re.search(r'[a-zA-Z]{3,}', result):
        return result.strip()

    # 2단계: 단어 경계 매칭 (regex)
    for eng, kor in WORD_TRANS:
        result = re.sub(r'\b' + re.escape(eng) + r'\b', kor, result)

    # 정리
    result = re.sub(r'\s+', ' ', result).strip()
    result = re.sub(r'[;:,.\s]+$', '', result)
    # 괄호 안 빈 내용 제거
    result = re.sub(r'\(\s*\)', '', result)
    result = re.sub(r'\s+', ' ', result).strip()

    return result


def main():
    with open(SYMBOLS_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)

    port_count = 0
    for sym_id, sym in data.items():
        for p in sym.get('ports', []):
            desc = p.get('description', '')
            if not desc:
                continue
            if any('\uac00' <= c <= '\ud7a3' for c in desc):
                continue
            new_desc = translate_desc(desc)
            if new_desc != desc:
                p['description'] = new_desc
                port_count += 1

    with open(SYMBOLS_PATH, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f'번역 완료: {port_count}개 포트')

    # 잔여 확인
    remaining = 0
    for sym_id, sym in data.items():
        for p in sym.get('ports', []):
            desc = p.get('description', '')
            if desc and not any('\uac00' <= c <= '\ud7a3' for c in desc):
                remaining += 1
                if remaining <= 10:
                    print(f'  미번역: {sym_id}.{p["name"]}: {desc}')
    print(f'잔여 미번역: {remaining}개')

    # 깨진 번역 확인
    broken = 0
    for sym_id, sym in data.items():
        for p in sym.get('ports', []):
            desc = p.get('description', '')
            if re.search(r'[가-힣][a-z]', desc):
                broken += 1
                if broken <= 5:
                    print(f'  깨진번역: {sym_id}.{p["name"]}: {desc}')
    print(f'깨진 번역: {broken}개')


if __name__ == '__main__':
    main()
