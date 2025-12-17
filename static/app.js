/**
 * Alsharif Educational Platform
 * Core Application Logic
 */

// مفتاح التخزين (تم التحديث لضمان ظهور الأحاديث الجديدة)
const APP_KEY = 'alsharif_data_v2'; 
const SESSION_KEY = 'alsharif_session';

// State Object
let state = {
    students: [],
    lectures: [],
    settings: {
        totalPlannedLectures: 30
    }
};

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
    deleteLecture: (id) => deleteLectureFlow(id) 
};

// ================= INITIALIZATION =================
function init() {
    loadData();
    checkSession();
    renderDate();
    renderHadith();
}

function loadData() {
    const raw = localStorage.getItem(APP_KEY);
    if (raw) {
        state = JSON.parse(raw);
    } else {
        seedData();
    }
}

function seedData() {
    state = {
        students: [],
        lectures: [
            { id: 'lec_1', title: 'محاضرة 1' }
        ],
        settings: { totalPlannedLectures: 8 } 
    };
    saveData();
}

function saveData() {
    localStorage.setItem(APP_KEY, JSON.stringify(state));
    renderDashboard();
}

function checkSession() {
    const isLoggedIn = localStorage.getItem(SESSION_KEY) === 'true';
    if (isLoggedIn) {
        showDashboard();
    } else {
        showLogin();
    }
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

// ================= DASHBOARD RENDERING =================
function renderDashboard() {
    renderTable();
    renderStats();
}

function renderTable() {
    const thead = document.getElementById('table-header-row');
    const tbody = document.getElementById('students-body');

    // 1. Render Headers
    let headersHTML = `
        <th>#</th>
        <th>اسم الطالب</th>
        <th>رقم الهاتف</th>
    `;
    
    state.lectures.forEach(lec => {
        headersHTML += `
            <th class="lecture-header">
                <div style="display: flex; justify-content: space-between; align-items: center; gap: 5px;">
                    <span>${lec.title}</span>
                    <button onclick="window.app.deleteLecture('${lec.id}')" 
                            style="background:none; border:none; color:#E74C3C; cursor:pointer; font-size:0.8rem;" 
                            title="حذف العمود">
                        <i class="fa-solid fa-circle-minus"></i>
                    </button>
                </div>
            </th>`;
    });
    
    headersHTML += `<th><i class="fa-solid fa-trash-can"></i></th>`; 
    thead.innerHTML = headersHTML;

    // 2. Render Rows
    tbody.innerHTML = '';

    const latestLecId = state.lectures.length > 0 ? state.lectures[state.lectures.length - 1].id : null;

    state.students.forEach((student, index) => {
        const isCompletedLatest = latestLecId ? student.progress[latestLecId] : false;
        const rowClass = isCompletedLatest ? 'row-tested' : 'row-active';

        const serial = (index + 1).toString().padStart(3, '0');

        const badgeHTML = isCompletedLatest
            ? `<span class="status-badge completed">مكتمل</span>`
            : '';

        let rowHTML = `<tr class="${rowClass}">
            <td><span style="color:var(--primary-green); font-weight:bold;">${serial}</span></td>
            <td>
                <div style="display:flex; align-items:center; gap: 10px;">
                    <div class="student-avatar">${getInitials(student.name)}</div>
                    <div style="display:flex; flex-direction:column;">
                        <span style="font-weight:600;">${student.name}</span>
                        ${badgeHTML}
                    </div>
                </div>
            </td>
            <td style="font-family:'Arial'; direction:ltr; text-align:right;">${student.phone}</td>
        `;

        state.lectures.forEach(lec => {
            const isChecked = student.progress[lec.id] || false;
            rowHTML += `
                <td>
                    <div class="check-wrapper">
                        <input type="checkbox" ${isChecked ? 'checked' : ''} 
                        onchange="window.app.toggleCheck(${student.id}, '${lec.id}')">
                    </div>
                </td>
            `;
        });

        rowHTML += `
            <td>
                <button class="btn-delete-row" onclick="window.app.deleteStudent(${student.id})">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </td>
        `;

        rowHTML += `</tr>`;
        tbody.innerHTML += rowHTML;
    });

    const displayCount = `عرض 1 إلى ${state.students.length} من أصل ${state.students.length} طالب`;
    document.querySelector('.pagination span').innerText = displayCount;
}

function renderStats() {
    const total = state.students.length;
    const latestLecId = state.lectures.length > 0 ? state.lectures[state.lectures.length - 1].id : null;
    let absence = 0;

    if (latestLecId) {
        absence = state.students.filter(s => !s.progress[latestLecId]).length;
    }

    const remainingLectures = state.settings.totalPlannedLectures - state.lectures.length;

    document.getElementById('stat-total').innerText = total;
    document.getElementById('stat-absence').innerText = absence;
    document.getElementById('stat-remaining').innerText = remainingLectures > 0 ? remainingLectures : 0;
}

function renderDate() {
    try {
        const date = new Date();
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', calendar: 'islamic-umalqura' };
        const dateString = new Intl.DateTimeFormat('ar-SA-u-ca-islamic', options).format(date);
        document.querySelector('.date-display').innerText = dateString;
    } catch (e) {
        document.querySelector('.date-display').innerText = new Date().toLocaleDateString('ar-EG');
    }
}

// ================= HADITH RENDERER (UPDATED LIST) =================
function renderHadith() {
    // قائمة الأحاديث من كتيب 100 حديث للحفظ (بالإسناد والتخريج)
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
        // تنسيق إضافي لضمان ظهور النص بشكل جميل مع التخريج
        quoteElement.style.lineHeight = "1.8"; 
        quoteElement.style.whiteSpace = "pre-line"; // يسمح بظهور السطر الجديد للتخريج
        quoteElement.style.fontSize = "0.95rem"; 
    }
}

