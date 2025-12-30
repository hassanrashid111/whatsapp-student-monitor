/**
 * Athar Educational Platform
 * Core Application Logic (Full Version)
 */

const APP_KEY = 'Athar_data_v0'; 
const SESSION_KEY = 'Athar_session';

// State Object
let state = {
    students: [],
    lectures: [],
    settings: {
    totalPlannedLectures: 8
    },
    messageBatchCount: 0
};
let performanceChart = null; 
// Application Interface (Global)
window.app = {
    init: () => init(),
    login: () => handleLogin(),
    logout: () => handleLogout(),
    addStudent: () => addStudentFlow(),
    addLecture: () => addLectureFlow(),
    toggleCheck: (sId, lId) => toggleStudentCheck(sId, lId),
    exportData: () => exportToExcel(),
    sendMessages: () => startMessagingFlow(),
    deleteStudent: (id) => deleteStudentFlow(id),
    deleteLecture: (id) => deleteLectureFlow(id),
    search: () => handleSearch(),
    sort: (criteria, id) => sortStudents(criteria, id),
    toggleTheme: () => toggleTheme(),
    openNotes: (id) => openNotesModal(id),
    closeNotes: () => closeNotesModal(),
    saveNotes: () => saveStudentNotes(),
    getReport: () => getReportFile(),
    backupData: () => backupData(),
    restoreData: (e) => restoreData(e),
    manualStatus: (days) => manualStatus(days),
    openImport: () => document.getElementById('import-modal').style.display = 'flex',
    closeImport: () => document.getElementById('import-modal').style.display = 'none',
    saveImport: () => processBulkImport(),
    editStudent: (id) => openEditStudentModal(id),
    saveEditStudent: () => saveStudentDataEdit(),
    clearAllData: () => wipeAllData(),
    resetMessages: () => resetMessageCounts(),
    downloadCert: (name, count) => downloadCertificate(name, count)
};
 


// ================= INITIALIZATION =================
function init() {
    loadData();
    checkSession();
    renderDate();
    renderHadith();
    loadTheme();
}

function loadData() {
    const raw = localStorage.getItem(APP_KEY);
    if (raw) {
        state = JSON.parse(raw);
        if (typeof state.messageBatchCount === 'undefined') state.messageBatchCount = 0;
    } else {
        seedData();
    }
}

function seedData() {
    state = {
        students: [],
        // ضفنا timestamp هنا
        lectures: [{ id: 'lec_1', title: 'محاضرة 1', timestamp: Date.now() }], 
        settings: { totalPlannedLectures: 8 }, // عدلتها 8 زي ما كانت فوق
        messageBatchCount: 0
    };
    saveData();
}

function saveData() {
    localStorage.setItem(APP_KEY, JSON.stringify(state));
    renderDashboard();
}

function checkSession() {
    const isLoggedIn = localStorage.getItem(SESSION_KEY) === 'true';
    if (isLoggedIn) showDashboard();
    else showLogin();
}

// ================= AUTHENTICATION =================
function handleLogin() {
    const userIn = document.getElementById('username').value;
    const passIn = document.getElementById('password').value;
    const storedUser = localStorage.getItem('admin_user') || 'admin';
    const storedPass = localStorage.getItem('admin_pass') || '123456';

    if (userIn === storedUser && passIn === storedPass) {
        localStorage.setItem(SESSION_KEY, 'true');
        showDashboard();
    } else {
        alert('اسم المستخدم أو كلمة المرور غير صحيحة');
    }
}

function handleLogout() {
    localStorage.removeItem(SESSION_KEY);
    location.reload();
}

function showLogin() {
    document.getElementById('login-view').style.display = 'flex';
    document.getElementById('dashboard-view').style.display = 'none';
    document.getElementById('login-form').onsubmit = (e) => {
        e.preventDefault();
        handleLogin();
    };
}

function showDashboard() {
    document.getElementById('login-view').style.display = 'none';
    document.getElementById('dashboard-view').style.display = 'flex'; 
    renderDashboard();
}
  

// دالة جديدة لحساب النسبة المئوية بناءً على الدرجات (مش بس الحضور)
function getStudentTotalScore(student) {
    if (state.lectures.length === 0) return 0;
    
    let totalScore = 0;
    state.lectures.forEach(lec => {
        // لو المحاضرة قديمة ومفيش ليها تاريخ، بنعتبر تاريخها النهاردة عشان الحسابات ما تضربش
        const ts = lec.timestamp || Date.now();
        const score = calculateScore(ts, student.progress[lec.id]);
        totalScore += score;
    });
    
    // المعادلة: (مجموع درجات الطالب / (عدد المحاضرات × 100)) × 100
    const maxScore = state.lectures.length * 100;
    return Math.round((totalScore / maxScore) * 100);
}
// ================= DASHBOARD RENDERING =================
function renderDashboard() {
    handleSearch(); 
    renderStats();
}

