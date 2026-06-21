function navigate() {
    const hash = window.location.hash || '#home';
    const app = document.getElementById('app');
    if (!app) return;

    const isPost = hash.startsWith('#blog/');
    const isAdmin = hash.startsWith('#admin');

    if (isAdmin && hash.includes('token=')) {
        const token = hash.split('token=')[1].split('&')[0];
        try { localStorage.setItem('blog_token', token); } catch {}
        window.location.hash = '#admin';
        return;
    }

    let templateId = 'page-home';
    if (hash === '#converter') templateId = 'page-converter';
    else if (hash === '#checker') templateId = 'page-checker';
    else if (hash === '#blog') templateId = 'page-blog';
    else if (hash === '#admin') templateId = 'page-admin';
    else if (isPost) templateId = 'page-blog';

    const template = document.getElementById(templateId);
    if (!template) return;

    const clone = template.content.cloneNode(true);
    app.innerHTML = '';
    app.appendChild(clone);

    setActiveNav(templateId.replace('page-', ''));
    document.title = getTitle(templateId);

    const initFn = { home: initHome, converter: initConverter, checker: initChecker, blog: () => initBlog(hash), admin: initAdmin };
    const key = templateId.replace('page-', '');
    if (initFn[key]) initFn[key]();
}

function initBlog(hash) {
    if (hash.startsWith('#blog/')) renderBlogPost(hash.replace('#blog/', ''));
    else loadBlogPosts();
}

function renderBlogPost(slug) {
    const app = document.getElementById('app');
    const wrapper = app.querySelector('.wrapper');
    if (!wrapper) return;
    wrapper.innerHTML = '<div class="blog-loading">Загрузка поста...</div>';

    fetch(`${getBlogApiUrl()}/api/posts/${encodeURIComponent(slug)}`)
        .then(r => r.json())
        .then(post => {
            if (post.error) { wrapper.innerHTML = `<p style="color:var(--white-muted);text-align:center;padding:60px;">Пост не найден</p>`; return; }
            wrapper.innerHTML = `
                <div class="blog-post-page">
                    <a href="#blog" class="blog-back-link">← Все записи</a>
                    <article class="blog-post-full">
                        <div class="blog-post-meta">
                            <span class="blog-post-date">${new Date(post.created_at).toLocaleDateString('ru-RU', {year:'numeric',month:'long',day:'numeric'})}</span>
                            ${(post.tags||[]).map(t => `<span class="blog-tag">${escapeHtml(t)}</span>`).join('')}
                        </div>
                        <h1 class="blog-post-title">${escapeHtml(post.title)}</h1>
                        <div class="blog-post-content">${renderMarkdown(post.content)}</div>
                    </article>
                </div>
            `;
            setActiveNav('blog');
            document.title = `${post.title} — VLESS Tools`;
        })
        .catch(() => { wrapper.innerHTML = '<p style="color:var(--white-muted);text-align:center;padding:60px;">Ошибка загрузки поста</p>'; });
}

function renderMarkdown(text) {
    if (!text) return '';
    let html = text
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/^### (.+)$/gm, '<h3>$1</h3>')
        .replace(/^## (.+)$/gm, '<h2>$1</h2>')
        .replace(/^# (.+)$/gm, '<h1>$1</h1>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/^- (.+)$/gm, '<li>$1</li>')
        .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
        .replace(/!\[(.+?)\]\((.+?)\)/g, '<img src="$2" alt="$1" style="max-width:100%;border-radius:8px;margin:16px 0;">')
        .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank">$1</a>')
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br>');
    return '<p>' + html + '</p>';
}

function setActiveNav(page) {
    document.querySelectorAll('[data-nav]').forEach(a => {
        a.classList.toggle('active', a.getAttribute('data-nav') === page);
    });
}

function getTitle(templateId) {
    const titles = { 'page-home': 'VLESS Tools — Инструменты нового поколения', 'page-converter': 'Конвертер — VLESS Tools', 'page-checker': 'Чекер — VLESS Tools', 'page-blog': 'Блог — VLESS Tools', 'page-admin': 'Админ-панель — VLESS Tools' };
    return titles[templateId] || 'VLESS Tools';
}

function getBlogApiUrl() {
    try { return localStorage.getItem('blog_api_url') || 'https://spare-macaque-5540.svoboda.deno.net'; }
    catch { return 'https://spare-macaque-5540.svoboda.deno.net'; }
}

window.addEventListener('hashchange', navigate);
document.addEventListener('DOMContentLoaded', () => {
    navigate();
    document.querySelector('nav')?.addEventListener('click', e => {
        const link = e.target.closest('[data-nav]');
        if (link) document.querySelectorAll('[data-nav]').forEach(a => a.classList.remove('active'));
    });
});
