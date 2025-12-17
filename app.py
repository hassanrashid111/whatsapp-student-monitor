# app.py (نسخة Chrome النهائية - مع إضافة الاسم الأول للطالب)
import os
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

app = Flask(__name__)

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/api/send_whatsapp', methods=['POST'])
def send_whatsapp():
    print("--- Start Sending Process (Personalized) ---")
    data = request.json
    students = data.get('students', [])
    message_text = data.get('message', '')

    if not students:
        return jsonify({"status": "error", "message": "لا يوجد طلاب"})

    # === إعدادات حفظ الجلسة ===
    current_dir = os.getcwd()
    profile_path = os.path.join(current_dir, "chrome_data")
    
    options = webdriver.ChromeOptions()
    options.add_argument("--start-maximized")
    options.add_argument(f"user-data-dir={profile_path}") 
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    
    try:
        # تشغيل Chrome Driver
        driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=options)
    except Exception as e:
        return jsonify({"status": "error", "message": f"فشل تشغيل Chrome (تأكد من إغلاق أي متصفح مفتوح): {str(e)}"})
    
    try:
        driver.get("https://web.whatsapp.com")
        
        # === تعليمات البدء ===
        print("\n" + "="*50)
        print(f"Session Path: {profile_path}")
        print("1. If not logged in, Please Scan QR Code.")
        print("2. If already logged in, just wait for chats to load.")
        input("3. >>> بعد ظهور الدردشات تماماً، اضغط زر ENTER هنا لبدء الإرسال <<< ")
        print("Starting execution...")
        print("="*50 + "\n")
        # =====================

        sent_count = 0
        
        for student in students:
            try:
                phone = student['phone']
                if len(phone) < 10: continue

                # === التعديل الجديد هنا (استخراج الاسم الأول) ===
                # 1. بنجيب الاسم كامل ونقسمه مسافات، وناخد أول جزء [0]
                first_name = student['name'].strip().split()[0]
                
                # 2. بنعمل الرسالة الجديدة: الاسم + فاصلة وسطر جديد + نص الرسالة الأصلي
                # النتيجة هتكون: "أحمد،\nالسلام عليكم نرجو الحضور..."
                full_msg = f"{first_name}،\n{message_text}"
                
                encoded_msg = urllib.parse.quote(full_msg)
                url = f"https://web.whatsapp.com/send?phone={phone}&text={encoded_msg}"
                
                driver.get(url)
                
                # البحث عن مربع الكتابة
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
                
                print(f"✅ Sent to {first_name} ({student['name']})")
                sent_count += 1
                
                time.sleep(4) # فاصل زمني للأمان
                
            except Exception as e:
                print(f"❌ Failed to send to {student['name']}: {str(e)}")
                continue

        print("\n--- Process Finished ---")
        return jsonify({"status": "success", "count": sent_count})

    except Exception as e:
        print(f"Error: {str(e)}")
        return jsonify({"status": "error", "message": str(e)})

if __name__ == '__main__':
    # محاولة الفتح التلقائي في Chrome
    url = "http://127.0.0.1:5000"
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
        print(f"⚠️ لم نتمكن من العثور على Chrome تلقائياً. المرجو فتحه يدوياً والدخول على: {url}")
        
    app.run(debug=True, use_reloader=False)