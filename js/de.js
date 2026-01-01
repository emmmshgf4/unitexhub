

// Theme handling: default to dark unless user chooses otherwise.
const checkbox = document.getElementById('themeCheckbox');
const toggleBtn = document.getElementById('themeToggle');
const icon = document.getElementById('themeIcon');

// Determine initial theme. If nothing is saved, default to 'dark' and persist it.
let theme = localStorage.getItem('theme');
if (!theme) {
    theme = 'dark';
    localStorage.setItem('theme', theme);
}

// Apply the theme to the page and UI
applyTheme(theme);

if (checkbox) checkbox.checked = (theme === 'dark');

// Toggle handler: clicking the button toggles between dark (default) and light.
if (toggleBtn) toggleBtn.addEventListener('click', () => {
    const isCurrentlyLight = document.body.classList.contains('light');
    const newTheme = isCurrentlyLight ? 'dark' : 'light';
    applyTheme(newTheme);
    localStorage.setItem('theme', newTheme);
});

// Helper: apply theme state to DOM and UI elements
function applyTheme(t) {
    if (t === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
        document.body.classList.add('light');
        if (icon) icon.className = 'bi bi-sun-fill';
        if (checkbox) checkbox.checked = false;
    } else {
        document.documentElement.setAttribute('data-theme', 'dark');
        document.body.classList.remove('light');
        if (icon) icon.className = 'bi bi-moon-fill';
        if (checkbox) checkbox.checked = true;
    }
    // Smooth transition for colors when toggling
    document.body.style.transition = 'background-color 0.35s ease, color 0.35s ease';
}



