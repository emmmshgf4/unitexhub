const TOKEN = localStorage.getItem("adminToken") ? "Bearer " + localStorage.getItem("adminToken") : "";
const COURSE_API = "http://localhost/hub/api/courses/";
const TOPIC_API = "http://localhost/hub/api/topics/";
const QUESTION_API = "http://localhost/hub/api/questions/";
const PRACTICE_API = "http://localhost/hub/api/practices/";

// --------- Universal fetch with JSON safety ----------
async function fetchJSON(url, options = {}) {
    try {
        const res = await fetch(url, options);
        const text = await res.text();

        // Detect if response is HTML (common error cause)
        if (text.trim().startsWith('<')) {
            console.error("Server returned HTML instead of JSON:", url, text);
            return null;
        }

        try {
            return JSON.parse(text);
        } catch (e) {
            console.error("JSON parse failed for:", url, e);
            console.log("Raw server response:", text);
            return null;
        }
    } catch (e) {
        console.error("Fetch failed for:", url, e);
        return null;
    }
}

// --------- Load Courses ----------
async function loadCourses() {
    const courseSelect = document.getElementById('course');
    if (!courseSelect) { console.warn('loadCourses: #course element not found'); return; }
    courseSelect.innerHTML = '<option value="">Select Course</option>';

    const data = await fetchJSON(COURSE_API + "list.php", { headers: { Authorization: TOKEN } });
    if (!data?.data) return;

    data.data.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = c.course_name || c.name || "Unnamed Course";
        courseSelect.appendChild(opt);
    });

    // Restore previously selected course (so list persists after refresh)
    const storedCourse = localStorage.getItem('questions_course');
    if (storedCourse) {
        // Only set if option exists
        const opt = courseSelect.querySelector(`option[value="${storedCourse}"]`);
        if (opt) {
            courseSelect.value = storedCourse;
            // load topics and restore topic selection afterwards
            await loadTopics();
        }
    }
}

// --------- Load Topics ----------
async function loadTopics() {
    const courseEl = document.getElementById('course');
    const topicSelect = document.getElementById('topic');
    if (!courseEl || !topicSelect) { console.warn('loadTopics: required elements missing (#course or #topic)'); return; }
    const courseId = courseEl.value;
    topicSelect.innerHTML = '<option value="">Select Topic</option>';
    if (!courseId) return;

    const data = await fetchJSON(TOPIC_API + "list.php?course_id=" + courseId, { headers: { Authorization: TOKEN } });
    if (!data?.data) { topicSelect.innerHTML = '<option>Error loading topics</option>'; return; }

    data.data.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t.id;
        opt.textContent = t.topic_name || t.name || t.title || "Unnamed Topic";
        topicSelect.appendChild(opt);
    });

    // Restore previously selected topic (so list persists after refresh)
    const storedTopic = localStorage.getItem('questions_topic');
    if (storedTopic) {
        const opt = topicSelect.querySelector(`option[value="${storedTopic}"]`);
        if (opt) {
            topicSelect.value = storedTopic;
            // load questions for restored selection
            await loadQuestions();
        }
    }
}

// --------- Load Questions ----------
async function loadQuestions() {
    const courseEl = document.getElementById('course');
    const topicEl = document.getElementById('topic');
    const qList = document.getElementById('questionList');
    if (!courseEl || !topicEl || !qList) { console.warn('loadQuestions: required elements missing (#course, #topic or #questionList)'); return; }
    const courseId = courseEl.value;
    const topicId = topicEl.value;
    qList.innerHTML = '';
    console.debug('loadQuestions start', { courseId, topicId });
    if (!courseId || !topicId) return;

    // Request more rows for admin listing
    // Request admin listing in deterministic order so newly added items appear consistently
    const headers = {};
    if (TOKEN) headers.Authorization = TOKEN;
    const url = `${QUESTION_API}fetch.php?course_id=${courseId}&topic_id=${topicId}&limit=1000&order=asc`;
    console.debug('Fetching questions from', url, 'with headers', headers);
    const data = await fetchJSON(url, { headers });
    console.debug('Questions fetch response', data);
    if (!data) { qList.innerHTML = '<li class="text-danger">Server did not return valid response</li>'; return; }
    if (data.status === false) { qList.innerHTML = `<li class="text-muted">${data.message || 'No questions'}</li>`; return; }
    if (!Array.isArray(data.data) || data.data.length === 0) { qList.innerHTML = '<li class="text-muted">No questions for this topic</li>'; return; }

    data.data.forEach(q => {
        const li = document.createElement('li');
        li.className = 'list-group-item d-flex align-items-start justify-content-between';
        const left = document.createElement('div');
        left.innerHTML = `<div><input type="checkbox" class="q-checkbox" data-id="${q.id}"></div>`;
        const middle = document.createElement('div');
        middle.style.flex = '1';
        middle.style.marginLeft = '12px';
        middle.innerHTML = `<div class="fw-bold">${q.question || 'Unnamed'}</div><div class="small text-muted">A: ${q.option_a || '-'} &nbsp; B: ${q.option_b || '-'} &nbsp; C: ${q.option_c || '-'} &nbsp; D: ${q.option_d || '-'}</div>`;
        li.appendChild(left);
        li.appendChild(middle);
        qList.appendChild(li);
    });

    // Hook up select all toggle
    const selectAll = document.getElementById('selectAllQuestions');
    if (selectAll) {
        selectAll.checked = false;
        selectAll.addEventListener('change', ()=>{
            document.querySelectorAll('.q-checkbox').forEach(cb => cb.checked = selectAll.checked);
        });
    }
}