function renderTable(studentsList = null) {
    const dataToRender = studentsList || state.students;
    const thead = document.getElementById('table-header-row');
    const tbody = document.getElementById('students-body');

    // 1. تجهيز الهيدر (Headers)
    let headersHTML = `
        <th>#</th>
        <th class="sortable-header" onclick="window.app.sort('name')" title="اضغط للترتيب" style="cursor:pointer">
            اسم الطالب <i class="fa-solid fa-sort"></i>
        </th>
        <th>رقم الهاتف</th>
    `;
    
    state.lectures.forEach(lec => {
        headersHTML += `
            <th class="lecture-header">
                <div style="display: flex; flex-direction: column; align-items: center; gap: 5px;">
                    <span onclick="window.app.sort('lecture', '${lec.id}')" style="cursor:pointer; user-select:none; font-size:0.9rem;">
                        ${lec.title} <i class="fa-solid fa-sort" style="opacity:0.3; font-size:0.7rem;"></i>
                    </span>
                    <div style="display:flex; gap:5px;">
                        <button onclick="window.app.downloadLecturePDF('${lec.id}', '${lec.title}')" 
                                style="background:none; border:none; color:#27AE60; cursor:pointer; font-size:0.9rem;" 
                                title="تحميل شهادات الحضور PDF">
                            <i class="fa-solid fa-file-pdf"></i>
                        </button>
                        <button onclick="window.app.deleteLecture('${lec.id}')" 
                                style="background:none; border:none; color:#E74C3C; cursor:pointer; font-size:0.9rem;" 
                                title="حذف العمود">
                            <i class="fa-solid fa-circle-minus"></i>
                        </button>
                    </div>
                </div>
            </th>`;
    });
    
    headersHTML += `
        <th class="sortable-header" onclick="window.app.sort('score')" title="ترتيب بالأكثر حضوراً" style="cursor:pointer">
             <i class="fa-solid fa-chart-simple"></i> / <i class="fa-solid fa-trash-can"></i>
        </th>`;
    
    thead.innerHTML = headersHTML;

    // 2. تجهيز الصفوف (السرعة هنا 🚀)
    // المتغير ده هيجمع كل كود HTML بتاع الطلاب مرة واحدة
    let allRowsHTML = ''; 
    const latestLecId = state.lectures.length > 0 ? state.lectures[state.lectures.length - 1].id : null;

    dataToRender.forEach((student, index) => {
        const isCompletedLatest = latestLecId ? student.progress[latestLecId] : false;
        const rowClass = (isCompletedLatest && isCompletedLatest !== 'replied') ? 'row-tested' : 'row-active';
        
        const originalIndex = state.students.findIndex(s => s.id === student.id);
        const serial = (originalIndex + 1).toString().padStart(3, '0');

        const percent = getStudentTotalScore(student);
        let progressColor = '#E74C3C';
        if (percent >= 75) progressColor = '#27AE60';
        else if (percent >= 50) progressColor = '#F39C12';

        const badgeHTML = (isCompletedLatest && isCompletedLatest !== 'replied') ? `<span class="status-badge completed">مكتمل</span>` : '';

        // نبني السطر ونضيفه للمتغير الكبير بدل ما نضيفه للصفحة علطول
        let rowHTML = `<tr class="${rowClass}">
            <td><span style="color:var(--primary-green); font-weight:bold;">${serial}</span></td>
            <td>
                <div style="display:flex; align-items:center; gap: 10px;">
                    <div class="student-avatar" style="background:#f0f0f0; color:#555;">${getInitials(student.name)}</div>
                    <div style="display:flex; flex-direction:column; width:100%">
                        <span class="clickable-name" onclick="window.app.openNotes(${student.id})" title="ملاحظات" style="cursor:pointer; font-weight:bold;">
                            ${student.name}
                        </span>
                        <a href="https://web.whatsapp.com/send?phone=${student.phone}" target="_blank" style="margin-right:8px; color:#25D366; font-size:1.1rem; text-decoration:none;" title="مراسلة سريعة">
                            <i class="fa-brands fa-whatsapp"></i>
                        </a>
                        ${badgeHTML}
                        <div class="progress-track" style="background:#eee; height:5px; width:100%; margin-top:5px; border-radius:3px; overflow:hidden;">
                            <div style="width:${percent}%; background:${progressColor}; height:100%; border-radius:3px;"></div>
                        </div>
                    </div>
                </div>
            </td>
            <td style="font-family:'Arial'; direction:ltr; text-align:right;">${student.phone}</td>
        `;

        state.lectures.forEach(lec => {
            const progressValue = student.progress[lec.id];
            const isChecked = progressValue && progressValue !== 'replied';
            const cellClass = progressValue === 'replied' ? 'status-replied' : '';

            rowHTML += `
                <td class="${cellClass}" oncontextmenu="showContextMenu(event, ${student.id}, '${lec.id}')">
                    <div class="check-wrapper" style="justify-content: center;">
                        <input type="checkbox" ${isChecked ? 'checked' : ''} 
                        onchange="window.app.toggleCheck(${student.id}, '${lec.id}')"
                        title="انقر يميناً لخيارات التاريخ">
                    </div>
                </td>
            `;
        });
        
        const isPerfect = percent === 100;

        rowHTML += `
            <td style="font-weight:bold; color:${progressColor}">${percent}%</td>
            <td>
                <div style="display:flex; gap:8px; align-items:center;">
                    <button class="btn-action" 
                            style="background:${isPerfect ? '#D4AF37' : '#2980b9'}; color:white; padding:5px 10px; border:none; border-radius:4px; cursor:pointer;" 
                            onclick="window.app.downloadCert('${student.name}', ${state.lectures.length})" 
                            title="تحميل الشهادة">
                        <i class="fa-solid fa-award"></i>
                    </button>
                    <button class="btn-delete-row" style="color:var(--primary-green); margin-left:5px;" onclick="window.app.editStudent(${student.id})" title="تعديل البيانات">
                        <i class="fa-solid fa-pen"></i>
                    </button>
                    <button class="btn-delete-row" onclick="window.app.deleteStudent(${student.id})">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>`;
        
        // تجميع السطور في المتغير
        allRowsHTML += rowHTML;
    });

    // 3. التحديث مرة واحدة فقط (BOOM! 💥)
    tbody.innerHTML = allRowsHTML;

    document.querySelector('.pagination span').innerText = `عرض ${dataToRender.length} من أصل ${state.students.length}`;
}
function renderStats() {
    const total = state.students.length;
    const latestLecId = state.lectures.length > 0 ? state.lectures[state.lectures.length - 1].id : null;
    let absence = 0;
    if (latestLecId) {
        absence = state.students.filter(s => !s.progress[latestLecId]).length;
    }
    const remaining = state.settings.totalPlannedLectures - state.lectures.length;

    document.getElementById('stat-total').innerText = total;
    document.getElementById('stat-absence').innerText = absence;
    document.getElementById('stat-remaining').innerText = remaining > 0 ? remaining : 0;
}

function renderDate() {
    try {
        const date = new Date();
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', calendar: 'islamic-umalqura' };
        document.querySelector('.date-display').innerText = new Intl.DateTimeFormat('ar-SA-u-ca-islamic', options).format(date);
    } catch (e) {
        document.querySelector('.date-display').innerText = new Date().toLocaleDateString('ar-EG');
    }
}

