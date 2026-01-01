/* Practice Result: display last result saved in localStorage */
// Extra safety: redirect to index if there is no token (prevents unauthenticated viewing of results)
if (!localStorage.getItem('token')) { window.location.href = 'index.html'; }

document.addEventListener('DOMContentLoaded', () => {
    const resultContainer = document.getElementById('resultContainer');
    const returnBtn = document.getElementById('returnSetup');
    const raw = localStorage.getItem('lastResult');
    if (!raw) {
        if (resultContainer) resultContainer.textContent = 'No result found.';
        return;
    }

    let payload = null;
    try { payload = JSON.parse(raw); } catch (e) { payload = raw; }

    const score = payload?.score ?? 'N/A';
    const total = payload?.total ?? 'N/A';
    const percentage = Number.isFinite(Number(payload?.percentage)) ? Math.round(Number(payload.percentage)) : 'N/A';
    const advice = payload?.advice ?? '';

    // Show summary immediately
    if (resultContainer) resultContainer.innerHTML = `<div class="result-summary"><strong>Score:</strong> ${escapeHtml(String(score))}/${escapeHtml(String(total))} <small>(${escapeHtml(String(percentage))}%)</small><div class="result-advice">${escapeHtml(advice)}</div></div>`;

    // Action row: Donaug chat (left) + quick stats (right)
    try {
        const actionRow = document.getElementById('resultActionRow');
        if (actionRow) {
            const wrong = (Number.isFinite(Number(total)) && Number.isFinite(Number(score))) ? (Number(total) - Number(score)) : 'N/A';
            const duration = payload?.duration ?? localStorage.getItem('currentDuration') ?? '';
            actionRow.innerHTML = `
                <div class="action-card chat-card">
                    <div>
                        <strong>Donaug</strong>
                        <div style="font-size:13px;color:var(--text-muted);">Ask for tips or review</div>
                    </div>
                    <div><button id="donaugBtn" class="donaug-btn" type="button" aria-expanded="false">Open Chat</button></div>
                </div>
                <div class="action-card stats-card" aria-live="polite">
                    <div class="stats-row">
                        <div class="stat-item"><div class="stat-value">${escapeHtml(String(score))}/${escapeHtml(String(total))}</div><div style="font-size:12px;color:var(--text-muted)">Score</div></div>
                        <div class="stat-item"><div class="stat-value">${escapeHtml(String(percentage))}%</div><div style="font-size:12px;color:var(--text-muted)">Percentage</div></div>
                        <div class="stat-item"><div class="stat-value">${escapeHtml(String(wrong))}</div><div style="font-size:12px;color:var(--text-muted)">Wrong</div></div>
                        ${duration ? `<div class="stat-item"><div class="stat-value">${escapeHtml(String(duration))}</div><div style="font-size:12px;color:var(--text-muted)">Duration</div></div>` : ''}
                    </div>
                </div>
            `;

            const btn = document.getElementById('donaugBtn');
            if (btn) btn.addEventListener('click', () => {
                const modal = document.getElementById('donaugModal');
                if (modal) { modal.style.display = 'block'; modal.setAttribute('aria-hidden','false'); btn.setAttribute('aria-expanded','true'); }
            });

            const close = document.getElementById('donaugClose');
            if (close) close.addEventListener('click', () => {
                const modal = document.getElementById('donaugModal');
                const btn = document.getElementById('donaugBtn');
                if (modal) { modal.style.display = 'none'; modal.setAttribute('aria-hidden','true'); if (btn) btn.setAttribute('aria-expanded','false'); }
            });
        }
    } catch (e) { console.error('Failed to render action row', e); }
    // Render animated score chart
    if (resultContainer && Number.isFinite(Number(score)) && Number.isFinite(Number(total)) && total > 0) {
        renderScoreChart(Number(score), Number(total));
    }

    // Fetch and render user progress entries
    fetchUserProgress();

    // Fetch and render simple profile summary (name + department)
    (async function fetchProfileSummary(){
        try {
            const token = localStorage.getItem('token');
            const headers = token ? { 'Authorization': 'Bearer ' + token } : {};
            const res = await fetch(API_URL + 'users/profile.php', { headers, credentials: 'same-origin' });
            const d = await res.json();
            if (d && d.status && d.user) {
                const el = document.getElementById('profileSummary');
                if (el) {
                    const dept = d.user.department ? ` from ${escapeHtml(String(d.user.department))}` : '';
                    el.textContent = `${escapeHtml(String(d.user.name || 'Student'))}${dept}`;
                }
            }
        } catch (e) { /* ignore profile fetch errors */ }
    })();

    // Render detailed review if available
    const review = payload?.review ?? [];
    if (Array.isArray(review) && review.length > 0) {
        const ids = review.map(r => r.question_id).filter(Boolean);
        fetch(API_URL + 'practices/questions_info.php?ids=' + ids.join(','), { credentials: 'same-origin' })
            .then(res => res.json())
            .then(data => {
                const html = renderReview(review, data);
                resultContainer.insertAdjacentHTML('beforeend', html);
                // Compute weak topic from failed questions in this review and update AI card
                try {
                    const sessionWeak = computeWeakFromReview(review, data);
                    updateAiWeakness(sessionWeak);
                } catch (e) { console.error('Failed computing session weakness', e); }
            })
            .catch(err => {
                console.error('Failed to fetch question info', err);
                const html = renderReview(review, {});
                resultContainer.insertAdjacentHTML('beforeend', html);
            });
    }

    if (returnBtn) returnBtn.addEventListener('click', () => {
        // Clear session data and go back to setup
        localStorage.removeItem('currentSession');
        localStorage.removeItem('currentDuration');
        window.location.href = 'practice.html';
    });

    // Render functions and helpers
    function renderReview(review, questionsMap) {
        let html = '<div class="review-list">';
        review.forEach((r, idx) => {
            const qinfo = (questionsMap && questionsMap[r.question_id]) || null;
                const qtext = qinfo?.question_text || '';
                let opts = qinfo?.options || {};
                // Normalize options into a map with letter keys (A, B, C, ...)
                // Support forms like: { 'A': '...', 'B': '...' } OR ['opt1','opt2'] OR {0:'opt1',1:'opt2'}
                function normalizeOptions(raw) {
                    if (!raw) return {};
                    // If it's already an object with letter-like keys, normalize keys to uppercase
                    const keys = Object.keys(raw);
                    // Detect numeric keys or an array-like structure
                    const isNumericKeys = keys.length > 0 && keys.every(k => String(Number(k)) === String(k));
                    if (Array.isArray(raw) || isNumericKeys) {
                        const out = {};
                        const arr = Array.isArray(raw) ? raw : keys.map(k => raw[k]);
                        for (let i = 0; i < arr.length; i++) {
                            const letter = String.fromCharCode(65 + i); // 65='A'
                            out[letter] = arr[i] ?? '';
                        }
                        return out;
                    }
                    // Otherwise, normalize keys to uppercase and return
                    const out = {};
                    for (const k of keys) out[String(k).toUpperCase()] = raw[k];
                    return out;
                }
                opts = normalizeOptions(opts);
            const your = (r.your_answer ?? '') || '';
            const correct = (r.correct ?? '') || '';
            const isCorrect = !!r.is_correct;

            html += `<div class="review-item">`;
            const yourUp = String(your || '').toUpperCase();
            const correctUp = String(correct || '').toUpperCase();
            html += `<div class="review-header"><span class="qnum">Q${idx+1}</span> <span class="qstatus ${isCorrect? 'correct':'wrong'}">${isCorrect? 'Correct':'Incorrect'}</span></div>`;
            html += `<div class="debug-line" style="font-size:12px;color:var(--text-muted);margin-top:4px;">Your: <strong>${escapeHtml(String(r.your_answer))}</strong> (${escapeHtml(yourUp)}) — Correct: <strong>${escapeHtml(String(r.correct))}</strong> (${escapeHtml(correctUp)})</div>`;
            html += `<div class="qtext">${escapeHtml(qtext)}</div>`;

            if (opts && Object.keys(opts).length > 0) {
                html += '<ul class="review-options">';
                const orderedKeys = Object.keys(opts).length ? Object.keys(opts) : [];
                orderedKeys.sort();
                orderedKeys.forEach(k => {
                    const text = opts[k] ?? '';
                    const isCorrectOpt = String(k).toUpperCase() === String(correct).toUpperCase();
                    const isYourOpt = String(k).toUpperCase() === String(your).toUpperCase();
                    html += `<li class="opt ${isCorrectOpt? 'opt-correct':''} ${isYourOpt? 'opt-your':''}">`;
                    html += `<strong>${escapeHtml(String(k))}.</strong> ${escapeHtml(String(text))}`;
                    if (isCorrectOpt) html += ' <span class="badge correct">✓</span>';
                    if (isYourOpt && !isCorrectOpt) html += ' <span class="badge wrong">✕</span>';
                    html += `</li>`;
                });
                html += '</ul>';
            }

            if (r.explanation) {
                html += `<div class="explanation"><strong>Explanation:</strong> ${escapeHtml(String(r.explanation))}</div>`;
            }

            html += `</div>`;
        });
        html += '</div>';
        return html;
    }

    // Render a small animated stacked bar chart showing correct vs wrong
    function renderScoreChart(score, total) {
        const correctPct = total ? Math.round((score / total) * 100) : 0;
        const wrong = total - score;
        // choose holder
        const holder = document.getElementById('scoreChartHolder') || resultContainer;
        // clear existing
        holder.innerHTML = '';
        // create canvas
        const canvas = document.createElement('canvas');
        canvas.className = 'chart-canvas';
        canvas.id = 'scoreChartCanvas';
        canvas.setAttribute('role', 'img');
        canvas.setAttribute('aria-label', `${score} correct out of ${total} (${correctPct} percent)`);
        holder.appendChild(canvas);

        // get theme colors from CSS variables
        const root = getComputedStyle(document.documentElement);
        const success = root.getPropertyValue('--success').trim() || '#198754';
        const danger = root.getPropertyValue('--danger').trim() || '#dc3545';

        // destroy previous chart if present
        try { if (window._scoreChart instanceof Chart) { window._scoreChart.destroy(); } } catch (e) {}

        // Create doughnut chart with rounded arcs and center text
        const ctx = canvas.getContext('2d');
        const data = {
            labels: ['Correct', 'Wrong'],
            datasets: [{ data: [score, wrong], backgroundColor: [success || '#198754', danger || '#dc3545'], hoverOffset: 6, borderWidth: 0 }]
        };

        const centerTextPlugin = {
            id: 'centerText',
            afterDraw(chart) {
                const { ctx, chartArea: { width, height } } = chart;
                ctx.save();
                const txt = `${correctPct}%`;
                ctx.fillStyle = root.getPropertyValue('--text-main').trim() || '#0b1220';
                ctx.font = '700 28px "Segoe UI", system-ui, -apple-system, sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(txt, width / 2, height / 2);
                ctx.restore();
            }
        };

        window._scoreChart = new Chart(ctx, {
            type: 'doughnut',
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '72%',
                plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => `${ctx.label}: ${ctx.parsed}%` } } },
                elements: { arc: { borderRadius: 12 } }
            },
            plugins: [centerTextPlugin]
        });
    }

    // Fetch and render user progress table
    async function fetchUserProgress() {
        const holder = document.getElementById('userProgressHolder');
        if (!holder) return;
        holder.textContent = 'Loading progress…';
        try {
            const headers = {};
            const token = localStorage.getItem('token');
            if (token) headers['Authorization'] = 'Bearer ' + token;
            const res = await fetch(API_URL + 'practices/user_progress.php', { headers, credentials: 'same-origin' });
            const data = await res.json();
            if (!res.ok || !data || !data.status) {
                holder.innerHTML = `<div class="progress-empty">No progress available.</div>`;
                return;
            }
            const rows = Array.isArray(data.data) ? data.data : [];
            // Show user's name in the section header if returned by API
            try {
                const hdr = document.querySelector('#userProgressSection h3');
                if (data.user && data.user.name && hdr) hdr.textContent = `${String(data.user.name)} — Your stats`;
            } catch (e) { /* ignore */ }
            if (rows.length === 0) {
                holder.innerHTML = `<div class="progress-empty">No progress records yet.</div>`;
                return;
            }
            // Compute some overall stats for AI insights
            const totalAttempts = rows.reduce((s, r) => s + Number(r.attempts || 0), 0);
            const avgOverall = rows.length ? (rows.reduce((s, r) => s + Number(r.average_score || 0), 0) / rows.length) : 0;
            // Determine weakest topic (lowest average_score), exclude topics with no attempts and avoid placeholder 'Atom'
            let weakest = null;
            const candidates = rows.filter(r => Number(r.attempts || 0) > 0 && !String(r.topic_name || '').toLowerCase().includes('atom'));
            if (candidates.length > 0) {
                weakest = candidates.reduce((min, r) => {
                    const rAvg = Number(r.average_score || 0);
                    const mAvg = Number(min.average_score || 0);
                    return rAvg < mAvg ? r : min;
                }, candidates[0]);
            }
            renderAiInsight({ totalAttempts, avgOverall, weakest });
            // Build table
            let html = '<table class="progress-table"><thead><tr><th>ID</th><th>Topic</th><th>Attempts</th><th>Average</th><th>Updated</th></tr></thead><tbody>';
            rows.forEach(r => {
                const topic = r.topic_name ? r.topic_name : r.topic_id;
                // format updated_at
                let updated = r.updated_at || '';
                try { const d = new Date(updated); if (!isNaN(d)) updated = d.toLocaleString(); } catch(e) {}
                html += `<tr><td>${escapeHtml(String(r.id))}</td><td>${escapeHtml(String(topic))}</td><td>${escapeHtml(String(r.attempts))}</td><td>${escapeHtml(String(r.average_score))}</td><td>${escapeHtml(String(updated))}</td></tr>`;
            });
            html += '</tbody></table>';
            holder.innerHTML = html;
        } catch (err) {
            console.error('Failed to load user progress', err);
            if (holder) holder.innerHTML = `<div class="progress-empty">Error loading progress.</div>`;
        }
    }

    function renderAiInsight({ totalAttempts, avgOverall, weakest }){
        const holder = document.getElementById('aiInsightHolder');
        if (!holder) return;
        const wkName = weakest?.topic_name ? escapeHtml(weakest.topic_name) : null;
        const wkAvg = weakest?.average_score ?? null;
        const attempts = totalAttempts || 0;
        const overall = Math.round((avgOverall||0) * 100) / 100;
        let weakLine = '';
        if (wkName) {
            weakLine = `<div class="ai-sub" style="margin-top:6px;">Weak topic: <strong>${wkName}</strong>${wkAvg !== null ? ' • Avg: <strong>' + escapeHtml(String(wkAvg)) + '%</strong>' : ''}</div>`;
        }
        holder.innerHTML = `
            <div class="ai-card ai-gradient-bluegreen">
                <div class="ai-left">
                    <div class="ai-badge" style="background:rgba(255,255,255,0.12); color:#fff;">AI</div>
                </div>
                <div class="ai-content">
                    <div class="ai-title">AI Insight • Personalized Progress</div>
                    <div class="ai-sub">Total attempts: <span class="ai-stat">${escapeHtml(String(attempts))}</span> • Overall avg: <span class="ai-stat">${escapeHtml(String(overall))}%</span></div>
                    ${weakLine}
                </div>
            </div>
        `;
    }

    // Compute weakest topic from review by counting failed questions per topic
    function computeWeakFromReview(review, questionsMap) {
        if (!Array.isArray(review) || review.length === 0) return null;
        const counts = {}; // key -> {topic_id, topic_name, fails}
        review.forEach(r => {
            if (r.is_correct) return;
            const q = questionsMap && questionsMap[r.question_id];
            if (!q) return;
            const tid = q.topic_id ?? null;
            const tname = q.topic_name ?? (tid || null);
            // Ignore placeholder topic names that contain 'atom' when detecting session weaknesses
            if (String(tname || '').toLowerCase().includes('atom')) return;
            if (!tid) return;
            const key = String(tid);
            counts[key] = counts[key] || { topic_id: tid, topic_name: tname, fails: 0 };
            counts[key].fails += 1;
        });
        const keys = Object.keys(counts);
        if (keys.length === 0) return null;
        // find max fails
        keys.sort((a,b) => counts[b].fails - counts[a].fails);
        return counts[keys[0]];
    }

    function updateAiWeakness(sessionWeak) {
        const holder = document.getElementById('aiInsightHolder');
        if (!holder) return;
        const existing = holder.querySelector('.ai-session-weak');
        if (sessionWeak) {
            const html = `<div class="ai-sub ai-session-weak" style="margin-top:6px;">Weak this session: <strong>${escapeHtml(String(sessionWeak.topic_name))}</strong> • Failed: <strong>${escapeHtml(String(sessionWeak.fails))}</strong></div>`;
            const content = holder.querySelector('.ai-content');
            if (existing) existing.outerHTML = html; else if (content) content.insertAdjacentHTML('beforeend', html);
        } else if (existing) {
            existing.remove();
        }
    }

    function escapeHtml(s){ return String(s||'').replace(/[&<>"'`]/g, function(ch){ return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;","`":"&#96;"})[ch]; }); }
});