// --------- Load All Questions (admin) ----------
async function loadAllQuestions() {
    const qList = document.getElementById('questionList');
    if (!qList) { console.warn('loadAllQuestions: #questionList not found'); return; }
    qList.innerHTML = '';

    const headers = {};
    if (TOKEN) headers.Authorization = TOKEN;
    const url = `${QUESTION_API}list.php?limit=1000`;
    console.debug('Fetching all questions from', url);
    const data = await fetchJSON(url, { headers });
    console.debug('All questions response', data);

    if (!data) { qList.innerHTML = '<li class="text-danger">Server did not return valid response</li>'; return; }
    if (data.status === false) { qList.innerHTML = `<li class="text-muted">${data.message || 'No questions'}</li>`; return; }
    if (!Array.isArray(data.data) || data.data.length === 0) { qList.innerHTML = '<li class="text-muted">No questions found</li>'; return; }

    data.data.forEach(q => {
        const li = document.createElement('li');
        li.className = 'list-group-item d-flex align-items-start justify-content-between';
        const left = document.createElement('div');
        left.innerHTML = `<div><input type="checkbox" class="q-checkbox" data-id="${q.id}"></div>`;
        const middle = document.createElement('div');
        middle.style.flex = '1';
        middle.style.marginLeft = '12px';
        middle.innerHTML = `<div class="fw-bold">${q.question || 'Unnamed'}</div><div class="small text-muted">Course: ${q.course_name || q.course_id || '-'} &nbsp; Topic: ${q.topic_name || q.topic_id || '-'}</div>`;
        li.appendChild(left);
        li.appendChild(middle);
        qList.appendChild(li);
    });

    const selectAll = document.getElementById('selectAllQuestions');
    if (selectAll) {
        selectAll.checked = false;
        selectAll.addEventListener('change', ()=>{
            document.querySelectorAll('.q-checkbox').forEach(cb => cb.checked = selectAll.checked);
        });
    }
}

// --------- Start Practice ----------
async function startPractice() {
    const courseId = document.getElementById('course').value;
    const topicId = document.getElementById('topic').value;
    const numQ = document.getElementById('numQuestions').value || 10;
    const duration = document.getElementById('duration').value || 30;
    const dashboardMsg = document.getElementById('dashboardMsg');

    dashboardMsg.innerText = ""; // Clear previous messages

    if (!courseId || !topicId) { 
        dashboardMsg.innerText = "Select course and topic!"; 
        return; 
    }

    const fd = new FormData();
    fd.append("course_id", courseId);
    fd.append("topic_id", topicId);
    fd.append("num_questions", numQ);
    fd.append("duration", duration);

    const data = await fetchJSON(PRACTICE_API + "start.php", { method: "POST", headers: { Authorization: TOKEN }, body: fd });
    if (!data) { 
        dashboardMsg.innerText = "Server returned invalid response."; 
        return; 
    }

    if (data.status) {
        localStorage.setItem("currentSession", JSON.stringify({ session_id: data.session_id, questions: data.questions }));
        localStorage.setItem("currentDuration", duration);
        window.location.href = "practice.html";
    } else {
        dashboardMsg.innerText = data.message || "Unable to start practice.";
    }
}

// --------- Event Listeners ----------
const courseEl = document.getElementById('course');
const topicEl = document.getElementById('topic');
const startBtnEl = document.getElementById('startBtn');

if (courseEl) courseEl.addEventListener('change', ()=>{
    // persist selected course and reset stored topic
    localStorage.setItem('questions_course', courseEl.value);
    localStorage.removeItem('questions_topic');
    loadTopics();
});
else console.warn('Course selector (#course) not found on this page.');

if (topicEl) topicEl.addEventListener('change', ()=>{
    localStorage.setItem('questions_topic', topicEl.value);
    loadQuestions();
});
else console.warn('Topic selector (#topic) not found on this page.');

if (startBtnEl) startBtnEl.addEventListener('click', startPractice);

// Initial load (only if the course select exists on this page)
if (courseEl) {
    // Load courses and then load a full question list for admin by default
    loadCourses().then(() => loadAllQuestions());
}

