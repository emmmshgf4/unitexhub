document.getElementById('signupForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const msgEl = document.getElementById('signupMsg');
    if (msgEl) msgEl.innerText = '';

    const form = e.target;
    const name = form.querySelector('input[name="name"]').value.trim();
    const email = form.querySelector('input[name="email"]').value.trim();
    const password = form.querySelector('input[name="password"]').value;

    const fd = new FormData();
    fd.append('name', name);
    fd.append('email', email);
    fd.append('password', password);

    // Client-side validation
    function isStrongPassword(password) {
        return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?#&])[A-Za-z\d@$!%*?#&]{6,}$/.test(password);
    }

    // Clear previous input error styles and messages
    const fields = [ 'name', 'email', 'password' ];
    const errors = {
        name: document.getElementById('nameError'),
        email: document.getElementById('emailError'),
        password: document.getElementById('passwordError')
    };

    fields.forEach(n => {
        const el = form.querySelector(`[name="${n}"]`);
        if (el) el.classList.remove('input-error');
        if (errors[n]) errors[n].textContent = '';
    });

    if (!name) {
        const err = 'Name is required';
        const el = form.querySelector('[name="name"]');
        if (el) el.classList.add('input-error');
        if (errors.name) errors.name.textContent = err;
        el && el.focus();
        return;
    }

    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRe.test(email)) {
        const err = 'A valid email is required';
        const el = form.querySelector('[name="email"]');
        if (el) el.classList.add('input-error');
        if (errors.email) errors.email.textContent = err;
        el && el.focus();
        return;
    }

    if (!password || !isStrongPassword(password)) {
        const err = 'Password must be 6+ chars, include upper, lower, number and special char';
        const el = form.querySelector('[name="password"]');
        if (el) el.classList.add('input-error');
        if (errors.password) errors.password.textContent = err;
        el && el.focus();
        return;
    }

    try {
        const res = await fetch(API_URL + 'auth/signup.php', {
            method: 'POST',
            body: fd
        });

        const data = await res.json();

        if (!data.status) {
            const err = data.message || 'Signup failed';
            if (typeof showError === 'function') showError(err, 2200);
            if (msgEl) msgEl.innerText = err;
            return;
        }

        const okMsg = data.message || 'Signup successful';
        if (typeof showSuccess === 'function') {
            showSuccess(okMsg, 1200);
            // After a short delay redirect to email verification page (absolute path)
            setTimeout(() => {
                console.log('Redirecting to verification page for', email);
                window.location.href = '/hub/frontend/verify.html?email=' + encodeURIComponent(email);
            }, 1400);
        } else {
            if (msgEl) msgEl.innerText = okMsg;
            console.log('Redirecting to verification page (fallback) for', email);
            window.location.href = '/hub/frontend/verify.html?email=' + encodeURIComponent(email);
        }

    } catch (err) {
        console.error('Signup error:', err);
        const errMsg = 'Server error. Try again.';
        if (typeof showError === 'function') showError(errMsg, 1800);
        if (msgEl) msgEl.innerText = errMsg;
    }
});

// Clear inline error message when user edits a field
['name', 'email', 'password'].forEach(n => {
    const input = document.querySelector(`#signupForm [name="${n}"]`);
    const err = document.getElementById(`${n}Error`);
    if (input) {
        input.addEventListener('input', () => {
            input.classList.remove('input-error');
            if (err) err.textContent = '';
            if (document.getElementById('signupMsg')) document.getElementById('signupMsg').textContent = '';
        });
    }
});
