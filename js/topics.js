const COURSE_API = "http://localhost/hub/api/courses/";
const TOPIC_API  = "http://localhost/hub/api/topics/";
const token = localStorage.getItem("adminToken");

// Utility to show messages to the user
function showMessage(text, isError = false) {
    const msg = document.getElementById("msg");
    if (!msg) return; // Guard clause if element doesn't exist
    msg.innerText = text;
    msg.style.color = isError ? "red" : "green";
    setTimeout(() => msg.innerText = "", 3000);
}

// Load courses into the dropdown
async function loadCourses() {
    try {
        const res = await fetch(`${COURSE_API}list.php`, {
            headers: { Authorization: 'Bearer ' + token }
        });
        if (res.status === 401 || res.status === 403) { localStorage.removeItem('adminToken'); window.location.href = '/hub/frontend/index.html'; return; }
        const data = await res.json();

        if (!data.status) return;

        const select = document.getElementById("courseSelect");
        select.innerHTML = `<option value="">-- Select Course --</option>`;

        data.data.forEach(c => {
            const opt = document.createElement("option");
            opt.value = c.id;
            // Using backticks for cleaner string interpolation
            opt.textContent = `${c.course_name} (${c.course_code || '-'})`;
            select.appendChild(opt);
        });

    } catch (e) {
        console.error("Error loading courses:", e);
    }
}

// Load topics filtered by the selected course
async function loadTopics(courseId) {
    const list = document.getElementById("topicList");
    if (!courseId) {
        list.innerHTML = "";
        return;
    }

    try {
        const res = await fetch(`${TOPIC_API}list.php?course_id=${courseId}`, {
            headers: { Authorization: 'Bearer ' + token }
        });
        if (res.status === 401 || res.status === 403) { localStorage.removeItem('adminToken'); window.location.href = '/hub/frontend/index.html'; return; }
        const data = await res.json();

        const data = await res.json();
        list.innerHTML = "";

        if (!data.status || !data.data) return;

        data.data.forEach(t => {
            const li = document.createElement("li");
            // Template literal for HTML structure
            li.innerHTML = `
                <span>${t.topic_name}</span>
                <button onclick="toggleTopic(${t.id})">
                    ${parseInt(t.status) === 1 ? 'Disable' : 'Enable'}
                </button>
            `;
            list.appendChild(li);
        });

    } catch (e) {
        console.error("Error loading topics:", e);
    }
}

// Add a new topic
async function addTopic() {
    const courseSelect = document.getElementById("courseSelect");
    const topicInput = document.getElementById("topicName");
    
    const courseId = courseSelect.value;
    const topic = topicInput.value.trim();

    if (!courseId || !topic) {
        alert("Please select a course and enter a topic name.");
        return;
    }

    const fd = new FormData();
    fd.append("course_id", courseId);
    fd.append("topic_name", topic);

    try {
        const res = await fetch(`${TOPIC_API}add.php`, {
            method: "POST",
            headers: { Authorization: 'Bearer ' + token },
            body: fd
        });
        if (res.status === 401 || res.status === 403) { localStorage.removeItem('adminToken'); window.location.href = '/hub/frontend/index.html'; return; }
        const data = await res.json();

        if (data.status) {
            topicInput.value = ""; // Clear input
            loadTopics(courseId);  // Refresh list
            showMessage("Topic added successfully!");
        } else {
            showMessage(data.message || "Failed to add topic", true);
        }

    } catch (e) {
        console.error("Error adding topic:", e);
        showMessage("Connection error", true);
    }
}

// Toggle topic status (Enable/Disable)
async function toggleTopic(id) {
    const fd = new FormData();
    fd.append("topic_id", id);

    try {
        const res = await fetch(`${TOPIC_API}toggle.php`, {
            method: "POST",
            headers: { Authorization: 'Bearer ' + token },
            body: fd
        });
        if (res.status === 401 || res.status === 403) { localStorage.removeItem('adminToken'); window.location.href = '/hub/frontend/index.html'; return; }
        const data = await res.json();
        if (data.status) {
            const currentCourseId = document.getElementById("courseSelect").value;
            loadTopics(currentCourseId);
        } else {
            showMessage(data.message, true);
        }

    } catch (e) {
        console.error("Error toggling topic:", e);
    }
}

// Event Listeners
document.addEventListener("DOMContentLoaded", () => {
    const select = document.getElementById("courseSelect");
    if (select) {
        select.addEventListener("change", e => loadTopics(e.target.value));
    }
    
    // Initial load
    loadCourses();
});