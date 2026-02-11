// Leaderboard Page Script
const API_URL = '/cbtwebsite/api/';

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    initTheme();
    loadLeaderboard();
    setupThemeToggle();
});

// Initialize theme from localStorage
function initTheme() {
    const isDarkMode = localStorage.getItem('darkMode') === 'true';
    if (isDarkMode) {
        document.body.classList.add('dark');
        updateThemeIcon(true);
    }
}

// Setup theme toggle
function setupThemeToggle() {
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', function() {
            const isDark = document.body.classList.toggle('dark');
            localStorage.setItem('darkMode', isDark);
            updateThemeIcon(isDark);
        });
    }
}

// Update theme icon
function updateThemeIcon(isDark) {
    const icon = document.querySelector('.theme-toggle i');
    if (icon) {
        icon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
    }
}

// Load leaderboard data
async function loadLeaderboard() {
    const container = document.getElementById('leaderboardContainer');
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(API_URL + 'leaderboard.php', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': token ? 'Bearer ' + token : ''
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch leaderboard');
        }

        const data = await response.json();

        if (data.status && data.data && data.data.length > 0) {
            displayLeaderboard(data.data, container);
        } else {
            showEmptyState(container);
        }
    } catch (error) {
        console.error('Error loading leaderboard:', error);
        showErrorState(container, error.message);
    }
}

// Display leaderboard data
function displayLeaderboard(leaderboardData, container) {
    let html = '';

    const medals = ['🥇', '🥈', '🥉'];
    const rankClasses = ['rank-1', 'rank-2', 'rank-3'];
    const heroicTitles = ['UNITECH ELITE', 'LEGENDARY SCHOLAR', 'RISING CHAMPION'];

    leaderboardData.forEach((student, index) => {
        const rank = index + 1;
        const medal = medals[index] || '';
        const rankClass = rankClasses[index] || '';
        const heroicTitle = heroicTitles[index] || '';

        html += `
            <div class="leaderboard-card">
                <div class="leaderboard-rank ${rankClass}">
                    ${rank}
                </div>
                ${medal ? `<div class="leaderboard-medal">${medal}</div>` : ''}
                ${heroicTitle ? `<div style="font-family: 'Space Grotesk', sans-serif; font-size: 0.85rem; font-weight: 700; color: var(--accent-primary); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 0.5rem;">${heroicTitle}</div>` : ''}
                <div class="leaderboard-name">${escapeHtml(student.name)}</div>
                <div class="leaderboard-email">${escapeHtml(student.email)}</div>
                
                <div class="leaderboard-stats">
                    <div class="leaderboard-stat">
                        <span class="leaderboard-stat-label">Average Score</span>
                        <span class="leaderboard-stat-value">${student.avg_score}%</span>
                    </div>
                    <div class="leaderboard-stat">
                        <span class="leaderboard-stat-label">Topics Completed</span>
                        <span class="leaderboard-stat-value">${student.total_attempts}</span>
                    </div>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

// Show empty state
function showEmptyState(container) {
    container.innerHTML = `
        <div class="empty-state" style="grid-column: 1/-1;">
            <i class="fas fa-chart-line"></i>
            <h3>No Leaderboard Data</h3>
            <p>Start practicing to appear on the leaderboard!</p>
        </div>
    `;
}

// Show error state
function showErrorState(container, message) {
    container.innerHTML = `
        <div class="empty-state" style="grid-column: 1/-1;">
            <i class="fas fa-exclamation-circle"></i>
            <h3>Error Loading Leaderboard</h3>
            <p>${escapeHtml(message)}</p>
        </div>
    `;
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}