// ================= HADITH =================
function renderHadith() {
    const hadiths = [
        "عن عمر بن الخطاب رضي الله عنه قال: سمعت رسول الله ﷺ يقول: «إنما الأعمال بالنيات، وإنما لكل امرئ ما نوى». \n(متفق عليه)",
        "عن أبي هريرة رضي الله عنه قال: قال رسول الله ﷺ: «كلمتان خفيفتان على اللسان، ثقيلتان في الميزان، حبيبتان إلى الرحمن: سبحان الله وبحمده، سبحان الله العظيم». \n(متفق عليه)",
        "عن أنس رضي الله عنه، عن النبي ﷺ قال: «لا يؤمن أحدكم حتى يحب لأخيه ما يحب لنفسه». \n(متفق عليه)",
        "عن أبي هريرة رضي الله عنه قال: قال رسول الله ﷺ: «من كان يؤمن بالله واليوم الآخر فليقل خيراً أو ليصمت». \n(متفق عليه)",
        "عن تميم الداري رضي الله عنه أن النبي ﷺ قال: «الدين النصيحة». قلنا: لمن؟ قال: «لله ولكتابه ولرسوله ولأئمة المسلمين وعامتهم». \n(رواه مسلم)",
        "عن أبي موسى رضي الله عنه قال: قال رسول الله ﷺ: «المؤمن للمؤمن كالبنيان يشد بعضه بعضاً» وشبك بين أصابعه. \n(متفق عليه)",
        "عن ابن عمر رضي الله عنهما قال: قال رسول الله ﷺ: «بني الإسلام على خمس: شهادة أن لا إله إلا الله وأن محمداً رسول الله، وإقام الصلاة، وإيتاء الزكاة، والحج، وصوم رمضان». \n(متفق عليه)",
        "عن أبي هريرة رضي الله عنه أن رسول الله ﷺ قال: «من دعا إلى هدى كان له من الأجر مثل أجور من تبعه لا ينقص ذلك من أجورهم شيئاً». \n(رواه مسلم)",
        "عن عائشة رضي الله عنها قالت: قال رسول الله ﷺ: «من أحدث في أمرنا هذا ما ليس منه فهو رد». \n(متفق عليه)",
        "عن النعمان بن بشير رضي الله عنهما قال: سمعت رسول الله ﷺ يقول: «إن الحلال بين، وإن الحرام بين، وبينهما مشتبهات لا يعلمهن كثير من الناس». \n(متفق عليه)",
        "عن أبي هريرة رضي الله عنه قال: قال رسول الله ﷺ: «أكمل المؤمنين إيماناً أحسنهم خلقاً». \n(رواه الترمذي وقال حديث حسن صحيح)",
        "عن عبد الله بن مسعود رضي الله عنه قال: قال رسول الله ﷺ: «عليكم بالصدق فإن الصدق يهدي إلى البر، وإن البر يهدي إلى الجنة». \n(متفق عليه)",
        "عن أبي هريرة رضي الله عنه قال: قال رسول الله ﷺ: «آية المنافق ثلاث: إذا حدث كذب، وإذا وعد أخلف، وإذا اؤتمن خان». \n(متفق عليه)",
        "عن أبي هريرة رضي الله عنه أن رجلاً قال للنبي ﷺ: أوصني. قال: «لا تغضب» فردد مراراً، قال: «لا تغضب». \n(رواه البخاري)",
        "عن أبي ذر الغفاري رضي الله عنه قال: قال لي رسول الله ﷺ: «اتق الله حيثما كنت، وأتبع السيئة الحسنة تمحها، وخالق الناس بخلق حسن». \n(رواه الترمذي)",
        "عن ابن عباس رضي الله عنهما قال: قال رسول الله ﷺ: «نعمتان مغبون فيهما كثير من الناس: الصحة والفراغ». \n(رواه البخاري)",
        "عن أبي هريرة رضي الله عنه قال: قال رسول الله ﷺ: «لا يدخل الجنة قاطع رحم». \n(رواه مسلم)",
        "عن عبد الله بن عمرو رضي الله عنهما قال: قال رسول الله ﷺ: «المسلم من سلم المسلمون من لسانه ويده». \n(متفق عليه)",
        "عن أبي هريرة رضي الله عنه قال: قال رسول الله ﷺ: «حق المسلم على المسلم خمس: رد السلام، وعيادة المريض، واتباع الجنائز، وإجابة الدعوة، وتشميت العاطس». \n(متفق عليه)",
        "عن أبي هريرة رضي الله عنه قال: قال رسول الله ﷺ: «لا تحاسدوا، ولا تناجشوا، ولا تباغضوا، ولا تدابروا، وكونوا عباد الله إخواناً». \n(رواه مسلم)",
        "عن معاوية رضي الله عنه قال: قال رسول الله ﷺ: «من يرد الله به خيراً يفقهه في الدين». \n(متفق عليه)",
        "عن عثمان بن عفان رضي الله عنه قال: قال رسول الله ﷺ: «خيركم من تعلم القرآن وعلمه». \n(رواه البخاري)",
        "عن أنس رضي الله عنه قال: قال رسول الله ﷺ: «الدعاء مخ العبادة». \n(رواه الترمذي)",
        "عن النواس بن سمعان رضي الله عنه قال: سألت رسول الله ﷺ عن البر والإثم فقال: «البر حسن الخلق، والإثم ما حاك في صدرك وكرهت أن يطلع عليه الناس». \n(رواه مسلم)",
        "عن أبي هريرة رضي الله عنه قال: قال رسول الله ﷺ: «ما نقصت صدقة من مال، وما زاد الله عبداً بعفو إلا عزاً، وما تواضع أحد لله إلا رفعه الله». \n(رواه مسلم)",
        "عن أبي هريرة رضي الله عنه قال: قال رسول الله ﷺ: «من سلك طريقاً يلتمس فيه علماً سهل الله له به طريقاً إلى الجنة». \n(رواه مسلم)",
        "عن أبي قتادة رضي الله عنه قال: قال رسول الله ﷺ: «إذا دخل أحدكم المسجد فلا يجلس حتى يصلي ركعتين». \n(متفق عليه)",
        "عن أبي هريرة رضي الله عنه أن رسول الله ﷺ قال: «الصلوات الخمس، والجمعة إلى الجمعة، كفارة لما بينهن ما لم تغش الكبائر». \n(رواه مسلم)",
        "عن ابن عمر رضي الله عنهما قال: أخذ رسول الله ﷺ بمنكبي فقال: «كن في الدنيا كأنك غريب أو عابر سبيل». \n(رواه البخاري)",
        "عن أبي هريرة رضي الله عنه قال: قال رسول الله ﷺ: «أحب البلاد إلى الله مساجدها، وأبغض البلاد إلى الله أسواقها». \n(رواه مسلم)",
        "عن عائشة رضي الله عنها قالت: قال رسول الله ﷺ: «السواك مطهرة للفم مرضاة للرب». \n(رواه النسائي)",
        "عن أبي هريرة رضي الله عنه قال: قال رسول الله ﷺ: «أقرب ما يكون العبد من ربه وهو ساجد فأكثروا الدعاء». \n(رواه مسلم)",
        "عن أبي هريرة رضي الله عنه قال: قال رسول الله ﷺ: «من صام رمضان إيماناً واحتساباً غفر له ما تقدم من ذنبه». \n(متفق عليه)",
        "عن عمر رضي الله عنه قال: قال رسول الله ﷺ: «أفضل الأعمال إدخال السرور على المؤمن». \n(رواه الطبراني)",
        "عن جرير بن عبد الله رضي الله عنه قال: قال رسول الله ﷺ: «من لا يرحم الناس لا يرحمه الله». \n(متفق عليه)",
        "عن أبي هريرة رضي الله عنه قال: قال رسول الله ﷺ: «الإيمان بضع وسبعون شعبة، فأفضلها قول لا إله إلا الله، وأدناها إماطة الأذى عن الطريق». \n(رواه مسلم)",
        "عن أبي هريرة رضي الله عنه قال: قال رسول الله ﷺ: «الدنيا سجن المؤمن وجنة الكافر». \n(رواه مسلم)",
        "عن شداد بن أوس رضي الله عنه قال: قال رسول الله ﷺ: «الكيس من دان نفسه وعمل لما بعد الموت، والعاجز من أتبع نفسه هواها وتمنى على الله الأماني». \n(رواه الترمذي)",
        "عن أبي هريرة رضي الله عنه قال: قال رسول الله ﷺ: «إذا مات ابن آدم انقطع عمله إلا من ثلاث: صدقة جارية، أو علم ينتفع به، أو ولد صالح يدعو له». \n(رواه مسلم)",
        "عن أنس رضي الله عنه قال: قال رسول الله ﷺ: «لا يتمنين أحدكم الموت لضر نزل به». \n(متفق عليه)",
        "عن ابن مسعود رضي الله عنه قال: سألت النبي ﷺ أي العمل أحب إلى الله؟ قال: «الصلاة على وقتها». قلت ثم أي؟ قال: «بر الوالدين». \n(متفق عليه)",
        "عن أبي هريرة رضي الله عنه قال: قال رسول الله ﷺ: «من حج فلم يرفث ولم يفسق رجع كيوم ولدته أمه». \n(متفق عليه)",
        "عن عائشة رضي الله عنها قالت: قال رسول الله ﷺ: «الماهر بالقرآن مع السفرة الكرام البررة». \n(متفق عليه)",
        "عن أبي موسى رضي الله عنه قال: قال رسول الله ﷺ: «مثل الذي يذكر ربه والذي لا يذكر ربه مثل الحي والميت». \n(رواه البخاري)",
        "عن أبي ذر رضي الله عنه قال: قال رسول الله ﷺ: «تبسمك في وجه أخيك لك صدقة». \n(رواه الترمذي)",
        "عن أبي هريرة رضي الله عنه قال: قال رسول الله ﷺ: «الكلمة الطيبة صدقة». \n(متفق عليه)",
        "عن جابر رضي الله عنه قال: لعن رسول الله ﷺ آكل الربا وموكله وكاتبه وشاهديه، وقال: «هم سواء». \n(رواه مسلم)",
        "عن أبي هريرة رضي الله عنه قال: قال رسول الله ﷺ: «اجتنبوا السبع الموبقات... الشرك بالله، والسحر، وقتل النفس...». \n(متفق عليه)",
        "عن أبي هريرة رضي الله عنه قال: قال رسول الله ﷺ: «لا يلدغ المؤمن من جحر واحد مرتين». \n(متفق عليه)",
        "عن عائشة رضي الله عنها قالت: قال رسول الله ﷺ: «إن الله رفيق يحب الرفق في الأمر كله». \n(متفق عليه)",
        "عن سهل بن سعد رضي الله عنه قال: قال رسول الله ﷺ: «أنا وكافل اليتيم في الجنة هكذا» وأشار بالسبابة والوسطى. \n(رواه البخاري)",
        "عن ابن عمر رضي الله عنهما قال: قال رسول الله ﷺ: «كلكم راع وكلكم مسؤول عن رعيته». \n(متفق عليه)",
        "عن أبي هريرة رضي الله عنه قال: قال رسول الله ﷺ: «من غشنا فليس منا». \n(رواه مسلم)",
        "عن أبي هريرة رضي الله عنه قال: قال رسول الله ﷺ: «تهادوا تحابوا». \n(رواه البخاري في الأدب المفرد)",
        "عن أبي هريرة رضي الله عنه قال: قال رسول الله ﷺ: «المؤمن القوي خير وأحب إلى الله من المؤمن الضعيف، وفي كل خير». \n(رواه مسلم)",
        "عن أنس رضي الله عنه قال: قال رسول الله ﷺ: «يسروا ولا تعسروا، وبشروا ولا تنفروا». \n(متفق عليه)",
        "عن أبي شريح رضي الله عنه قال: قال رسول الله ﷺ: «والله لا يؤمن، والله لا يؤمن، والله لا يؤمن. قيل: من يا رسول الله؟ قال: الذي لا يأمن جاره بوائقه». \n(رواه البخاري)",
        "عن المقدام بن معد يكرب رضي الله عنه قال: قال رسول الله ﷺ: «ما أكل أحد طعاماً قط خيراً من أن يأكل من عمل يده». \n(رواه البخاري)",
        "عن أبي هريرة رضي الله عنه قال: قال رسول الله ﷺ: «من كان يؤمن بالله واليوم الآخر فليكرم ضيفه». \n(متفق عليه)",
        "عن ابن عباس رضي الله عنهما قال: «احفظ الله يحفظك، احفظ الله تجده تجاهك». \n(رواه الترمذي)",
        "عن أبي سعيد الخدري رضي الله عنه قال: قال رسول الله ﷺ: «إياكم والجلوس في الطرقات». \n(متفق عليه)",
        "عن ابن مسعود رضي الله عنه قال: قال رسول الله ﷺ: «سباب المسلم فسوق، وقتاله كفر». \n(متفق عليه)",
        "عن أبي هريرة رضي الله عنه قال: قال رسول الله ﷺ: «كل سلامى من الناس عليه صدقة... وتعين الرجل في دابته فتحمله عليها أو ترفع له عليها متاعه صدقة». \n(متفق عليه)",
        "عن عائشة رضي الله عنها قالت: قال رسول الله ﷺ: «خيركم خيركم لأهله، وأنا خيركم لأهلي». \n(رواه الترمذي)",
        "عن أبي هريرة رضي الله عنه قال: قال رسول الله ﷺ: «إياكم والظن فإن الظن أكذب الحديث». \n(متفق عليه)",
        "عن أبي هريرة رضي الله عنه قال: قال رسول الله ﷺ: «لولا أن أشق على أمتي لأمرتهم بالسواك عند كل صلاة». \n(متفق عليه)",
        "عن أبي هريرة رضي الله عنه قال: قال رسول الله ﷺ: «من حسن إسلام المرء تركه ما لا يعنيه». \n(رواه الترمذي)",
        "عن أنس رضي الله عنه قال: سمعت رسول الله ﷺ يقول: «قال الله تعالى: يا ابن آدم إنك ما دعوتني ورجوتني غفرت لك على ما كان فيك ولا أبالي». \n(رواه الترمذي)",
        "عن أبي هريرة رضي الله عنه قال: قال رسول الله ﷺ: «من صام رمضان ثم أتبعه ستاً من شوال كان كصيام الدهر». \n(رواه مسلم)",
        "عن أبي هريرة رضي الله عنه قال: قال رسول الله ﷺ: «العمرة إلى العمرة كفارة لما بينهما، والحج المبرور ليس له جزاء إلا الجنة». \n(متفق عليه)",
        "عن عائشة رضي الله عنها قالت: «كان خلق نبي الله ﷺ القرآن». \n(رواه مسلم)",
        "عن عبد الله بن عمرو رضي الله عنهما قال: قال رسول الله ﷺ: «من أحب أن يزحزح عن النار ويدخل الجنة، فلتأته منيته وهو يؤمن بالله واليوم الآخر». \n(رواه مسلم)",
        "عن أبي هريرة رضي الله عنه قال: قال رسول الله ﷺ: «أفضل الصلاة بعد الفريضة صلاة الليل». \n(رواه مسلم)",
        "عن أبي هريرة رضي الله عنه قال: قال رسول الله ﷺ: «أتدرون ما الغيبة؟ قالوا: الله ورسوله أعلم. قال: ذكرك أخاك بما يكره». \n(رواه مسلم)",
        "عن أبي موسى رضي الله عنه قال: قال رسول الله ﷺ: «كل مسكر حرام». \n(متفق عليه)"
    ];
    
    const randomIndex = Math.floor(Math.random() * hadiths.length);
    const quoteElement = document.querySelector('.quote-box p');
    if (quoteElement) {
        quoteElement.innerText = hadiths[randomIndex];
        quoteElement.style.lineHeight = "1.8"; 
        quoteElement.style.whiteSpace = "pre-line"; 
    }
}

