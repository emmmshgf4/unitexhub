/* ======================
   PRACTICE JS - USER ONLY
====================== */

document.addEventListener("DOMContentLoaded", async () => {

    /* ======================
       1. Define elements
    ====================== */
    const courseSelect     = document.getElementById("course");
    const topicSelect      = document.getElementById("topic");
    const numQuestions     = document.getElementById("numQuestions");
    const durationInput    = document.getElementById("duration");
    const startPracticeBtn = document.getElementById("startBtn");
    const dashboardMsg     = document.getElementById("dashboardMsg");

    if (!courseSelect || !startPracticeBtn) {
        console.error("Required elements missing in HTML");
        return;
    }

    /* ======================
       2. Auth check - only normal user
    ====================== */
    const token = localStorage.getItem("token");
    if (!token) {
        alert("Please login first!");
        window.location.href = "index.html";
        return;
    }

    const headers = {
        "Authorization": "Bearer " + token
    };

    /* ======================
       3. Input validation
    ====================== */
    if (numQuestions) {
        numQuestions.addEventListener("change", () => {
            let val = parseInt(numQuestions.value, 10);
            if (val < 10) val = 10;
            if (val > 45) val = 45;
            numQuestions.value = val;
        });
    }

    if (durationInput) {
        durationInput.addEventListener("change", () => {
            let val = parseInt(durationInput.value, 10);
            if (val < 10) val = 10;
            if (val > 30) val = 30;
            durationInput.value = val;
        });
    }

    /* ======================
       4. Load courses
    ====================== */
    async function loadCourses() {
        try {
            const res = await fetch(API_URL + "courses/list.php", { headers });
            const rawText = await res.text();
            if (rawText.trim().startsWith('<')) {
                console.error("Courses API returned HTML:", rawText);
                return;
            }

            const data = JSON.parse(rawText);
            if (data.status && Array.isArray(data.data)) {
                courseSelect.innerHTML = `<option value="">Select Course</option>`;
                data.data.forEach(c => {
                    const opt = document.createElement("option");
                    opt.value = c.id;
                    opt.textContent = c.course_name || c.name || "Unnamed Course";
                    courseSelect.appendChild(opt);
                });
            } else {
                console.error("Invalid course data structure", data);
            }
        } catch (err) {
            console.error("Error loading courses:", err);
        }
    }

    /* ======================
       5. Load topics
    ====================== */
    async function loadTopics(courseId) {
        topicSelect.innerHTML = `<option value="">Select Topic</option>`;
        if (!courseId) return;

        try {
            const res = await fetch(API_URL + "topics/list.php?course_id=" + courseId, { headers });
            const rawText = await res.text();
            if (rawText.trim().startsWith('<')) {
                console.error("Topics API returned HTML:", rawText);
                return;
            }

            const data = JSON.parse(rawText);
            if (data.status && Array.isArray(data.data)) {
                data.data.forEach(t => {
                    const opt = document.createElement("option");
                    opt.value = t.id;
                    opt.textContent = t.topic_name || t.name || t.title || "Unnamed Topic";
                    topicSelect.appendChild(opt);
                });
            } else {
                console.error("Invalid topic data structure", data);
            }
        } catch (err) {
            console.error("Error loading topics:", err);
        }
    }

    courseSelect.addEventListener("change", e => loadTopics(e.target.value));

    /* ======================
       6. Start practice
    ====================== */
    async function startPractice() {
        const courseId = courseSelect.value;
        const topicId  = topicSelect.value;
        const numQ     = numQuestions ? numQuestions.value : 10;
        const duration = durationInput ? durationInput.value : 30;

        if (!courseId || !topicId) {
            if (dashboardMsg) dashboardMsg.innerText = "Please select both course and topic.";
            return;
        }

        const formData = new FormData();
        formData.append("course_id", courseId);
        formData.append("topic_id", topicId);
        formData.append("num_questions", numQ);
        formData.append("duration", duration);

        try {
            const res = await fetch(API_URL + "practices/start.php", {
                method: "POST",
                headers,
                body: formData
            });

            const rawText = await res.text();
            console.log("Practice response:", rawText);

            if (!rawText) {
                if (dashboardMsg) dashboardMsg.innerText = "Server returned empty response.";
                return;
            }

            if (rawText.trim().startsWith('<')) {
                console.error("Practice API returned HTML:", rawText);
                if (dashboardMsg) dashboardMsg.innerText = "Server returned HTML instead of JSON. Check console.";
                return;
            }

            let data;
            try {
                data = JSON.parse(rawText);
            } catch (e) {
                console.error("JSON parse failed:", e);
                if (dashboardMsg) dashboardMsg.innerText = "Invalid JSON response from server. Check console.";
                return;
            }

            if (data.status) {
                localStorage.setItem("currentSession", JSON.stringify({
                    session_id: data.session_id,
                    questions: data.questions
                }));
                localStorage.setItem("currentDuration", duration);
                        // Render the exam inline instead of reloading the page
                        renderExam(data.questions || [], data.session_id, parseInt(duration, 10));
            } else {
                if (dashboardMsg) {
                    dashboardMsg.innerText = data.message || "Unable to start practice.";
                }
            }

        } catch (err) {
            console.error("Error starting practice:", err);
            if (dashboardMsg) dashboardMsg.innerText = "Network or server error.";
        }
    }

    if (startPracticeBtn) startPracticeBtn.addEventListener("click", startPractice);

    /* ======================
       6b. Render exam UI
    ====================== */
    const setupSection = document.getElementById('setupSection');
    const examSection = document.getElementById('examSection');
    const questionsContainer = document.getElementById('questionsContainer');
    const timerEl = document.getElementById('timer');
    const practiceForm = document.getElementById('practiceForm');

    let timerInterval = null;

    function renderExam(questions = [], sessionId = null, durationMinutes = 10) {
        // Hide setup, show exam
        if (setupSection) setupSection.style.display = 'none';
        if (examSection) examSection.style.display = 'block';

        // Populate questions
        questionsContainer.innerHTML = '';
        questions.forEach((q, idx) => {
            const div = document.createElement('div');
            div.className = 'question-item';
            div.innerHTML = `
                <p><strong>Q${idx + 1}.</strong> ${q.question}</p>
                <label><input type="radio" name="q_${q.id}" value="a"> ${q.option_a}</label><br>
                <label><input type="radio" name="q_${q.id}" value="b"> ${q.option_b}</label><br>
                <label><input type="radio" name="q_${q.id}" value="c"> ${q.option_c}</label><br>
                <label><input type="radio" name="q_${q.id}" value="d"> ${q.option_d}</label>
            `;
            questionsContainer.appendChild(div);
        });

        // Start countdown
        const totalSeconds = Math.max(10, Math.min(60 * durationMinutes, 60 * 60));
        let remaining = totalSeconds;
        clearInterval(timerInterval);
        function updateTimer() {
            const mins = Math.floor(remaining / 60).toString().padStart(2, '0');
            const secs = (remaining % 60).toString().padStart(2, '0');
            if (timerEl) timerEl.textContent = `Time remaining: ${mins}:${secs}`;
            if (remaining <= 0) {
                clearInterval(timerInterval);
                // Auto submit when time's up
                if (practiceForm) practiceForm.requestSubmit();
            }
            remaining -= 1;
        }
        updateTimer();
        timerInterval = setInterval(updateTimer, 1000);

        // Attach submit handler
        if (practiceForm) {
            practiceForm.addEventListener('submit', async (ev) => {
                ev.preventDefault();
                const submitBtn = practiceForm.querySelector('button[type="submit"]');
                if (submitBtn) submitBtn.disabled = true;

                // Collect answers
                const formData = new FormData();
                formData.append('session_id', sessionId);
                const answers = {};
                questions.forEach(q => {
                    const sel = practiceForm.querySelector(`input[name="q_${q.id}"]:checked`);
                    if (sel) answers[q.id] = sel.value;
                });
                formData.append('answers', JSON.stringify(answers));

                try {
                    const res = await fetch(API_URL + 'practices/submit.php', {
                        method: 'POST',
                        headers,
                        body: formData
                    });

                    const raw = await res.text();
                    console.log('Submit raw response:', raw);

                    let data = null;
                    try {
                        data = JSON.parse(raw);
                    } catch (e) {
                        // Not JSON — show raw
                        throw new Error('Invalid JSON response from server: ' + (raw.slice(0, 150) || '[empty]'));
                    }

                    if (!res.ok) {
                        throw new Error(data.message || 'Server returned error');
                    }

                    if (data.status) {
                        // show result section
                        examSection.style.display = 'none';
                        const resultSection = document.getElementById('resultSection');
                        const resultContainer = document.getElementById('resultContainer');

                        // The API returns the payload inside `data.data` (jsonResponse helper),
                        // fall back to top-level for compatibility.
                        const payload = (data && data.data) ? data.data : data;

                        const score = payload?.score ?? payload?.score ?? 'N/A';
                        const total = payload?.total ?? 'N/A';
                        const percentage = Number.isFinite(Number(payload?.percentage)) ? Math.round(Number(payload.percentage)) : 'N/A';
                        const advice = payload?.advice ?? '';

                        if (resultSection) resultSection.style.display = 'block';
                        if (resultContainer) resultContainer.innerHTML = `Score: ${score}/${total} (${percentage}%)<br>${advice}`;
                        clearInterval(timerInterval);
                    } else {
                        alert(data.message || 'Submission failed');
                    }
                } catch (err) {
                    console.error('Submit error:', err);
                    alert('Submission error: ' + (err.message || err));
                } finally {
                    if (submitBtn) submitBtn.disabled = false;
                }
            }, { once: true });
        }
    }

    /* ======================
       7. Initial load
    ====================== */
    await loadCourses();

});
