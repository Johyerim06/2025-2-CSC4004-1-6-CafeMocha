# Python 이미지
FROM python:3.11-slim

# 작업 경로
WORKDIR /app

# 모델 파일, 서버 코드, requirements만 복사
COPY requirements.txt /app/requirements.txt

# 의존성 설치
RUN pip install --no-cache-dir -r requirements.txt

# 전체 server 폴더 복사
COPY . /app

# 서비스 포트
EXPOSE 8000

# 서버 실행
CMD ["python", "yolo_server.py"]
