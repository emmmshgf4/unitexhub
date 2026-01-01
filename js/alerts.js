// alerts.js - small helper to show a slide-down error bar

function showError(message = 'Error', duration = 1800) {
    const bar = document.getElementById('errorBar');
    const text = document.getElementById('errorText');
    const progress = document.getElementById('errorProgress');

    if (!bar || !text || !progress) {
        // Fallback to alert if component not present
        alert(message);
        return;
    }

    text.textContent = message;

    // Reset and show
    bar.style.display = 'flex';
    bar.classList.remove('slide-down');
    // Force reflow to reset animations
    void bar.offsetWidth;
    bar.classList.add('slide-down');

    // Configure the progress animation to match duration
    progress.style.animation = 'none';
    void progress.offsetWidth;
    progress.style.animation = `shrink ${Math.max(0.6, duration / 1000)}s linear forwards`;

    // Hide after duration + small buffer
    clearTimeout(bar._hideTimeout);
    bar._hideTimeout = setTimeout(() => {
        bar.style.transition = 'top 0.25s ease';
        bar.style.top = '-60px';
        // remove after transition
        setTimeout(() => {
            bar.style.display = 'none';
            progress.style.animation = 'none';
            bar.classList.remove('slide-down');
        }, 300);
    }, duration);
}

// Expose to global for inline calls
window.showError = showError;

function showSuccess(message = 'Success', duration = 1500) {
    const bar = document.getElementById('successBar');
    const text = document.getElementById('successText');
    const progress = document.getElementById('successProgress');

    if (!bar || !text || !progress) {
        // Fallback
        console.info('Success:', message);
        return;
    }

    text.textContent = message;

    bar.style.display = 'flex';
    bar.classList.remove('slide-down-success');
    void bar.offsetWidth;
    bar.classList.add('slide-down-success');

    progress.style.animation = 'none';
    void progress.offsetWidth;
    progress.style.animation = `shrink ${Math.max(0.6, duration / 1000)}s linear forwards`;

    clearTimeout(bar._hideTimeout);
    bar._hideTimeout = setTimeout(() => {
        bar.classList.remove('slide-down-success');
        bar.classList.add('slide-up-success');
        setTimeout(() => {
            bar.style.display = 'none';
            progress.style.animation = 'none';
            bar.classList.remove('slide-up-success');
        }, 300);
    }, duration);
}

window.showSuccess = showSuccess;