// --------- Add Question (admin) ----------
async function addQuestion(){
    const courseId = document.getElementById('course').value;
    const topicId = document.getElementById('topic').value;
    const question = document.getElementById('question').value.trim();
    const a = document.getElementById('a').value.trim();
    const b = document.getElementById('b').value.trim();
    const c = document.getElementById('c').value.trim();
    const d = document.getElementById('d').value.trim();
    const correct = document.getElementById('correct').value;
    const explanation = document.getElementById('explanation').value.trim();

    if (!courseId || !topicId) { alert('Please select a course and topic'); return; }
    // Persist current selection so it survives page refresh
    localStorage.setItem('questions_course', courseId);
    localStorage.setItem('questions_topic', topicId);
    if (!question || !a || !correct) { alert('Please fill required fields (question, option A, correct option)'); return; }

    const fd = new FormData();
    fd.append('course_id', courseId);
    fd.append('topic_id', topicId);
    fd.append('question', question);
    fd.append('option_a', a);
    fd.append('option_b', b);
    fd.append('option_c', c);
    fd.append('option_d', d);
    fd.append('correct_option', correct);
    fd.append('explanation', explanation);

    // Use fetchJSON helper to handle possible HTML responses
    const data = await fetchJSON(QUESTION_API + 'add.php', { method: 'POST', headers: { Authorization: TOKEN }, body: fd });
    if (!data) { alert('Server error while adding question'); return; }
    if (!data.status) { alert(data.message || 'Failed to add question'); return; }

    alert('Question added');
    // clear inputs
    document.getElementById('question').value = '';
    document.getElementById('a').value = '';
    document.getElementById('b').value = '';
    document.getElementById('c').value = '';
    document.getElementById('d').value = '';
    document.getElementById('explanation').value = '';
    document.getElementById('correct').value = '';

    // reload questions
    loadQuestions();
}

// Expose globally so inline onclick works
window.addQuestion = addQuestion;

// --------- CSV Upload ----------
async function uploadQuestionsCsv(){
    const csvInput = document.getElementById('questionsCsv');
    const courseId = document.getElementById('course')?.value;
    const topicId = document.getElementById('topic')?.value;
    const resultEl = document.getElementById('csvResult');
    if (!csvInput || !csvInput.files || csvInput.files.length === 0) { alert('Select a CSV file'); return; }
    if (!courseId || !topicId) { alert('Select course and topic first'); return; }

    const file = csvInput.files[0];
    const fd = new FormData();
    fd.append('csv', file);
    fd.append('course_id', courseId);
    fd.append('topic_id', topicId);

    try {
        const res = await fetch('/hub/api/questions/upload_csv.php', {
            method: 'POST',
            headers: { Authorization: 'Bearer ' + (localStorage.getItem('adminToken') || '') },
            body: fd
        });

        if (res.status === 401 || res.status === 403) { localStorage.removeItem('adminToken'); window.location.href = '/hub/frontend/index.html'; return; }

        const data = await res.json();
        if (!data) { resultEl.innerText = 'Server error'; return; }
        if (!data.status) { resultEl.innerText = data.message || 'Upload failed'; return; }

        const added = data.data.added || 0;
        const errors = data.data.errors || [];
        let html = `<div class="alert alert-success">Added ${added} questions</div>`;
        if (errors.length) {
            html += `<div class="alert alert-warning">${errors.length} errors during import</div>`;
            html += `<ul class="small">` + errors.map(e=>`<li>${e}</li>`).join('') + `</ul>`;
        }
        resultEl.innerHTML = html;
        loadQuestions();
    } catch (err) {
        console.error('CSV upload failed', err);
        resultEl.innerHTML = '<div class="alert alert-danger">Upload failed</div>';
    }
}

document.getElementById('uploadCsvBtn')?.addEventListener('click', uploadQuestionsCsv);

// Delete selected questions
async function deleteSelectedQuestions(){
    const checked = Array.from(document.querySelectorAll('.q-checkbox:checked')).map(cb => parseInt(cb.dataset.id));
    if (!checked.length) { alert('No questions selected'); return; }
    console.debug('deleteSelectedQuestions - ids to delete', checked);
    if (!confirm(`Permanently delete ${checked.length} selected questions? This cannot be undone.`)) return;

    try {
        const res = await fetch('/hub/api/questions/bulk_delete.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + (localStorage.getItem('adminToken') || '') },
            body: JSON.stringify({ ids: checked, permanent: true })
        });

        if (res.status === 401 || res.status === 403) { localStorage.removeItem('adminToken'); window.location.href = '/hub/frontend/index.html'; return; }

        const data = await res.json();
        console.debug('bulk delete response', data);
        if (!data || !data.status) { alert(data?.message || 'Failed to delete'); return; }
        alert(`Deleted ${data.data.deleted || 0} questions`);
        loadQuestions();
    } catch (err) {
        console.error('Bulk delete failed', err);
        alert('Bulk delete failed');
    }
}

document.getElementById('deleteSelectedBtn')?.addEventListener('click', deleteSelectedQuestions);
