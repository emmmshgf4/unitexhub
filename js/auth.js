
document.getElementById("loginForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const msgEl = document.getElementById("loginMsg");
    msgEl.innerText = "";

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

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
            const err = data.message || "Login failed";
            if (typeof showError === 'function') showError(err, 1800);
            else msgEl.innerText = err;
            return;
        }

        const token = data.token || data.data?.token;

        if (!token) {
            const err = "Token not returned by server";
            if (typeof showError === 'function') showError(err, 1800);
            else msgEl.innerText = err;
            return;
        }

        const payload = parseJWT(token);

        if (!payload) {
            const err = "Invalid token received";
            if (typeof showError === 'function') showError(err, 1800);
            else msgEl.innerText = err;
            return;
        }

        const role = payload.role || payload.user?.role;

        const redirectWithMessage = (target) => {
            const successMsg = 'Login successful';
            if (typeof showSuccess === 'function') {
                showSuccess(successMsg, 1100);
                setTimeout(() => { window.location.href = target; }, 1100 + 200);
            } else {
                // fallback immediate redirect
                window.location.href = target;
            }
        };

        if (role === "admin") {
            localStorage.setItem("adminToken", token);
            redirectWithMessage('admin/dashboard.html');
        } else if (role === "user") {
            localStorage.setItem("token", token);
            redirectWithMessage('dashboard.html');
        } else {
            const err = "Unknown role. Access denied.";
            if (typeof showError === 'function') showError(err, 1800);
            else msgEl.innerText = err;
        }

    } catch (err) {
        console.error(err);
        const errMsg = "Server error. Try again.";
        if (typeof showError === 'function') showError(errMsg, 1800);
        else msgEl.innerText = errMsg;
    }
});

/**
 * Decode JWT payload safely (Base64URL compliant)
 */
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
