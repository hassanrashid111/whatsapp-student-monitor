# app.py (النسخة المحسنة - المتصفح الدائم)
import os
import sys
import time
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

# --- متغير عالمي لحفظ المتصفح ---
driver = None

def log(text):
    print(text, flush=True)

# دالة لتهيئة وتشغيل المتصفح مرة واحدة
def init_driver():
    global driver
    
    # 1. فحص هل المتصفح يعمل حالياً؟
    if driver is not None:
        try:
            # محاولة قراءة العنوان للتأكد أن المتصفح لم يغلق يدوياً
            driver.title 
            return driver
        except WebDriverException:
            log("⚠️ Browser was closed manually. Restarting...")
            driver = None

    log("--- 🚀 Starting Chrome Driver (Global Session) ---")
    
    # 2. إعداد مسار حفظ البيانات (لعدم طلب الباركود كل مرة)
    if getattr(sys, 'frozen', False):
        application_path = os.path.dirname(sys.executable)
    else:
        application_path = os.path.dirname(os.path.abspath(__file__))
        
    profile_path = os.path.join(application_path, "chrome_data")
    
    options = webdriver.ChromeOptions()
    options.add_argument("--start-maximized")
    options.add_argument(f"user-data-dir={profile_path}") # هذا يحفظ جلسة الواتساب
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    
    try:
        driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=options)
        driver.get("https://web.whatsapp.com")
        log("✅ Chrome Started. Waiting for WhatsApp load...")
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
    log("--- New Send Request Received ---")
    
    # استقبال البيانات
    try:
        data = request.json
        students = data.get('students', [])
        message_text = data.get('message', '')
        include_name = data.get('include_name', True)
    except Exception as e:
        return jsonify({"status": "error", "message": f"Data Error: {str(e)}"})

    if not students:
        return jsonify({"status": "error", "message": "لا يوجد طلاب"})

    # تشغيل المتصفح (أو استدعاء المفتوح)
    try:
        driver = init_driver()
        if not driver:
            return jsonify({"status": "error", "message": "فشل تشغيل المتصفح"})
            
        # التأكد أننا في صفحة واتساب
        if "whatsapp" not in driver.current_url:
             driver.get("https://web.whatsapp.com")

        # انتظار أولي لضمان تحميل الصفحة (خاصة عند الفتح لأول مرة)
        log("⏳ Checking WhatsApp readiness...")
        try:
            # ننتظر ظهور أي عنصر يدل على أن الصفحة حملت (مثل قائمة الدردشات أو مربع البحث)
            WebDriverWait(driver, 20).until(
                EC.presence_of_element_located((By.XPATH, '//div[@contenteditable="true"][@role="textbox"] | //canvas | //div[@role="button"]'))
            )
        except:
            log("⚠️ Login might be required. Please scan QR if needed.")
            # لن نوقف الكود، سنحاول الاستمرار
        
        sent_count = 0
        
        for student in students:
            try:
                phone = student['phone']
                if len(phone) < 10: continue

                # === التعديل هنا: تحديد نص الرسالة بناءً على الخيار ===
                if include_name:
                    first_name = student['name'].strip().split()[0]
                    full_msg = f"{first_name}،\n{message_text}"
                else:
                    first_name = student['name'] # نحتفظ بالاسم عشان اللوج (Log) يظهر صح
                    full_msg = message_text
                # ====================================================
                
                # تجهيز الرابط
                encoded_msg = urllib.parse.quote(full_msg)
                url = f"https://web.whatsapp.com/send?phone={phone}&text={encoded_msg}"
                
                # التوجيه داخل نفس النافذة المفتوحة
                driver.get(url)
                
                # انتظار صندوق الكتابة
                try:
                    input_box = WebDriverWait(driver, 30).until(
                        EC.presence_of_element_located((By.XPATH, '//div[@contenteditable="true"][@role="textbox"]'))
                    )
                    time.sleep(1) # استراحة قصيرة جداً
                    input_box.send_keys(Keys.ENTER)
                    log(f"✅ Sent to {first_name}")
                    sent_count += 1
                    time.sleep(2) # فاصل زمني بين الرسائل لتجنب الحظر
                    
                except Exception as e:
                    log(f"⚠️ Failed to send to {first_name} (Number invalid or timeout)")
                    continue

            except Exception as e:
                log(f"❌ Error processing {student.get('name', 'Unknown')}")
                continue

        # ملاحظة هامة: لا نقوم بإغلاق المتصفح driver.quit() هنا ليبقى جاهزاً للمرة القادمة
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
    
    # محاولة فتح الموقع في المتصفح الافتراضي
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