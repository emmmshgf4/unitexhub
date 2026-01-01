

// DO NOT redeclare API_URL here
// const API_URL = "http://localhost/hub/api/"; <-- REMOVE THIS

document.getElementById("adminLoginForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const msgEl = document.getElementById("adminLoginMsg");
    msgEl.innerText = "";

    const email = document.getElementById("adminEmail").value.trim();
    const password = document.getElementById("adminPassword").value;

    const formData = new FormData();
    formData.append("email", email);
    formData.append("password", password);

    try {
        const res = await fetch(API_URL + "auth/login.php", {
            method: "POST",
            body: formData
        });

        const data = await res.json();

        if (!data.status) {
            msgEl.innerText = data.message || "Login failed";
            return;
        }

        const token = data.token || data.data?.token;

        if (!token) {
            msgEl.innerText = "Token not returned by server";
            return;
        }

        const payload = parseJWT(token);

        if (!payload) {
            msgEl.innerText = "Invalid token received";
            return;
        }

        const role = payload.role || payload.user?.role;

        if (role !== "admin") {
            msgEl.innerText = "Access denied. Admins only.";
            return;
        }

        localStorage.setItem("adminToken", token);
        window.location.href = "admin/dashboard.html";

    } catch (err) {
        console.error(err);
        msgEl.innerText = "Server error. Try again.";
    }
});

function parseJWT(token) {
    if (!token) return null;
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    try {
        const base64Url = parts[1];
        const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
        const jsonPayload = decodeURIComponent(
            atob(base64)
                .split("")
                .map(c => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
                .join("")
        );
        return JSON.parse(jsonPayload);
    } catch (err) {
        console.error("JWT decode failed:", err);
        return null;
    }
}