// ================= ACTIONS =================
function addStudentFlow() {
    const name = prompt('أدخل اسم الطالب:');
    if (!name) return;
    
    let phone = prompt('أدخل رقم الهاتف:');
    if (!phone) return;
    
    phone = cleanPhone(phone); // تنظيف الرقم الأول

    // --- التحقق من التكرار ---
    const exists = state.students.some(s => s.phone === phone);
    if (exists) {
        alert('⚠️ تنبيه: هذا الرقم مسجل بالفعل لطالب آخر!');
        return; // إلغاء العملية
    }
    // -----------------------

    state.students.push({
        id: Date.now(),
        name: name,
        phone: phone,
        progress: {},
        notes: ''
    });
    saveData();
}

function addLectureFlow() {
    const title = prompt('عنوان المحاضرة:', `محاضرة ${state.lectures.length + 1}`);
    if (!title) return;
    state.lectures.push({
        id: `lec_${Date.now()}`,
        title: title,
        timestamp: Date.now()
    });
    saveData();
}

function deleteStudentFlow(id) {
    if (confirm('حذف الطالب؟')) {
        state.students = state.students.filter(s => s.id !== id);
        saveData();
    }
}

function deleteLectureFlow(id) {
    if (confirm('حذف المحاضرة وجميع سجلات الحضور المرتبطة بها؟')) {
        state.lectures = state.lectures.filter(l => l.id !== id);
        state.students.forEach(s => { if (s.progress) delete s.progress[id]; });
        saveData();
    }
}

function toggleStudentCheck(sId, lId) {
    const student = state.students.find(s => s.id === sId);
    if (student) {
        // إذا كان الطالب محضر مسبقاً، نلغي التحضير
        if (student.progress[lId]) {
            delete student.progress[lId]; 
        } else {
            // إذا لم يكن محضر، نسجل "تاريخ اللحظة الحالية" بدلاً من true
            student.progress[lId] = Date.now();
        }
        saveData();
        // إعادة رسم الجدول لتحديث الألوان إذا كنت تستخدم ألوان تعتمد على الحالة
        // لكن بما أن الـ Checkbox يعتمد على وجود قيمة، فالنظام سيعمل طبيعي
    }
}

