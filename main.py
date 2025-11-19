import requests
import csv
import time

# --- 설정 부분 ---
API_KEY = "f2797176abec4d40b13c"
SERVICE_ID = "C005"
DATA_TYPE = "json"
CSV_FILE = "barcode_product.csv"

# 요청 범위 (한 번에 가져올 데이터 수)
START_IDX = 1
END_IDX = 100  # 필요에 따라 조절

BASE_URL = f"http://openapi.foodsafetykorea.go.kr/api/{API_KEY}/{SERVICE_ID}/{DATA_TYPE}"

# --- CSV 파일 헤더 작성 (한 번만) ---
with open(CSV_FILE, mode='w', newline='', encoding='utf-8') as f:
    writer = csv.writer(f)
    writer.writerow(["BAR_CD", "PRDLST_NM", "BSSH_NM", "PRDLST_DCNM", "POG_DAYCNT"])

# --- 데이터 요청 + 저장 함수 ---
def fetch_and_save(start, end, retries=3):
    url = f"{BASE_URL}/{start}/{end}"
    
    for attempt in range(retries):
        try:
            response = requests.get(url, timeout=10)
            print(f"HTTP 상태 코드: {response.status_code}")

            # 빈 응답 체크
            if not response.text.strip():
                print("빈 응답, 재시도 중...")
                time.sleep(5)
                continue

            # HTML 응답 체크 (점검중 메시지)
            if "<html" in response.text.lower():
                print("HTML 응답 (시스템 점검 중일 수 있음), 재시도 중...")
                time.sleep(5)
                continue

            # JSON 변환
            try:
                data = response.json()
            except ValueError:
                print("JSON 변환 실패, 재시도 중...")
                time.sleep(5)
                continue

            items = data.get(SERVICE_ID, {}).get("row", [])
            if not items:
                print("더 이상 데이터 없음")
                return False

            # CSV로 저장
            with open(CSV_FILE, mode='a', newline='', encoding='utf-8') as f:
                writer = csv.writer(f)
                for item in items:
                    writer.writerow([
                        item.get("BAR_CD", ""),
                        item.get("PRDLST_NM", ""),
                        item.get("BSSH_NM", ""),
                        item.get("PRDLST_DCNM", ""),
                        item.get("POG_DAYCNT", "")
                    ])
            return True
        
        except requests.exceptions.RequestException as e:
            print(f"요청 예외 발생: {e}, 재시도 중...")
            time.sleep(5)

    print("재시도 실패, 다음 범위로 이동")
    return False

# --- 메인 루프: 페이지네이션 처리 ---
current_start = START_IDX
current_end = END_IDX

while True:
    print(f"\n데이터 요청: {current_start} ~ {current_end}")
    success = fetch_and_save(current_start, current_end)
    
    if not success:
        print("수집 종료")
        break
    
    # 다음 범위로 이동
    current_start += (END_IDX - START_IDX + 1)
    current_end += (END_IDX - START_IDX + 1)
    
    # 너무 빠른 요청 방지
    time.sleep(1)