// ================= ACTIONS =================
function addStudentFlow() {
    const name = prompt('أدخل اسم الطالب:');
    if (!name) return;
    const phone = prompt('أدخل رقم الهاتف (مع مفتاح الدولة، مثال: 20...):');
    if (!phone) return;

    const newStudent = {
        id: Date.now(),
        name: name,
        phone: phone,
        progress: {}
    };

    state.students.push(newStudent);
    saveData();
}

function addLectureFlow() {
    const count = state.lectures.length + 1;
    const title = prompt('عنوان المحاضرة:', `محاضرة ${count}`);
    if (!title) return;

    const newLec = {
        id: `lec_${Date.now()}`,
        title: title,
        timestamp: Date.now()
    };

    state.lectures.push(newLec);
    saveData();
}

function deleteStudentFlow(id) {
    if (confirm('هل أنت متأكد من حذف هذا الطالب؟ لا يمكن التراجع عن هذا الإجراء.')) {
        state.students = state.students.filter(s => s.id !== id);
        saveData();
    }
}

function deleteLectureFlow(id) {
    const lec = state.lectures.find(l => l.id === id);
    if (!lec) return;

    if (confirm(`هل أنت متأكد من حذف عمود "${lec.title}"؟\nسيتم حذف جميع بيانات الحضور المرتبطة به.`)) {
        state.lectures = state.lectures.filter(l => l.id !== id);
        
        state.students.forEach(s => {
            if (s.progress && s.progress[id]) {
                delete s.progress[id];
            }
        });

        saveData();
    }
}

function toggleStudentCheck(studentId, lectureId) {
    const student = state.students.find(s => s.id === studentId);
    if (student) {
        const current = student.progress[lectureId] || false;
        student.progress[lectureId] = !current;
        saveData(); 
    }
}

// ================= MESSAGING LOGIC =================
async function startMessagingFlow() {
    const msgText = document.getElementById('message-text').value;
    if (!msgText.trim()) { alert('الرجاء كتابة نص الرسالة'); return; }

    if (state.lectures.length === 0) { alert('لا توجد محاضرات'); return; }
    
    const latestLecId = state.lectures[state.lectures.length - 1].id;
    const targetsRaw = state.students.filter(s => !s.progress[latestLecId]);

    if (targetsRaw.length === 0) { alert('لا يوجد غياب لهذه المحاضرة!'); return; }

    const targets = targetsRaw.map(s => ({
        name: s.name,
        phone: s.phone.replace(/\D/g, '') 
    }));

    if (!confirm(`سيتم تشغيل البوت لإرسال رسائل لـ ${targets.length} طالب.\n\n1. سيفتح متصفح جديد تلقائياً.\n2. ستحتاج لمسح QR Code الواتساب (مرة واحدة فقط إذا لم تكن مسجلاً).\n3. اترك الجهاز يعمل حتى ينتهي.\n\nهل أنت موافق؟`)) return;

    const btn = document.querySelector('.btn-whatsapp');
    const oldText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري الاتصال بالبوت...';
    btn.disabled = true;

    try {
        const response = await fetch('/api/send_whatsapp', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                students: targets,
                message: msgText
            })
        });

        const result = await response.json();

        if (result.status === 'success') {
            alert(`✅ تم الانتهاء بنجاح!\nتم إرسال: ${result.count} رسالة.`);
        } else {
            alert('❌ حدث خطأ: ' + result.message);
        }

    } catch (error) {
        alert('فشل الاتصال بالخادم الداخلي.\nتأكد أنك قمت بتشغيل ملف app.py وليس ملف html مباشرة.');
        console.error(error);
    } finally {
        btn.innerHTML = oldText;
        btn.disabled = false;
    }
}


// Helpers
function getInitials(name) {
    return name.charAt(0);
}

function cleanPhone(p) {
    return p.replace(/[\s\-\+\(\)]/g, '');
}

function exportToExcel() {
    let csv = '\uFEFF'; 

    const headerRow = ['#', 'الاسم', 'الهاتف', ...state.lectures.map(l => l.title)];
    csv += headerRow.join(',') + '\n';

    state.students.forEach((s, i) => {
        const row = [
            i + 1,
            `"${s.name}"`, 
            `'${s.phone}`, 
        ];
        state.lectures.forEach(l => {
            row.push(s.progress[l.id] ? 'تم' : 'غائب');
        });
        csv += row.join(',') + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `sajil_mutabaa_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Start
document.addEventListener('DOMContentLoaded', init);