// 2. دالة مساعدة لحساب الدرجة بناءً على الأيام (منطق السبت 100، الأحد 90...)
function calculateScore(lectureTimestamp, checkTimestamp) {
    if (!checkTimestamp) return 0; 
    
    // --- التعديل الجديد: لو رد ولم يختبر ياخد صفر في الدرجات ---
    if (checkTimestamp === 'replied') return 0; 

    if (checkTimestamp === true) return 100; 

    const lecDate = new Date(lectureTimestamp || Date.now());
    lecDate.setHours(0,0,0,0);
    
    const checkDate = new Date(checkTimestamp);
    checkDate.setHours(0,0,0,0);

    const diffTime = checkDate - lecDate;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) return 100; 
    if (diffDays === 1) return 90; 
    if (diffDays === 2) return 80; 
    if (diffDays === 3) return 70; 
    if (diffDays === 4) return 60; 
    if (diffDays === 5) return 50; 
    if (diffDays === 6) return 40; 
    if (diffDays <= 13) return 30; 
    if (diffDays <= 20) return 20; 
    return 10; 
}
// ================= MESSAGING WITH BATCHES (UPDATED) =================
async function startMessagingFlow() {
    const msgText = document.getElementById('message-text').value;
    if (!msgText.trim()) { alert('الرجاء كتابة نص الرسالة.'); return; }
    if (state.lectures.length === 0) { alert('لا توجد محاضرات.'); return; }
    
    // 1. تحديد المستهدفين (الغياب عن آخر محاضرة)
    const latestLecIndex = state.lectures.length - 1;
    const latestLec = state.lectures[latestLecIndex];
    const absents = state.students.filter(s => !s.progress[latestLec.id]);

    if (absents.length === 0) { alert('لا يوجد غياب لهذه المحاضرة!'); return; }

    // --- التعديل الجديد (4): خيار الفلترة ---
    // نسأل المستخدم: عايز تبعت لمين؟
    let filterChoice = prompt(
        "لمن تريد إرسال الرسالة؟\n" +
        "1- للجميع (الكل)\n" +
        "2- للمسجلين بأسماء فقط (الذين ردوا)\n" +
        "3- للمسجلين بمسافات (الذين لم يردوا)\n\n" +
        "أدخل رقم الخيار (1 أو 2 أو 3):", "1"
    );

    let targetsRaw = [];

    if (filterChoice === '2') {
        // الذين لهم اسم حقيقي (ليس فارغاً وليس مسافات فقط)
        targetsRaw = absents.filter(s => s.name.trim().length > 0);
    } else if (filterChoice === '3') {
        // الذين اسمهم عبارة عن مسافات فقط
        targetsRaw = absents.filter(s => s.name.trim().length === 0);
    } else {
        // الكل
        targetsRaw = absents;
    }

    if (targetsRaw.length === 0) { alert('لا يوجد طلاب مطابقين لهذا الاختيار!'); return; }

    const targets = targetsRaw.map(s => ({
        name: s.name,
        phone: cleanPhone(s.phone)
    }));

    // --- التعديل الجديد (3): حجم الدفعة 20 ---
    const BATCH_SIZE = 20; 
    const totalBatches = Math.ceil(targets.length / BATCH_SIZE);
    
    if (!confirm(`تم تحديد ${targets.length} طالب.\nسيتم التقسيم على ${totalBatches} دفعات (كل دفعة ${BATCH_SIZE}).\nهل أنت متأكد من البدء؟`)) return;

    const btn = document.querySelector('.btn-whatsapp');
    const originalBtnText = btn.innerHTML;
    const includeNameElement = document.getElementById('include-name-toggle');
    const includeName = includeNameElement ? includeNameElement.checked : true;

    try {
        let totalSent = 0;

        for (let i = 0; i < totalBatches; i++) {
            // تحديد الدفعة الحالية
            const start = i * BATCH_SIZE;
            const end = start + BATCH_SIZE;
            const currentBatch = targets.slice(start, end);

            // تحديث الزر
            btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> جاري إرسال دفعة ${i + 1} من ${totalBatches}...`;
            btn.disabled = true;

            // إرسال الدفعة للسيرفر
            const payload = {
                students: currentBatch,
                message: msgText,
                include_name: includeName 
            };

            const response = await fetch('/api/send_whatsapp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const result = await response.json();

            if (result.status === 'success') {
                totalSent += result.count;
                
                // تحديث العداد
                if (typeof state.lectures[latestLecIndex].msgCount === 'undefined') {
                    state.lectures[latestLecIndex].msgCount = 0;
                }
                state.lectures[latestLecIndex].msgCount += result.count;
                saveData();

                // --- التعديل الجديد (3): التخيير بين الدفعات ---
                if (i < totalBatches - 1) {
                    btn.innerHTML = originalBtnText; // إرجاع الزر لحالته
                    btn.disabled = false;
                    
                    // تشغيل صوت تنبيه بسيط (اختياري) أو مجرد نافذة
                    if (!confirm(`✅ انتهت الدفعة ${i + 1} بنجاح.\nتم إرسال ${result.count} رسالة.\n\nهل تريد الاستمرار للدفعة التالية (${i + 2})؟\n(اضغط Cancel للإيقاف هنا)`)) {
                        break; // إيقاف اللوب إذا ضغط المستخدم Cancel
                    }
                }
                
            } else {
                alert(`❌ توقف خطأ في الدفعة ${i+1}: ` + result.message);
                break;
            }
        }

        alert(`✅ انتهت العملية! إجمالي الرسائل المرسلة: ${totalSent}`);

    } catch (error) {
        alert('فشل الاتصال بالخادم.');
        console.error(error);
    } finally {
        btn.innerHTML = originalBtnText;
        btn.disabled = false;
    }
}
// ================= SEARCH & SORT =================
function handleSearch() {
    const query = document.getElementById('searchInput').value.toLowerCase().trim();
    if (!query) {
        renderTable(); 
        return;
    }
    const filtered = state.students.filter(s => 
        s.name.toLowerCase().includes(query) || s.phone.includes(query)
    );
    renderTable(filtered);
}

let sortDirection = 1; 
function sortStudents(criteria, lecId = null) {
    let listSort = [...state.students];
    
    if (criteria === 'name') {
        // === التعديل هنا ===
        // الترتيب بناءً على النسبة المئوية (Total Score)
        listSort.sort((a, b) => {
            const scoreA = getStudentTotalScore(a);
            const scoreB = getStudentTotalScore(b);
            
            // لو الدرجات متساوية، رتبهم أبجدياً عشان الشكل يكون منظم
            if (scoreA === scoreB) {
                return a.name.localeCompare(b.name, 'ar');
            }
            
            // الترتيب من الأعلى للأقل (تنازلي) مضروب في اتجاه الترتيب (عشان لو ضغط تاني يعكس)
            return (scoreB - scoreA) * sortDirection;
        });

    } else if (criteria === 'score') {
        // ترتيب "عدد" مرات الحضور (ده الزرار القديم اللي عليه علامة الرسم البياني)
        listSort.sort((a, b) => {
            const countA = Object.values(a.progress || {}).filter(v => v).length;
            const countB = Object.values(b.progress || {}).filter(v => v).length;
            return (countB - countA) * sortDirection; 
        });

    } else if (criteria === 'lecture' && lecId) {
        // الترتيب حسب درجة محاضرة معينة
        const lecture = state.lectures.find(l => l.id === lecId);
        const ts = lecture ? lecture.timestamp : Date.now();
        
        listSort.sort((a, b) => {
            const scoreA = calculateScore(ts, a.progress[lecId]);
            const scoreB = calculateScore(ts, b.progress[lecId]);
            return (scoreB - scoreA) * sortDirection;
        });
    }
    
    sortDirection *= -1; // عكس الاتجاه للمرة القادمة (تصاعدي/تنازلي)
    renderTable(listSort);
}

// ================= EXCEL (STYLED) - FIXED =================
function exportToExcel() {
    if (typeof XLSX === 'undefined') { alert('المكتبة غير محملة'); return; }

    const data = [];
    const header = ['#', 'اسم الطالب', 'رقم الهاتف'];
    state.lectures.forEach(l => header.push(l.title));
    header.push('النسبة');
    data.push(header);

    state.students.forEach((s, i) => {
        const row = [i + 1, s.name, s.phone];
        let c = 0; // عداد الحضور الفعلي
        
        state.lectures.forEach(l => {
            const p = s.progress[l.id];
            
            // --- التعديل هنا ---
            if (p === 'replied') {
                row.push('💬'); // رمز مميز للي رد بس
                // ملاحظة: مش هنزود العداد c
            } else {
                row.push(p ? '✔' : '✖');
                if(p) c++; // تزويد العداد للحضور الحقيقي فقط
            }
            // -------------------
        });
        
        const pct = state.lectures.length > 0 ? Math.round((c/state.lectures.length)*100)+'%' : '0%';
        row.push(pct);
        data.push(row);
    });

    const ws = XLSX.utils.aoa_to_sheet(data);
    const wscols = [{wch:5}, {wch:30}, {wch:15}];
    state.lectures.forEach(() => wscols.push({wch:12}));
    wscols.push({wch:10});
    ws['!cols'] = wscols;

    const range = XLSX.utils.decode_range(ws['!ref']);
    for (let R = range.s.r; R <= range.e.r; ++R) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
            const addr = XLSX.utils.encode_cell({r:R, c:C});
            if(!ws[addr]) continue;
            
            ws[addr].s = {
                font: { name: "Arial", sz: 11 },
                alignment: { vertical: "center", horizontal: "center" },
                border: {
                    top:{style:"thin", color:{rgb:"CCCCCC"}},
                    bottom:{style:"thin", color:{rgb:"CCCCCC"}},
                    left:{style:"thin", color:{rgb:"CCCCCC"}},
                    right:{style:"thin", color:{rgb:"CCCCCC"}}
                }
            };

            if (R === 0) {
                ws[addr].s.fill = { fgColor: { rgb: "1A5D3A" } };
                ws[addr].s.font = { name: "Arial", sz: 12, bold: true, color: { rgb: "FFFFFF" } };
            } else {
                // تلوين الخانات بناءً على القيمة
                if(ws[addr].v === '✔') ws[addr].s.font.color = { rgb: "008000" }; // أخضر للحاضر
                if(ws[addr].v === '✖') ws[addr].s.font.color = { rgb: "FF0000" }; // أحمر للغائب
                
                // --- إضافة: تلوين "رد ولم يختبر" بالأصفر ---
                if(ws[addr].v === '💬') {
                    ws[addr].s.fill = { fgColor: { rgb: "FFF3CD" } }; // خلفية صفراء
                    ws[addr].s.font.color = { rgb: "F39C12" }; // نص برتقالي
                }
            }
        }
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "سجل المتابعة");
    XLSX.writeFile(wb, `Athar_Report_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
// ================= THEME & NOTES =================
function toggleTheme() {
    document.body.classList.toggle('dark-theme');
    const isDark = document.body.classList.contains('dark-theme');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    updateThemeIcon(isDark);
}

function loadTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
        updateThemeIcon(true);
    }
}

function updateThemeIcon(isDark) {
    const icon = document.querySelector('.btn-action i.fa-moon, .btn-action i.fa-sun');
    if(icon) {
        icon.className = isDark ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
    }
}

let currentEditingStudentId = null;
function openNotesModal(studentId) {
    const student = state.students.find(s => s.id === studentId);
    if (!student) return;
    
    currentEditingStudentId = studentId;

    // تعبئة البيانات الأساسية
    document.getElementById('modal-student-name').innerText = student.name;
    document.getElementById('modal-student-phone').innerText = student.phone;
    document.getElementById('modal-avatar').innerText = getInitials(student.name);
    document.getElementById('student-notes').value = student.notes || '';
    
    const historyContainer = document.getElementById('attendance-history');
    historyContainer.innerHTML = '';
    
    let chartLabels = [];
    let chartData = [];

    // التكرار على المحاضرات
    state.lectures.forEach((lec) => {
        const progressValue = student.progress[lec.id];
        const score = calculateScore(lec.timestamp, progressValue);
        
        let statusText = 'غائب';
        let statusClass = 'absent';
        let icon = '<i class="fa-solid fa-xmark"></i>';
        
        // تحديد النص في القائمة الجانبية
        if (progressValue) {
            statusClass = 'present';
            icon = '<i class="fa-solid fa-check"></i>';
            
            // نصوص الحالة بناءً على الدرجة
            if(score === 100) statusText = 'تم (السبت)';
            else if(score === 90) statusText = 'تم (الأحد)';
            else if(score === 80) statusText = 'تم (الاثنين)';
            else if(score === 70) statusText = 'تم (الثلاثاء)';
            else if(score === 60) statusText = 'تم (الأربعاء)';
            else if(score === 50) statusText = 'تم (الخميس)';
            else if(score === 40) statusText = 'تم (الجمعة)';
            else if(score === 30) statusText = 'تأخير أسبوع';
            else if(score === 20) statusText = 'تأخير أسبوعين';
            else if(score === 10) statusText = 'تأخير > أسبوعين';
            
            // تلوين القائمة الجانبية بالأحمر للتأخيرات الطويلة
            if(score <= 30) statusClass = 'absent'; 
        }

        const itemHTML = `
            <div class="history-item ${statusClass}">
                <div>
                    <div style="font-weight:bold">${lec.title}</div>
                    <div class="date" style="font-size:0.7rem; color:#aaa;">
                         ${progressValue && progressValue !== true ? new Date(progressValue).toLocaleDateString('ar-EG') : ''}
                    </div>
                </div>
                <div class="status">${icon} ${statusText}</div>
            </div>
        `;
        historyContainer.insertAdjacentHTML('afterbegin', itemHTML);

        chartLabels.push(lec.title);
        chartData.push(score);
    });

    // إعداد الرسم البياني
    const ctx = document.getElementById('performanceChart').getContext('2d');
    
    if (performanceChart) {
        performanceChart.destroy();
    }

    performanceChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: chartLabels,
            datasets: [{
                label: 'حالة التسليم',
                data: chartData,
                borderColor: '#1A5D3A',
                backgroundColor: 'rgba(26, 93, 58, 0.05)',
                borderWidth: 3,
                pointBackgroundColor: function(context) {
                    var val = context.raw;
                    if (val >= 90) return '#27ae60'; // أخضر (ممتاز)
                    if (val >= 40) return '#f39c12'; // برتقالي (خلال الأسبوع)
                    return '#e74c3c'; // أحمر (تأخير أسابيع)
                },
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 6,
                pointHoverRadius: 8,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: { top: 20, right: 10, left: 10, bottom: 0 }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    min: 0,
                    grid: {
                        color: '#f0f0f0',
                        drawBorder: false
                    },
                    ticks: {
                        stepSize: 10,
                        font: { family: 'Cairo', size: 10, weight: 'bold' }, // تصغير الخط قليلاً ليسع الكلام
                        color: '#555',
                        // هنا تحويل الأرقام للنصوص الجديدة
                        callback: function(value) {
                            if(value === 100) return 'السبت 👑';
                            if(value === 90) return 'الأحد';
                            if(value === 80) return 'الاثنين';
                            if(value === 70) return 'الثلاثاء';
                            if(value === 60) return 'الأربعاء';
                            if(value === 50) return 'الخميس';
                            if(value === 40) return 'الجمعة';
                            if(value === 30) return 'تأخير أسبوع';
                            if(value === 20) return 'تأخير أسبوعين';
                            if(value === 10) return '> أسبوعين';
                            if(value === 0) return 'غائب';
                            return '';
                        }
                    }
                },
                x: {
                    grid: { display: false },
                    ticks: { font: { family: 'Cairo' } }
                }
            },
            plugins: {
                tooltip: {
                    backgroundColor: '#1A5D3A',
                    titleFont: { family: 'Cairo' },
                    bodyFont: { family: 'Cairo' },
                    callbacks: {
                        label: function(context) {
                            const val = context.raw;
                            let status = '';
                            if(val === 100) status = 'تسليم يوم السبت (ممتاز)';
                            else if(val === 90) status = 'تسليم يوم الأحد';
                            else if(val >= 40) status = 'تسليم خلال الأسبوع';
                            else if(val === 30) status = 'تأخر أسبوعاً كاملاً';
                            else if(val === 20) status = 'تأخر أسبوعين';
                            else if(val === 10) status = 'تأخر أكثر من أسبوعين';
                            else status = 'لم يسلم (غائب)';
                            return `الحالة: ${status}`;
                        }
                    }
                },
                legend: { display: false }
            }
        }
    });

    document.getElementById('notes-modal').style.display = 'flex';
}
function closeNotesModal() {
    document.getElementById('notes-modal').style.display = 'none';
    currentEditingStudentId = null;
}

