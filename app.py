# app.py (النسخة النهائية - مجهزة للعمل كملف EXE)
import os
import sys
from flask import Flask, render_template, request, jsonify
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager
import time
import urllib.parse
import webbrowser

# ==========================================
# دالة سحرية: بتحدد مسار الملفات سواء كنت شغال بايثون عادي أو EXE
# ==========================================
def resource_path(relative_path):
    """ Get absolute path to resource, works for dev and for PyInstaller """
    try:
        # PyInstaller creates a temp folder and stores path in _MEIPASS
        base_path = sys._MEIPASS
    except Exception:
        base_path = os.path.abspath(".")
    return os.path.join(base_path, relative_path)

# تحديد مكان ملفات HTML بدقة
template_dir = resource_path('templates')

# تشغيل فلاسك مع تحديد مكان القوالب
app = Flask(__name__, template_folder=template_dir)

# دالة طباعة فورية للشاشة السوداء
def log(text):
    print(text, flush=True)

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/api/send_whatsapp', methods=['POST'])
def send_whatsapp():
    log("--- Start Sending Process ---")
    data = request.json
    students = data.get('students', [])
    message_text = data.get('message', '')

    if not students:
        return jsonify({"status": "error", "message": "لا يوجد طلاب"})

    # === تعديل هام جداً للـ EXE ===
    # بنحدد مكان ملف EXE عشان نحط جنبه فولدر chrome_data
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
        # محاولة تشغيل المتصفح
        log("Opening Chrome Driver...")
        driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=options)
    except Exception as e:
        return jsonify({"status": "error", "message": f"Chrome Error: {str(e)}"})
    
    try:
        driver.get("https://web.whatsapp.com")
        
        log("\n" + "="*50)
        log("1. Scan QR Code if needed.")
        log("2. Wait for chats to load.")
        log("="*50)
        
        # انتظار المستخدم
        print("3. >>> اضغط زر ENTER هنا للبدء <<< ", end='', flush=True)
        input() 
        
        log("\nStarting execution...")
        sent_count = 0
        
        for student in students:
            try:
                phone = student['phone']
                if len(phone) < 10: continue

                first_name = student['name'].strip().split()[0]
                full_msg = f"{first_name}،\n{message_text}"
                encoded_msg = urllib.parse.quote(full_msg)
                url = f"https://web.whatsapp.com/send?phone={phone}&text={encoded_msg}"
                
                driver.get(url)
                
                try:
                    input_box = WebDriverWait(driver, 20).until(
                        EC.presence_of_element_located((By.XPATH, '//div[@contenteditable="true"][@role="textbox"]'))
                    )
                except:
                    input_box = WebDriverWait(driver, 10).until(
                        EC.presence_of_element_located((By.XPATH, '//div[@contenteditable="true"][@data-tab="10"]'))
                    )

                time.sleep(2)
                input_box.send_keys(Keys.ENTER)
                log(f"✅ Sent to {first_name}")
                sent_count += 1
                time.sleep(4)
                
            except Exception as e:
                log(f"❌ Failed to send to {student.get('name', 'Unknown')}")
                continue

        log("\n--- Process Finished ---")
        return jsonify({"status": "success", "count": sent_count})

    except Exception as e:
        log(f"Error: {str(e)}")
        return jsonify({"status": "error", "message": str(e)})

if __name__ == '__main__':
    # فتح المتصفح تلقائياً عند تشغيل الـ EXE
    port = 5000
    url = f"http://127.0.0.1:{port}"
    
    # محاولة فتح كروم
    chrome_paths = [
        'C:/Program Files/Google/Chrome/Application/chrome.exe %s',
        'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe %s'
    ]
    opened = False
    for path in chrome_paths:
        try:
            webbrowser.get(path).open(url)
            opened = True
            break
        except:
            continue
    if not opened:
        webbrowser.open(url)

    app.run(debug=False, use_reloader=False, port=port)