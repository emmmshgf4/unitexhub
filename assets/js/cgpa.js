// CGPA page JS: interactions, theme toggle, animated result card
(function($){
  'use strict';

  // Theme handling
  const body = document.querySelector('body');
  function applyTheme(theme){
    if(theme === 'light') body.classList.add('light'); else body.classList.remove('light');
    localStorage.setItem('cgpa_theme', theme);
  }
  // init
  const saved = localStorage.getItem('cgpa_theme') || (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
  applyTheme(saved);

  document.addEventListener('DOMContentLoaded', function(){
    const toggle = document.getElementById('themeToggle');
    if(toggle){
      toggle.addEventListener('click', function(){
        const now = body.classList.contains('light') ? 'dark' : 'light';
        applyTheme(now);
      });
    }

    // Initialize handlers
    initHandlers();
  });

  function initHandlers(){
    // Add course clones
    window.addCourse = function(semester){
      const row = document.querySelector(`#${semester} .course-row`).cloneNode(true);
      row.querySelectorAll('input, select').forEach(i=>i.value='');
      document.getElementById(semester).appendChild(row);
      attachLiveUpdate(row);
    };

    // Gather data
    window.getSemesterData = function(semester){
      const courses = [];
      document.querySelectorAll(`#${semester} .course-row`).forEach(row=>{
        const code = row.querySelector('.course_code').value.trim();
        const unit = row.querySelector('.credit_unit').value;
        const grade = row.querySelector('.grade').value;
        if(code && unit && grade) courses.push({code, unit, grade});
      });
      return courses;
    };

    // live update on input
    function updateGPA(){
      const token = localStorage.getItem('token') || '';
      $.ajax({
        url: '/hub/api/cgpa/calculate_cgpa.php',
        method: 'POST',
        dataType: 'json',
        data: { sem1: getSemesterData('sem1'), sem2: getSemesterData('sem2') },
        headers: { 'Authorization': 'Bearer ' + token },
        success: function(data){
          if(data.gpa1 !== undefined){
            $('#gpa1').text(data.gpa1);
            $('#gpa2').text(data.gpa2);
          }
        },
        error: function(){
          $('#gpa1').text('0.00'); $('#gpa2').text('0.00');
        }
      });
    }

    function attachLiveUpdate(el){
      el.querySelectorAll('input, select').forEach(i=>{
        i.addEventListener('input', debounce(updateGPA, 450));
      });
    }

    // attach initial live updates
    document.querySelectorAll('.course-row').forEach(attachLiveUpdate);
    $(document).on('input change', '.course_code, .credit_unit, .grade', debounce(updateGPA, 350));

    // Calculate CGPA click
    $('#calculateCGPA').on('click', function(){
      const sem1 = getSemesterData('sem1');
      const sem2 = getSemesterData('sem2');

      $('#cgpaResult').html(loaderHtml()).show();

      const token = localStorage.getItem('token') || '';
      $.ajax({
        url: '/hub/api/cgpa/calculate_cgpa.php',
        method: 'POST',
        dataType: 'json',
        data: { sem1, sem2, save:1 },
        headers: { 'Authorization': 'Bearer ' + token },
        success: function(data){
          renderResult(data);
          loadHistory();
        },
        error: function(xhr){
          const msg = xhr?.responseJSON?.message || 'Login required';
          $('#cgpaResult').html(`<div class="p-3 text-center text-danger">${msg}. Please <a href="/hub/frontend/login.html">login</a>.</div>`);
        }
      });
    });

    // Initial load
    updateGPA();
    loadHistory();
  }

  function loaderHtml(){
    return `<div class="p-4 text-center border rounded shadow" style="background:var(--card-bg);">
      <div class="spinner-border text-primary" role="status" aria-hidden="true"></div>
      <div class="mt-2">Calculating...</div>
    </div>`;
  }

  function renderResult(data){
    const cgpa = parseFloat(data.cgpa) || 0;
    const max = 5; // percent of max
    const pct = Math.min(100, Math.round((cgpa / max) * 100));
    const ringStyle = `background: conic-gradient(var(--accent-1) ${pct}%, rgba(255,255,255,0.06) ${pct}% 100%);`;

    const badgeColor = cgpa >= 4.5 ? 'Excellent' : cgpa >= 3.5 ? 'Good' : cgpa >= 2.5 ? 'Average' : 'Needs Improvement';

    const html = `<div class="result-card">
        <div class="ring" style="${ringStyle}">
          <div class="value">${cgpa.toFixed(2)}</div>
        </div>
        <div class="flex-1">
          <h5>CGPA Result <small style="color:var(--muted);">${badgeColor}</small></h5>
          <p><strong>Semester 1 GPA:</strong> ${data.gpa1}</p>
          <p><strong>Semester 2 GPA:</strong> ${data.gpa2}</p>
          <div class="advice">${escapeHtml(data.advice || 'Keep studying — small improvements add up!')}</div>
          <div class="mt-3">
            <button class="btn btn-outline-secondary" id="closeResult">Close</button>
            <button class="btn btn-ghost" id="shareResult">Share</button>
          </div>
        </div>
      </div>`;

    $('#cgpaResult').html(html);

    $('#closeResult').on('click', function(){ $('#cgpaResult').hide(); });
    $('#shareResult').on('click', function(){
      navigator.clipboard?.writeText(`My CGPA is ${cgpa.toFixed(2)} (Semester1: ${data.gpa1}, Semester2: ${data.gpa2})`).then(()=>{
        toast('Copied result to clipboard');
      }).catch(()=>{ toast('Could not copy'); });
    });
  }

  function loadHistory(){
    const token = localStorage.getItem('token') || '';
    $.ajax({
      url: '/hub/api/cgpa/cgpa_history.php',
      method: 'GET',
      dataType: 'json',
      headers: { 'Authorization': 'Bearer ' + token },
      success: function(records){
        if(!Array.isArray(records) || records.length===0){ $('#history').html('<p>No history yet.</p>'); return; }
        let html = '<table class="table table-striped"><thead><tr><th>Semester</th><th>Course</th><th>Unit</th><th>Grade</th><th>Date</th></tr></thead><tbody>';
        records.forEach(r=>{
          html += `<tr>
                    <td>${r.semester}</td>
                    <td>${r.course_code}</td>
                    <td>${r.credit_unit}</td>
                    <td>${r.grade}</td>
                    <td>${r.created_at}</td>
                  </tr>`;
        });
        html += '</tbody></table>';
        $('#history').html(html);
      },
      error: function(){
        $('#history').html(`<p class="text-warning">Login required. Please <a href="/hub/frontend/login.html">login</a> to view history.</p>`);
      }
    });
  }

  // small helpers
  function debounce(fn, t){ let id; return function(){ clearTimeout(id); id = setTimeout(()=>fn.apply(this, arguments), t); }; }
  function toast(msg){ const el = document.createElement('div'); el.textContent = msg; el.style.cssText = 'position:fixed;right:20px;bottom:20px;padding:8px 12px;background:rgba(0,0,0,0.75);color:white;border-radius:8px;'; document.body.appendChild(el); setTimeout(()=>el.remove(),2000); }
  function escapeHtml(s){ return String(s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }

})(jQuery);
