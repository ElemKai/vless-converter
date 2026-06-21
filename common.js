const BLOG_API_URL = (() => {
    try { return localStorage.getItem('blog_api_url') || 'https://spare-macaque-5540.svoboda.deno.net'; }
    catch { return 'https://spare-macaque-5540.svoboda.deno.net'; }
})();
const SITE_CONFIG = { version: '2.0.0' };
function escapeHtml(text) {
    const d = document.createElement('div');
    d.textContent = text;
    return d.innerHTML;
}
function $(id) { return document.getElementById(id); }
function setStatus(elId, text, type) {
    const el = $(elId);
    if (!el) return;
    const bar = el.closest('.status-bar') || el;
    bar.className = 'status-bar' + (type === 'ok' ? ' ok' : type === 'err' ? ' err' : '');
    const span = bar.querySelector('span') || el;
    span.textContent = text;
}

function initHome() {
    if (window._starsInited) return;
    window._starsInited = true;
    createStars();
    createParticles();
}
function initConverter() {
    const app = document.getElementById('app');
    if (!app) return;
    const tabs = app.querySelectorAll('.tab-btn');
    if (!tabs.length) return;
    tabs.forEach(t => {
        t.onclick = () => {
            tabs.forEach(x => x.classList.remove('active'));
            t.classList.add('active');
            app.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            const target = app.querySelector(`#${t.getAttribute('data-tab')}`);
            if (target) target.classList.add('active');
        };
    });
    initConverterTabs();
}
function initChecker() { initCheckerTabs(); }
function initBlog() { loadBlogPosts(); }
function initAdmin() {
    const app = document.getElementById('app');
    if (!app) return;
    const tabs = app.querySelectorAll('.tab-btn');
    if (!tabs.length) return;
    tabs.forEach(t => {
        t.onclick = () => {
            tabs.forEach(x => x.classList.remove('active'));
            t.classList.add('active');
            app.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            const target = app.querySelector(`#${t.getAttribute('data-tab')}`);
            if (target) target.classList.add('active');
            if (t.getAttribute('data-tab') === 'local-ssh') initLocalTerminal();
        };
    });
    initAdminTabs();
    checkBlogAuth();
    loadBlogEditorList();
}
function createStars() {
    const container = document.getElementById('stars');
    if (!container) return;
    for (let i = 0; i < 200; i++) {
        const star = document.createElement('div');
        star.className = 'star';
        star.style.cssText = `
            left: ${Math.random() * 100}%;
            top: ${Math.random() * 100}%;
            width: ${Math.random() * 3 + 1}px;
            height: ${Math.random() * 3 + 1}px;
            --duration: ${Math.random() * 3 + 2}s;
            --opacity: ${Math.random() * 0.5 + 0.3};
            animation-delay: ${Math.random() * 5}s;
        `;
        container.appendChild(star);
    }
}
function createParticles() {
    const container = document.getElementById('particles');
    if (!container) return;
    for (let i = 0; i < 15; i++) {
        const p = document.createElement('div');
        p.className = 'particle';
        p.style.cssText = `
            left: ${Math.random() * 100}%;
            bottom: -10px;
            width: ${Math.random() * 4 + 2}px;
            height: ${Math.random() * 4 + 2}px;
            --duration: ${Math.random() * 10 + 10}s;
            --moveX: ${(Math.random() - 0.5) * 100}px;
            animation-delay: ${Math.random() * 10}s;
        `;
        container.appendChild(p);
    }
}