function saveStudentNotes() {
    if (!currentEditingStudentId) return;
    const idx = state.students.findIndex(s => s.id === currentEditingStudentId);
    if (idx !== -1) {
        state.students[idx].notes = document.getElementById('student-notes').value;
        saveData();
        closeNotesModal();
    }
}

window.onclick = function(e) {
    if (e.target == document.getElementById('notes-modal')) closeNotesModal();
}

function getReportFile() {
    const totalStudents = state.students.length;
    let reportText = `=== تقرير منصة أثر التعليمية ===
تاريخ الاستخراج: ${new Date().toLocaleDateString('ar-EG')}
عدد الطلاب الكلي: ${totalStudents}

📊 تفاصيل المحاضرات والرسائل:
----------------------------------------\n`;

    // الدوران على كل المحاضرات لعرض تفاصيلها
    state.lectures.forEach((lec, index) => {
// 1. حساب الحضور الفعلي (اللي عندهم درجات)
const presentCount = state.students.filter(s => s.progress[lec.id] && s.progress[lec.id] !== 'replied').length;

// 2. حساب "رد ولم يختبر" (الجديد)
const repliedCount = state.students.filter(s => s.progress[lec.id] === 'replied').length;

// 3. الغياب الكلي (الباقي)
const absentCount = totalStudents - presentCount - repliedCount;

const attendancePct = totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 0;
const msgsSent = lec.msgCount || 0;

reportText += `
${index + 1}. محاضرة: ${lec.title}

   - ✅ الحضور (اختبروا): ${presentCount}

   - 💬 رد ولم يختبر: ${repliedCount}

   - ❌ غياب تام: ${absentCount}

   - نسبة الحضور: ${attendancePct}%

   - 📩 رسائل المتابعة: ${msgsSent}

----------------------------------------`
});
    reportText += `\n
📈 ملخص عام:

----------------------------------------

• إجمالي المحاضرات: ${state.lectures.length}

• إجمالي الرسائل المرسلة (لجميع المحاضرات): ${state.lectures.reduce((acc, l) => acc + (l.msgCount || 0), 0)}

تم استخراج هذا التقرير آلياً.`;

    // إنشاء وتحميل الملف
    const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Detailed_Report_${new Date().toISOString().slice(0,10)}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
 
// ================= BACKUP & RESTORE =================
function backupData() {
    // نجمع كل البيانات المهمة
    const backup = {
        students: state.students,
        lectures: state.lectures,
        settings: state.settings,
        habits: JSON.parse(localStorage.getItem('Athar_habits_data') || '[]'), // لو عايز تحفظ العادات كمان
        date: new Date().toISOString()
    };

    const dataStr = JSON.stringify(backup, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    
    // إنشاء رابط تحميل وهمي والضغط عليه
    const a = document.createElement('a');
    a.href = url;
    a.download = `Athar_Backup_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function restoreData(input) {
    const file = input.files[0];
    if (!file) return;

    if (!confirm("تحذير: استرجاع النسخة سيحذف البيانات الحالية ويستبدلها بالنسخة. هل أنت متأكد؟")) {
        input.value = ''; // تفريغ الملف
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            
            // التحقق من صحة الملف
            if (data.students && data.lectures) {
                // استرجاع البيانات الأساسية
                state.students = data.students;
                state.lectures = data.lectures;
                if(data.settings) state.settings = data.settings;
                
                saveData(); // حفظ في LocalStorage

                // استرجاع بيانات العادات (لو موجودة)
                if (data.habits) {
                    localStorage.setItem('Athar_habits_data', JSON.stringify(data.habits));
                }

                alert("✅ تم استرجاع البيانات بنجاح!");
                location.reload(); // إعادة تحميل الصفحة لتحديث العرض
            } else {
                alert("❌ ملف غير صالح.");
            }
        } catch (err) {
            alert("❌ حدث خطأ أثناء قراءة الملف: " + err);
        }
    };
    reader.readAsText(file);
}
 
// ================= CONTEXT MENU LOGIC =================
let contextTarget = { sId: null, lId: null };

function showContextMenu(e, sId, lId) {
    e.preventDefault(); // منع قائمة المتصفح الافتراضية
    contextTarget = { sId, lId };
    
    const menu = document.getElementById('context-menu');
    
    // حساب موقع الماوس
    let x = e.clientX;
    let y = e.clientY;
    
    // التأكد من أن القائمة لا تخرج خارج الشاشة
    if (x + 200 > window.innerWidth) x -= 200;
    
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
    menu.style.display = 'block';
}

function manualStatus(days) {
    const { sId, lId } = contextTarget;
    if (!sId || !lId) return;

    const student = state.students.find(s => s.id === sId);
    
    if (student) {
        if (days === -1) {
            // حذف (غياب)
            delete student.progress[lId];
        } else if (days === 'replied') {
            // --- التعديل الجديد: حالة رد ولم يختبر ---
            student.progress[lId] = 'replied'; 
        } else {
            // حساب التاريخ للأيام العادية
            const lecture = state.lectures.find(l => l.id === lId);
            if (lecture) {
                const targetDate = lecture.timestamp + (days * 24 * 60 * 60 * 1000) + (10 * 60 * 1000);
                student.progress[lId] = targetDate;
            }
        }
        saveData();
    }
    hideContextMenu();
}

function hideContextMenu() {
    document.getElementById('context-menu').style.display = 'none';
    contextTarget = { sId: null, lId: null };
}

// إغلاق القائمة عند الضغط في أي مكان
document.addEventListener('click', hideContextMenu);
// إغلاق القائمة عند عمل سكرول
document.addEventListener('scroll', hideContextMenu);

// Helpers
function getInitials(name) { return name ? name.charAt(0) : '?'; }
function cleanPhone(p) { return p.replace(/[\s\-\+\(\)]/g, ''); }

document.addEventListener('DOMContentLoaded', init);


// ================= CERTIFICATE GENERATION =================
// وظيفة إنشاء وتحميل الشهادة باستخدام Canvas
window.app.downloadCert = function(studentName, lectureCount) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    // تأكد أن الصورة في مجلد static بنفس هذا الاسم تماماً
    img.src = '/static/certificate_template.jpg'; 

    img.onload = function() {
        canvas.width = img.width;   
        canvas.height = img.height; 
        ctx.drawImage(img, 0, 0);

        // 1. تنسيق اسم الطالب (توسيط في المربع الأبيض)
        const nameFontSize = Math.floor(canvas.width * 0.045); 
        ctx.font = `bold ${nameFontSize}px Cairo`; 
        ctx.fillStyle = '#1A2E35'; 
        ctx.textAlign = 'center';
        // تم الضبط على 54% ليكون الاسم في قلب البرواز الأبيض تماماً
        ctx.fillText(studentName, canvas.width * 0.50, canvas.height * 0.54); 

        // 2. تنسيق رقم المحاضرة (ضبط دقيق داخل الأقواس)
        const numFontSize = Math.floor(canvas.width * 0.032); 
        ctx.font = `bold ${numFontSize}px Cairo`;
        ctx.fillStyle = '#FFFFFF'; 
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        ctx.fillText(
            lectureCount,
            560, // X بالبكسل (منتصف الأقواس)
            705  // Y بالبكسل (منتصف السطر)
        );

        // كود التاريخ محذوف نهائياً بناءً على طلبك

        // بدء التحميل
        const link = document.createElement('a');
        link.download = `شهادة_تقدير_${studentName}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    };
    
    img.onerror = function() {
        alert("تأكد من وضع ملف الصورة certificate_template.jpg داخل مجلد static");
    };
};

// ================= BATCH PDF GENERATION (FIXED) =================
window.app.downloadLecturePDF = function(lecId, lecTitle) {
    if (!window.jspdf) { 
        alert("مكتبة PDF غير محملة! تأكد من إضافتها في index.html"); 
        return; 
    }
    
    // --- التعديل هنا: الفلترة تستبعد 'replied' ---
    const attendees = state.students.filter(s => s.progress[lecId] && s.progress[lecId] !== 'replied');
    // ---------------------------------------------
    
    if (attendees.length === 0) {
        alert("لا يوجد حضور مسجل (بدرجات) لهذه المحاضرة.");
        return;
    }

    if (!confirm(`سيتم استخراج ملف PDF يحتوي على ${attendees.length} شهادة.\n(تم استبعاد حالات "رد ولم يختبر")\nهل تريد الاستمرار؟`)) return;

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [800, 600]
    });

    const img = new Image();
    img.src = '/static/certificate_template.jpg'; 

    img.onload = function() {
        attendees.forEach((student, index) => {
            if (index > 0) doc.addPage(); 

            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            
            ctx.drawImage(img, 0, 0);

            // 1. الاسم
            const nameFontSize = Math.floor(canvas.width * 0.045); 
            ctx.font = `bold ${nameFontSize}px Cairo, sans-serif`; 
            ctx.fillStyle = '#1A2E35'; 
            ctx.textAlign = 'center';
            ctx.fillText(student.name, canvas.width * 0.50, canvas.height * 0.54); 

            // 2. رقم المحاضرة
            const titleFontSize = Math.floor(canvas.width * 0.025); 
            ctx.font = `bold ${titleFontSize}px Cairo, sans-serif`;
            ctx.fillStyle = '#FFFFFF'; 
            ctx.textAlign = 'center';
            
            let textToPrint = lecTitle.replace("محاضرة", "").replace("محاضره", "").trim();
            ctx.fillText(textToPrint, 560, 705); 

            const dataURL = canvas.toDataURL('image/jpeg', 0.8);
            doc.addImage(dataURL, 'JPEG', 0, 0, 800, 600);
        });

        doc.save(`شهادات_حضور_${lecTitle}.pdf`);
    };

    img.onerror = function() {
        alert("الصورة غير موجودة في مجلد static");
    };
};
// ================= BULK IMPORT & EDIT LOGIC =================

