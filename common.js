const SITE_CONFIG = {
    donateUrl: 'https://yoomoney.ru/to/4100119516467414',
    githubUrl: 'https://github.com/',
};

const BLOG_API_URL = 'https://spare-macaque-5540.svoboda.deno.net';

function setStatus(type, text) {
    const sb = document.getElementById('statusBar');
    if (!sb) return;
    sb.className = 'status-bar ' + type;
    const st = document.getElementById('statusText');
    if (st) st.textContent = text;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// === HOME PAGE INIT ===
window.initHome = function() {
    document.title = 'VLESS Tools — Инструменты нового поколения';

    const starsContainer = document.getElementById('stars');
    if (starsContainer && starsContainer.children.length === 0) {
        for (let i = 0; i < 150; i++) {
            const star = document.createElement('div');
            star.className = 'star';
            star.style.left = Math.random() * 100 + '%';
            star.style.top = Math.random() * 100 + '%';
            star.style.width = Math.random() * 3 + 'px';
            star.style.height = star.style.width;
            star.style.setProperty('--duration', (Math.random() * 3 + 2) + 's');
            star.style.setProperty('--opacity', Math.random() * 0.7 + 0.3);
            starsContainer.appendChild(star);
        }
    }

    const particlesContainer = document.getElementById('particles');
    if (particlesContainer && particlesContainer.children.length === 0) {
        for (let i = 0; i < 30; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            particle.style.left = Math.random() * 100 + '%';
            particle.style.top = Math.random() * 100 + '%';
            particle.style.width = Math.random() * 4 + 2 + 'px';
            particle.style.height = particle.style.width;
            particle.style.setProperty('--duration', (Math.random() * 10 + 10) + 's');
            particle.style.setProperty('--moveX', (Math.random() * 100 - 50) + 'px');
            particle.style.animationDelay = Math.random() * 10 + 's';
            particlesContainer.appendChild(particle);
        }
    }
};

// === CONVERTER INIT ===
window.initConverter = function() {
    document.title = 'Конвертер — VLESS Tools';
    if (typeof initConverterTabs === 'function') initConverterTabs();
    if (typeof initFileUpload === 'function') initFileUpload();
};

// === CHECKER INIT ===
window.initChecker = function() {
    document.title = 'Чекер — VLESS Tools';
};

// === ADMIN INIT ===
window.initAdmin = function() {
    document.title = 'Админ-панель — VLESS Tools';
    if (typeof initAdminTabs === 'function') initAdminTabs();
    if (typeof detectMyIp === 'function') detectMyIp();
    if (typeof renderClients === 'function') renderClients();
    if (typeof initTerminal === 'function') initTerminal();
    if (typeof checkBlogAuth === 'function') checkBlogAuth();
};

// === BLOG INIT ===
window.initBlog = function() {
    document.title = 'Блог — VLESS Tools';
    if (typeof loadBlogPosts === 'function') loadBlogPosts();
};
