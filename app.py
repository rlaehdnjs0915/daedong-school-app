from flask import Flask, render_template, jsonify
import json
import os
import re
from datetime import datetime, timezone, timedelta 

import requests

app = Flask(__name__)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
TIMETABLE_FILE = os.path.join(BASE_DIR, "data", "timetable.json")

NEIS_API_KEY = "761f430e8ceb4346b4f9280902b31fc7"
ATPT_OFCDC_SC_CODE = "C10"
SD_SCHUL_CODE = "7150127"
NEIS_MEAL_URL = "https://open.neis.go.kr/hub/mealServiceDietInfo"
KST = timezone(timedelta(hours=9))


def load_json(path):
    if not os.path.exists(path):
        return {}
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def get_now_kst():
    return datetime.now(KST)


def get_weekday_key():
    weekday = get_now_kst().weekday()
    keys = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    return keys[weekday]


def clean_menu_text(text):
    if not text:
        return "정보 없음"

    text = text.replace("<br/>", "\n")
    text = text.replace("<br />", "\n")
    text = text.replace("<br>", "\n")
    text = re.sub(r"\([0-9\.\s]+\)", "", text)

    lines = [line.strip() for line in text.split("\n")]
    lines = [line for line in lines if line]

    if not lines:
        return "정보 없음"

    return "\n".join(lines)


def get_today_meal():
    today_ymd = get_now_kst().strftime("%Y%m%d")

    params = {
        "KEY": NEIS_API_KEY,
        "Type": "json",
        "pIndex": 1,
        "pSize": 100,
        "ATPT_OFCDC_SC_CODE": ATPT_OFCDC_SC_CODE,
        "SD_SCHUL_CODE": SD_SCHUL_CODE,
        "MLSV_YMD": today_ymd
    }

    try:
        response = requests.get(NEIS_MEAL_URL, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()

        if "mealServiceDietInfo" not in data:
            return {
                "lunch": "급식 정보 없음",
                "dinner": "급식 정보 없음"
            }

        rows = data["mealServiceDietInfo"][1].get("row", [])

        lunch = "급식 정보 없음"
        dinner = "급식 정보 없음"

        for row in rows:
            meal_type = row.get("MMEAL_SC_NM", "")
            menu_text = clean_menu_text(row.get("DDISH_NM", ""))

            if meal_type == "중식":
                lunch = menu_text
            elif meal_type == "석식":
                dinner = menu_text

        return {
            "lunch": lunch,
            "dinner": dinner
        }

    except Exception as e:
        print("급식 불러오기 오류:", e)
        return {
            "lunch": "불러오기 실패",
            "dinner": "불러오기 실패"
        }


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/api/today")
def today_info():
    timetable = load_json(TIMETABLE_FILE)

    now = get_now_kst()
    today = now.strftime("%Y-%m-%d")
    weekday_key = get_weekday_key()

    today_timetable = timetable.get(weekday_key, [])
    meal_info = get_today_meal()

    return jsonify({
        "date": today,
        "weekday": weekday_key,
        "timetable": today_timetable,
        "meal": meal_info
    })


if __name__ == "__main__":
    app.run(debug=True)