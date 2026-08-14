FROM python:3.12-slim

WORKDIR /app

COPY sensor.py .

RUN pip install paho-mqtt

CMD ["python", "sensor.py"]