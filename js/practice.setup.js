/* Practice Setup: load courses/topics and start a practice session */
document.addEventListener('DOMContentLoaded', async () => {
    const courseSelect = document.getElementById('course');
    const topicSelect = document.getElementById('topic');
    const numQuestions = document.getElementById('numQuestions');
    const durationInput = document.getElementById('duration');
    const startPracticeBtn = document.getElementById('startBtn');

    const token = localStorage.getItem('token');
    if (!token) {
        alert('Please login first!');
        window.location.href = 'index.html';
        return;
    }

    const headers = { 'Authorization': 'Bearer ' + token };

    // input validation
    if (numQuestions) {
        numQuestions.addEventListener('change', () => {
            let v = parseInt(numQuestions.value, 10);
            if (isNaN(v) || v < 5) v = 5;
            if (v > 45) v = 45;
            numQuestions.value = v;
        });
    }

    if (durationInput) {
        durationInput.addEventListener('change', () => {
            let v = parseInt(durationInput.value, 10);
            if (isNaN(v) || v < 5) v = 5;
            if (v > 30) v = 30;
            durationInput.value = v;
        });
    }

    // If user previously selected a duration, show it in the input so selections persist
    try {
        const prev = parseInt(localStorage.getItem('currentDuration'), 10);
        if (!isNaN(prev)) {
            const clamped = Math.max(5, Math.min(30, prev));
            if (durationInput) durationInput.value = clamped;
        }
        const prevN = parseInt(localStorage.getItem('currentNumQuestions'), 10);
        if (!isNaN(prevN) && numQuestions) {
            numQuestions.value = Math.max(5, Math.min(45, prevN));
        }
    } catch (e) {}

    async function loadCourses() {
        try {
            const res = await fetch(API_URL + 'courses/list.php', { headers });
            const txt = await res.text();
            if (!txt || txt.trim().startsWith('<')) return;
            const data = JSON.parse(txt);
            courseSelect.innerHTML = `<option value="">Select Course</option>`;
            (data.data || []).forEach(c => {
                const opt = document.createElement('option'); opt.value = c.id; opt.textContent = c.course_name || c.name || 'Unnamed Course';
                courseSelect.appendChild(opt);
            });
        } catch (err) { console.error('loadCourses error', err); }
    }

    async function loadTopics(courseId) {
        topicSelect.innerHTML = `<option value="">Select Topic</option>`;
        if (!courseId) return;
        try {
            const res = await fetch(API_URL + 'topics/list.php?course_id=' + courseId, { headers });
            const txt = await res.text();
            if (!txt || txt.trim().startsWith('<')) return;
            const data = JSON.parse(txt);
            (data.data || []).forEach(t => {
                const opt = document.createElement('option'); opt.value = t.id; opt.textContent = t.topic_name || t.name || t.title || 'Unnamed Topic';
                topicSelect.appendChild(opt);
            });
        } catch (err) { console.error('loadTopics error', err); }
    }

    courseSelect.addEventListener('change', e => loadTopics(e.target.value));

    async function startPractice() {
        const courseId = courseSelect.value; const topicId = topicSelect.value;
        const numQ = numQuestions ? numQuestions.value : 10; const duration = durationInput ? durationInput.value : 10;
        if (!courseId || !topicId) { alert('Please select course and topic'); return; }

        // Show modal: checking premium access
        const popup = document.getElementById('startPopup');
        const popupContent = popup.querySelector('.popup-content');
        popup.style.display = 'flex';
        popupContent.innerHTML = `<h3>Checking premium access…</h3><p style="margin-top:12px">Please wait while we verify your account.</p><div style="margin-top:16px"><div class="loader" style="width:28px;height:28px;border:3px solid #ddd;border-top:3px solid #0044cc;border-radius:50%;animation:spin 1s linear infinite;margin:0 auto"></div></div>`;

        try {
            // check premium status via shared endpoint
            const userRes = await fetch(API_URL + 'fetch_user_details.php', { headers });
            if (!userRes.ok) throw new Error('Unable to verify user');
            const userJson = await userRes.json();
            if (!userJson || !userJson.status) throw new Error(userJson?.message || 'Unable to fetch user info');

            const isPremium = (userJson.data?.is_premium === 1 || userJson.data?.is_premium === '1');

                if (!isPremium) {
                    // hide old popup and show premium overlay
                    try{ popup.style.display = 'none'; }catch(e){}
                    showPremiumOverlay({ state: 'required', email: userJson.data.email || '' });
                    return;
                }

            // is premium: show initializing and wait 5s then start
                try{ popup.style.display = 'none'; }catch(e){}
                showPremiumOverlay({ state: 'initializing', email: userJson.data.email || '' });
                const countdownEl = document.getElementById('initCountdown');
                // if overlay created countdown will be handled there
            let secs = 5; const countdown = document.getElementById('initCountdown');
            const t = setInterval(()=>{ secs -= 1; if (secs <= 0){ clearInterval(t); countdown.innerText = 'Starting…'; proceedStart(); } else { countdown.innerText = 'Starting in ' + secs + '…'; } }, 1000);

        } catch (err) {
            console.error('startPractice check error', err);
              try{ popup.style.display = 'none'; }catch(e){}
              showPremiumOverlay({ state: 'error', email: '' });
        }

        // proceedStart performs the actual start API call
        async function proceedStart(){
            const department = localStorage.getItem('user_department') || '';
            const fd = new FormData(); fd.append('course_id', courseId); fd.append('topic_id', topicId);
            fd.append('num_questions', numQ); fd.append('duration', duration);
            if (department) fd.append('department', department);

            try {
                const res = await fetch(API_URL + 'practices/start.php', { method: 'POST', headers, body: fd });
                const raw = await res.text();
                if (!raw) throw new Error('Empty response');
                if (raw.trim().startsWith('<')) throw new Error('Server returned HTML');
                const data = JSON.parse(raw);
                if (data.status) {
                    localStorage.setItem('currentSession', JSON.stringify({ session_id: data.session_id, questions: data.questions }));
                    localStorage.setItem('currentDuration', duration);
                    localStorage.setItem('currentNumQuestions', numQ);
                    window.location.href = 'practice_exam.html';
                } else {
                    // show error in popup
                    popupContent.innerHTML = `<h3>Unable to start</h3><p style="margin-top:12px">${data.message || 'Unable to start practice'}</p><div style="margin-top:12px"><button id="closePopupBtn3" class="donaug-btn">Close</button></div>`;
                    document.getElementById('closePopupBtn3').addEventListener('click', ()=>{ popup.style.display = 'none'; });
                }
            } catch (err) {
                console.error('proceedStart error', err);
                popupContent.innerHTML = `<h3>Start failed</h3><p style="margin-top:12px">${err.message || 'Failed to start practice'}</p><div style="margin-top:12px"><button id="closePopupBtn4" class="donaug-btn">Close</button></div>`;
                document.getElementById('closePopupBtn4').addEventListener('click', ()=>{ popup.style.display = 'none'; });
            }
        }
    }

    if (startPracticeBtn) startPracticeBtn.addEventListener('click', startPractice);

    // Premium overlay helpers
    function showPremiumOverlay(opts = {}){
        const overlay = document.getElementById('premiumOverlay');
        if (!overlay) return;
        const title = document.getElementById('premiumTitle');
        const sub = document.getElementById('premiumSub');
        const emailEl = document.getElementById('premiumEmail');
        const goBtn = document.getElementById('goUpgradeBtn');
        const closeBtn = document.getElementById('closePremiumBtn');
        overlay.style.display = 'flex';
        if (opts.email) emailEl.innerText = opts.email;
        if (opts.state === 'checking'){
            title.innerText = 'Checking premium access…'; sub.innerText = 'Please wait while we verify your account.'; goBtn.style.display = 'none'; closeBtn.style.display = 'none';
        } else if (opts.state === 'required'){
            title.innerText = 'Premium required'; sub.innerHTML = 'Only Premium users can start this practice. <strong>Upgrade to Premium for just ₦500</strong> to enjoy full access.'; goBtn.style.display = 'inline-block'; closeBtn.style.display = 'inline-block';
        } else if (opts.state === 'initializing'){
            title.innerText = 'Initializing practice…'; sub.innerHTML = '<div id="initCountdown">Starting in 5…</div>'; goBtn.style.display = 'none'; closeBtn.style.display = 'none';
            // start 5s countdown then call proceedStart (if defined in the outer scope)
            let secs = 5; const cd = document.getElementById('initCountdown'); const t = setInterval(()=>{ secs -=1; if (secs <=0){ clearInterval(t); if (typeof proceedStart === 'function') proceedStart(); } else { if (cd) cd.innerText = 'Starting in ' + secs + '…'; } }, 1000);
        } else if (opts.state === 'error'){
            title.innerText = 'Unable to verify'; sub.innerText = 'We could not verify your account right now. Please try again later.'; goBtn.style.display = 'none'; closeBtn.style.display = 'inline-block';
        }

        goBtn.onclick = ()=>{ window.location.href = '/hub/frontend/dashboard.html#openPayment'; };
        closeBtn.onclick = ()=>{ overlay.style.display = 'none'; };
    }

    function hidePremiumOverlay(){ const overlay = document.getElementById('premiumOverlay'); if (overlay) overlay.style.display = 'none'; }

    // --------- Profile: fetch user's name and manage department form ---------
    const profileName = document.getElementById('profileName');
    const profileResult = document.getElementById('profileResult');
    const deptForm = document.getElementById('deptForm');
    const deptInput = document.getElementById('deptInput');

    async function fetchUserName(){
        try {
            const res = await fetch(API_URL + 'users/profile.php', { headers, credentials: 'same-origin' });
            const data = await res.json();
            if (data && data.status && data.user) {
                const name = data.user.name || 'Student';
                if (profileName) profileName.textContent = name;
                const dept = data.user.department || localStorage.getItem('user_department');
                if (dept) {
                    // persist locally as a fallback
                    localStorage.setItem('user_department', dept);
                    showProfileResult(name, dept);
                }
            } else {
                if (profileName) profileName.textContent = 'Student';
            }
        } catch (err) { console.error('fetchUserName error', err); if (profileName) profileName.textContent = 'Student'; }
    }

    function showProfileResult(name, dept){
        if (!profileResult) return;
        profileResult.textContent = `${name || 'You'} from ${dept}`;
        // hide the form to show the summary and show an edit link
        const actions = document.getElementById('profileActions');
        if (actions) actions.innerHTML = `<div style="display:flex;gap:8px;align-items:center;"><strong style="font-weight:700">${name || 'You'}</strong><span style="color:var(--text-muted)">from</span><em style="font-weight:700"> ${dept}</em><button id="editDept" class="donaug-btn" style="margin-left:12px;padding:6px 10px">Edit</button></div>`;
        const edit = document.getElementById('editDept');
        if (edit) edit.addEventListener('click', () => {
            const actions = document.getElementById('profileActions');
            if (actions) actions.innerHTML = '';
            // re-create form
            const form = document.createElement('form'); form.id = 'deptForm'; form.style.display = 'flex'; form.style.gap = '8px';
            const input = document.createElement('input'); input.id = 'deptInput'; input.type = 'text'; input.value = dept; input.placeholder = 'Your department'; input.style.padding='8px'; input.style.borderRadius='8px'; input.style.border='1px solid var(--card-border)'; input.style.background='transparent'; input.style.color='var(--card-text)';
            const btn = document.createElement('button'); btn.id = 'deptSave'; btn.className = 'donaug-btn'; btn.type='submit'; btn.style.padding='8px 12px'; btn.textContent='Save';
            form.appendChild(input); form.appendChild(btn); actions.appendChild(form);
            form.addEventListener('submit', saveDeptHandler);
            // clear summary
            if (profileResult) profileResult.textContent = '';
        });
    }

    function saveDeptHandler(e){
        e.preventDefault();
        const v = deptInput && deptInput.value ? deptInput.value.trim() : (document.getElementById('deptInput') ? document.getElementById('deptInput').value.trim() : '');
        if (!v) { alert('Please enter your department'); return; }
        // send to server to persist
        (async () => {
            try {
                const res = await fetch(API_URL + 'users/profile.php', { method: 'POST', headers: Object.assign({}, headers, { 'Content-Type': 'application/json' }), credentials: 'same-origin', body: JSON.stringify({ department: v }) });
                const data = await res.json();
                if (data && data.status && data.user) {
                    const name = data.user.name || (profileName ? profileName.textContent : 'You');
                    localStorage.setItem('user_department', data.user.department || v);
                    showProfileResult(name, data.user.department || v);
                } else {
                    alert((data && data.message) || 'Failed to save department');
                }
            } catch (err) {
                console.error('saveDept error', err);
                alert('Failed to save department');
            }
        })();
    }

    if (deptForm) deptForm.addEventListener('submit', saveDeptHandler);
    // init
    await fetchUserName();

    await loadCourses();
});
