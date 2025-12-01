# Python 이미지
FROM python:3.11-slim

# 작업 경로
WORKDIR /app

# wget 설치 (Google Drive 파일 다운로드용)
RUN apt-get update && apt-get install -y wget && apt-get clean

# requirements 설치
COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# models 폴더 생성
RUN mkdir -p /app/models

# Google Drive Direct Link로 best.pt 다운로드
RUN wget --no-check-certificate "https://drive.google.com/uc?export=download&id=179RY3nUVnF4zBiGZRgEIP09WQM3mImMF" -O /app/models/best.pt

# 전체 프로젝트 복사
COPY . /app

# 서비스 포트
ENV PORT=8000
EXPOSE 8000

# 서버 실행
CMD ["python", "yolo_server.py"]
