import os
import sys
import time
import random  # <--- إضافة مهمة
import urllib.parse
import webbrowser
from flask import Flask, render_template, request, jsonify
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager
from selenium.common.exceptions import WebDriverException

def resource_path(relative_path):
    try:
        base_path = sys._MEIPASS
    except Exception:
        base_path = os.path.abspath(".")
    return os.path.join(base_path, relative_path)

template_dir = resource_path('templates')
app = Flask(__name__, template_folder=template_dir)

driver = None

def log(text):
    print(text, flush=True)

def init_driver():
    global driver
    if driver is not None:
        try:
            driver.title 
            return driver
        except WebDriverException:
            driver = None

    log("--- 🚀 Starting Chrome Driver ---")
    if getattr(sys, 'frozen', False):
        application_path = os.path.dirname(sys.executable)
    else:
        application_path = os.path.dirname(os.path.abspath(__file__))
        
    profile_path = os.path.join(application_path, "chrome_data")
    
    options = webdriver.ChromeOptions()
    options.add_argument("--start-maximized")
    options.add_argument(f"user-data-dir={profile_path}")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    
    try:
        driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=options)
        driver.get("https://web.whatsapp.com")
        return driver
    except Exception as e:
        log(f"❌ Chrome Error: {str(e)}")
        return None

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/habits')
def habits():
    return render_template('habits.html')

@app.route('/api/send_whatsapp', methods=['POST'])
def send_whatsapp():
    global driver
    
    try:
        data = request.json
        students = data.get('students', [])
        message_text = data.get('message', '')
        include_name = data.get('include_name', True)
    except Exception as e:
        return jsonify({"status": "error", "message": f"Data Error: {str(e)}"})

    if not students:
        return jsonify({"status": "error", "message": "لا يوجد طلاب"})

    try:
        driver = init_driver()
        if not driver:
            return jsonify({"status": "error", "message": "فشل تشغيل المتصفح"})
            
        if "whatsapp" not in driver.current_url:
             driver.get("https://web.whatsapp.com")

        # انتظار التحميل
        try:
            WebDriverWait(driver, 45).until(
                EC.presence_of_element_located((By.XPATH, '//div[@contenteditable="true"][@role="textbox"] | //canvas | //div[@role="button"]'))
            )
        except:
            pass # قد يحتاج المستخدم مسح الباركود
        
        sent_count = 0
        
        for i, student in enumerate(students):
            try:
                phone = student['phone']
                if len(phone) < 10: continue

                if include_name:
                    first_name = student['name'].strip().split()[0]
                    full_msg = f"{first_name}،\n{message_text}"
                else:
                    first_name = student['name']
                    full_msg = message_text
                
                encoded_msg = urllib.parse.quote(full_msg)
                url = f"https://web.whatsapp.com/send?phone={phone}&text={encoded_msg}"
                
                driver.get(url)
                
                try:
                    # انتظار ظهور الصندوق
                    input_box = WebDriverWait(driver, 35).until(
                        EC.presence_of_element_located((By.XPATH, '//div[@contenteditable="true"][@role="textbox"]'))
                    )
                    
                    # 1. انتظار بشري قبل الضغط (ثانيتين لـ 4 ثواني)
                    time.sleep(random.uniform(2, 4))
                    
                    input_box.send_keys(Keys.ENTER)
                    sent_count += 1
                    log(f"✅ Sent ({i+1}/{len(students)}): {first_name}")

                    # 2. انتظار عشوائي بين الرسائل داخل نفس الدفعة (7 لـ 12 ثانية)
                    # هذا الوقت آمن لأننا سنرسل 25 رسالة فقط ثم نتوقف طويلاً
                    sleep_time = random.uniform(7, 12)
                    time.sleep(sleep_time)
                    
                except Exception as e:
                    log(f"⚠️ Failed to send to {first_name}")
                    time.sleep(3)
                    continue

            except Exception as e:
                continue

        return jsonify({"status": "success", "count": sent_count})

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})

if __name__ == '__main__':
    port = 5000
    url = f"http://127.0.0.1:{port}"
    chrome_paths = [
        'C:/Program Files/Google/Chrome/Application/chrome.exe %s',
        'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe %s'
    ]
    if not os.environ.get("WERKZEUG_RUN_MAIN"):
        opened = False
        for path in chrome_paths:
            try:
                webbrowser.get(path).open(url)
                opened = True
                break
            except: continue
        if not opened: webbrowser.open(url)
    app.run(debug=True, use_reloader=False, port=port)