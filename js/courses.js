// Base API URL
const API = "http://localhost/hub/api/courses/";
const token = localStorage.getItem("adminToken");

// Show temporary messages
function showMessage(text, isError = false) {
    const msgEl = document.getElementById("msg");
    msgEl.innerText = text;
    msgEl.style.color = isError ? "red" : "green";
    setTimeout(() => msgEl.innerText = "", 3000);
}

// Load all courses
async function loadCourses() {
    if (!token) {
        showMessage("No admin token found. Please login.", true);
        return;
    }

    try {
        const res = await fetch(API + "list.php", {
            headers: { Authorization: 'Bearer ' + token }
        });
        if (res.status === 401 || res.status === 403) {
            localStorage.removeItem('adminToken');
            window.location.href = '/hub/frontend/index.html';
            return;
        }

        const text = await res.text();
        let data;
        try {
            data = JSON.parse(text);
        } catch(e) {
            console.error("Invalid JSON returned:", text);
            showMessage("Server error. Check console.", true);
            return;
        }

        const list = document.getElementById("courseList");
        list.innerHTML = "";

        if (!data.status) {
            showMessage(data.message || "Failed to load courses", true);
            return;
        }

        data.data.forEach(c => {
            const li = document.createElement("li");
            li.innerHTML = `
                ${c.course_name} (${c.course_code || '-'}) 
                <button onclick="toggleCourse(${c.id})">
                    ${c.status == 1 ? 'Disable' : 'Enable'}
                </button>
            `;
            list.appendChild(li);
        });

    } catch(err) {
        console.error(err);
        showMessage("Network error", true);
    }
}

// Add a new course
async function addCourse() {
    const name = document.getElementById("courseName").value.trim();
    const code = document.getElementById("courseCode").value.trim();

    if (!name) {
        alert("Course name required");
        return;
    }

    const fd = new FormData();
    fd.append("course_name", name); // must match PHP
    fd.append("course_code", code); // optional

    try {
        const res = await fetch(API + "add.php", {
            method: "POST",
            headers: { Authorization: 'Bearer ' + token },
            body: fd
        });
        if (res.status === 401 || res.status === 403) {
            localStorage.removeItem('adminToken');
            window.location.href = '/hub/frontend/index.html';
            return;
        }

        const text = await res.text();
        let data;
        try {
            data = JSON.parse(text);
        } catch(e) {
            console.error("Invalid JSON returned:", text);
            showMessage("Server error. Check console.", true);
            return;
        }

        if (data.status) {
            document.getElementById("courseName").value = "";
            document.getElementById("courseCode").value = "";
            loadCourses();
            showMessage(data.message);
        } else {
            showMessage(data.message || "Failed to add course", true);
        }

    } catch(err) {
        console.error(err);
        showMessage("Network/server error", true);
    }
}

// Toggle course status
async function toggleCourse(id) {
    const fd = new FormData();
    fd.append("course_id", id);

    try {
        const res = await fetch(API + "toggle.php", {
            method: "POST",
            headers: { Authorization: 'Bearer ' + token },
            body: fd
        });
        if (res.status === 401 || res.status === 403) {
            localStorage.removeItem('adminToken');
            window.location.href = '/hub/frontend/index.html';
            return;
        }

        const data = await res.json();

        if (data.status) {
            // ✅ Safely reload courses
            loadCourses();
        } else {
            showMessage(data.message || "Failed to toggle course", true);
        }
    } catch(err) {
        console.error(err);
        showMessage("Network/server error", true);
    }
}


// Bind add button
document.getElementById("addCourseBtn")?.addEventListener("click", addCourse);

// Initial load
loadCourses();
