/* Practice Exam: render questions from stored session and handle submission */
document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');
    if (!token) { alert('Please login first!'); window.location.href = 'index.html'; return; }
    const headers = { 'Authorization': 'Bearer ' + token };

    const sessionRaw = localStorage.getItem('currentSession');
    if (!sessionRaw) { alert('No active practice session found.'); window.location.href = 'practice.html'; return; }

    const session = JSON.parse(sessionRaw);
    const questions = session.questions || [];
    const sessionId = session.session_id;
    const duration = Math.min(30, Math.max(5, parseInt(localStorage.getItem('currentDuration') || '10', 10)));

    const questionsContainer = document.getElementById('questionsContainer');
    const timerEl = document.getElementById('timer');
    const practiceForm = document.getElementById('practiceForm');

    if (!questionsContainer || !practiceForm) { console.error('Exam elements missing'); return; }

    const ENABLE_SHUFFLE = false; // set to false to avoid shuffling texts (keeps behaviour predictable)

    // Render questions
    questionsContainer.innerHTML = '';
    questions.forEach((q, idx) => {
        const div = document.createElement('div');
        div.className = 'question-item';
        div.dataset.index = idx;

        // Build options: keep letter labels A-D fixed but shuffle which original option text appears in each position.
        // We keep mapping to original letters so the submitted value is the ORIGINAL option letter (so server comparisons stay valid).
        const letters = ['A','B','C','D'];
        const entries = [
            { orig: 'A', text: q.option_a },
            { orig: 'B', text: q.option_b },
            { orig: 'C', text: q.option_c },
            { orig: 'D', text: q.option_d }
        ];
        // Optionally shuffle entries (disabled by default to avoid grading conflicts)
        if (ENABLE_SHUFFLE) {
            for (let i = entries.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [entries[i], entries[j]] = [entries[j], entries[i]];
            }
        }

        const questionHTML = `<p><strong>Q${idx + 1}.</strong> ${escapeHtml(q.question)}</p>`;
        const optionsHTML = letters.map((letter, i) => {
            const entry = entries[i];
            const value = String(entry.orig || letter).toUpperCase();
            return `\n            <label class="option-label"><input type="radio" name="q_${q.id}" value="${escapeHtml(value)}"> <span class="option-letter">${escapeHtml(letter)}.</span> <span class="option-text">${escapeHtml(entry.text)}</span></label>`;
        }).join('\n');

        div.innerHTML = questionHTML + '<div class="options">' + optionsHTML + '\n        </div>';
        questionsContainer.appendChild(div);
    });

    // Emit custom event so UI code can initialize pagination/palette.
    // Dispatch asynchronously to allow UI scripts included after this file to attach listeners.
    setTimeout(() => document.dispatchEvent(new CustomEvent('questions:rendered', { detail: { questions } })), 0);

    // Timer
    let totalSeconds = Math.max(10, Math.min(60 * duration, 60 * 60));
    let remaining = totalSeconds;
    let timerInterval = null;
    function updateTimer() {
        const mins = Math.floor(remaining / 60).toString().padStart(2, '0');
        const secs = (remaining % 60).toString().padStart(2, '0');
        if (timerEl) timerEl.textContent = `Time remaining: ${mins}:${secs}`;
        if (remaining <= 0) {
            clearInterval(timerInterval);
            practiceForm.requestSubmit();
        }
        remaining -= 1;
    }
    updateTimer();
    timerInterval = setInterval(updateTimer, 1000);

    // Submit handler
    practiceForm.addEventListener('submit', async (ev) => {
        ev.preventDefault();
        const submitBtn = practiceForm.querySelector('button[type="submit"]'); if (submitBtn) submitBtn.disabled = true;
        const fd = new FormData(); fd.append('session_id', sessionId);
        const answers = {};
        questions.forEach(q => {
            const sel = practiceForm.querySelector(`input[name="q_${q.id}"]:checked`);
            if (sel) answers[q.id] = sel.value;
        });
        fd.append('answers', JSON.stringify(answers));

        try {
            const res = await fetch(API_URL + 'practices/submit.php', { method: 'POST', headers, body: fd });
            const raw = await res.text();
            if (!raw) throw new Error('Empty response');
            const data = JSON.parse(raw);
            if (!res.ok) throw new Error(data.message || 'Server error');
            if (data.status) {
                // Save result and redirect to result page
                const payload = (data && data.data) ? data.data : data;
                localStorage.setItem('lastResult', JSON.stringify(payload));
                clearInterval(timerInterval);
                window.location.href = 'practice_result.html';
            } else {
                throw new Error(data.message || 'Submission failed');
            }
        } catch (err) {
            console.error('submit error', err);
            alert('Submission error: ' + (err.message || err));
        } finally {
            if (submitBtn) submitBtn.disabled = false;
        }
    }, { once: true });
});

// Simple HTML escape to avoid injecting untrusted text
function escapeHtml(s){
    return String(s||'').replace(/[&<>"'`]/g, function(ch){
        return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;","`":"&#96;"})[ch];
    });
}