// دالة معالجة الاستيراد الذكي (أرقام أو أسماء)
function processBulkImport() {
    const rawText = document.getElementById('import-text').value;
    if (!rawText.trim()) return;

    const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(l => l);
    if (lines.length === 0) return;

    if (!confirm(`سيتم استيراد ${lines.length} سجل. هل أنت متأكد؟`)) return;

    let added = 0;
    lines.forEach((line, idx) => {
        // التحقق: هل المدخل رقم هاتف أم اسم؟
        // إذا كان يحتوي على أرقام فقط ويعتبر طويلاً، نعتبره هاتفاً
        const isPhone = /^[0-9+\-\s()]{8,}$/.test(line);
        
        let newName = '';
        let newPhone = '';

        if (isPhone) {
            newPhone = cleanPhone(line);
            newName = `طالب ${state.students.length + 1 + idx}`; // اسم مؤقت
        } else {
            newName = line;
            newPhone = ''; // بدون رقم حالياً
        }

        // منع التكرار (نتحقق بالاسم أو الرقم)
        const exists = state.students.some(s => 
            (newPhone && s.phone === newPhone) || (s.name === newName)
        );

        if (!exists) {
            state.students.push({
                id: Date.now() + idx, // ID فريد
                name: newName,
                phone: newPhone,
                progress: {},
                notes: ''
            });
            added++;
        }
    });

    saveData();
    window.app.closeImport();
    document.getElementById('import-text').value = ''; // تنظيف الخانة
    alert(`✅ تم إضافة ${added} طالب جديد.`);
}

