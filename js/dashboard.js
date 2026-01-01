document.addEventListener("DOMContentLoaded", async () => {
    // 1. Define all elements at the start
    const courseSelect = document.getElementById("courseSelect");
    const topicSelect = document.getElementById("topicSelect");
    const numQuestions = document.getElementById("numQuestions"); // Ensure this ID exists in HTML
    const durationInput = document.getElementById("durationInput"); // Ensure this ID exists in HTML
    const startPracticeBtn = document.getElementById("startPracticeBtn");
    const dashboardMsg = document.getElementById("dashboardMsg"); // Ensure this ID exists in HTML

    if (!courseSelect) return;

    const token = localStorage.getItem("token");
    if (!token) {
        window.location.href = "index.html";
        return;
    }

const headers = {
    "Authorization": "Bearer " + token
};


    // Load courses
    try {
        const res = await fetch(API_URL + "courses/list.php", { headers });
        const data = await res.json();

        if (data.status) {
            data.data.forEach(c => {
                const opt = document.createElement("option");
                opt.value = c.id;
                opt.textContent = c.course_name;
                courseSelect.appendChild(opt);
            });
        }
    } catch (err) { 
        console.error("Error loading courses:", err); 
    }

    // Load topics
    courseSelect.addEventListener("change", async e => {
        topicSelect.innerHTML = '<option value="">Select Topic</option>';

        if (!e.target.value) return;

        try {
            const res = await fetch(
                API_URL + "topics/list.php?course_id=" + e.target.value,
                { headers }
            );
            const data = await res.json();

            if (data.status) {
                data.data.forEach(t => {
                    const opt = document.createElement("option");
                    opt.value = t.id;
                    opt.textContent = t.topic_name;
                    topicSelect.appendChild(opt);
                });
            }
        } catch (err) { 
            console.error("Error loading topics:", err); 
        }
    });

    // Start practice
    startPracticeBtn.addEventListener("click", async () => {
        const courseId = courseSelect.value;
        const topicId  = topicSelect.value;
        const numQ     = numQuestions ? numQuestions.value : 10; // Fallback if element missing
        const duration = durationInput ? durationInput.value : 30; // Fallback if element missing

        if (!courseId || !topicId) {
            if (dashboardMsg) dashboardMsg.innerText = "Select course and topic!";
            return;
        }

        const formData = new FormData();
        formData.append("course_id", courseId);
        formData.append("topic_id", topicId);
        formData.append("questions", numQ);
        formData.append("duration", duration);

        try {
            const res = await fetch(API_URL + "practices/start.php", {
                method: "POST",
                body: formData,
                headers
            });
            const data = await res.json();

            if (data.status) {
                localStorage.setItem("currentSession", JSON.stringify({
                    session_id: data.session_id,
                    questions: data.questions
                }));
                localStorage.setItem("currentDuration", duration);
                window.location.href = "practice.html";
            } else {
                if (dashboardMsg) dashboardMsg.innerText = data.message;
            }
        } catch (err) { 
            console.error("Error starting practice:", err); 
        }
    });
});