// فتح نافذة التعديل
function openEditStudentModal(id) {
    const student = state.students.find(s => s.id === id);
    if (!student) return;

    document.getElementById('edit-id').value = id;
    document.getElementById('edit-name').value = student.name;
    document.getElementById('edit-phone').value = student.phone;
    
    document.getElementById('edit-student-modal').style.display = 'flex';
}

// حفظ التعديل
function saveStudentDataEdit() {
    const id = parseFloat(document.getElementById('edit-id').value); // تحويل لرقم
    const newName = document.getElementById('edit-name').value;
    const newPhone = document.getElementById('edit-phone').value;

    if (!newName) { alert('الاسم مطلوب'); return; }

    const idx = state.students.findIndex(s => s.id === id);
    if (idx !== -1) {
        state.students[idx].name = newName;
        state.students[idx].phone = cleanPhone(newPhone);
        saveData();
        document.getElementById('edit-student-modal').style.display = 'none';
    }
}

// دالة الحذف الكامل (في آخر الملف)
function wipeAllData() {
    const code = prompt("تحذير: هذا سيحذف كل الطلاب والمحاضرات!\nللتأكيد اكتب: delete");
    if (code === 'delete') {
        state.students = [];
        state.lectures = [];
        saveData();
        renderDashboard();
        alert("تم تصفير النظام بنجاح. ابدأ بداية جديدة! 🚀");
    }
}

// ================= RESET MESSAGES COUNT =================
function resetMessageCounts() {
    // التأكد أولاً
    if (!confirm("هل أنت متأكد من تصفير عداد الرسائل لجميع المحاضرات؟\nلا يمكن التراجع عن هذه الخطوة.")) return;

    // تصفير العداد لكل محاضرة
    state.lectures.forEach(lec => {
        lec.msgCount = 0;
    });

    saveData(); // حفظ التغييرات
    alert("✅ تم تصفير عداد الرسائل بنجاح لجميع المحاضرات.");
}

// دالة مساعدة لإدراج النص مكان المؤشر
function insertVariable(text) {
    const textarea = document.getElementById('message-text');
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    
    // إدراج النص في مكان المؤشر
    const value = textarea.value;
    textarea.value = value.substring(0, start) + text + value.substring(end);
    
    // إعادة التركيز وتحديث مكان المؤشر
    textarea.selectionStart = textarea.selectionEnd = start + text.length;
    textarea.focus();
}
