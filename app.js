const ROUTES = {
    '': { title: 'VLESS Tools — Инструменты нового поколения', init: 'initHome' },
    'converter': { title: 'Конвертер — VLESS Tools', init: 'initConverter' },
    'checker': { title: 'Чекер — VLESS Tools', init: 'initChecker' },
    'blog': { title: 'Блог — VLESS Tools', init: 'initBlog' },
    'admin': { title: 'Админ-панель — VLESS Tools', init: 'initAdmin' },
};

const PAGE_TEMPLATES = {};

async function loadTemplates() {
    const pages = ['home', 'converter', 'checker', 'admin', 'blog'];
    for (const page of pages) {
        const template = document.getElementById(`page-${page}`);
        if (template) {
            PAGE_TEMPLATES[page] = template.innerHTML;
        }
    }
}

function getRoute() {
    const hash = window.location.hash.slice(1).toLowerCase();
    if (hash.startsWith('blog/')) return 'post';
    if (ROUTES[hash]) return hash;
    return '';
}

function navigateTo(route) {
    if (route === '') {
        window.location.hash = '';
    } else {
        window.location.hash = route;
    }
}

function setActiveNav(route) {
    if (route === 'post') route = 'blog';
    document.querySelectorAll('[data-nav]').forEach(el => {
        el.classList.toggle('active', el.dataset.nav === route || (route === '' && el.dataset.nav === 'home'));
    });
}

async function router() {
    const route = getRoute();
    const app = document.getElementById('app');

    if (route === 'post') {
        const slug = window.location.hash.slice(6);
        await renderBlogPost(slug);
        return;
    }

    setActiveNav(route);

    if (route === '') {
        app.innerHTML = PAGE_TEMPLATES['home'];
        window.initHome();
        return;
    }

    const routeDef = ROUTES[route];
    if (!routeDef) {
        navigateTo('');
        return;
    }

    document.title = routeDef.title;
    app.innerHTML = PAGE_TEMPLATES[route];
    window[routeDef.init]();
}

async function renderBlogPost(slug) {
    const app = document.getElementById('app');
    document.title = 'Загрузка... — VLESS Tools';

    try {
        const res = await fetch(`${BLOG_API_URL}/api/posts/${encodeURIComponent(slug)}`);
        if (!res.ok) throw new Error('Not found');
        const post = await res.json();

        document.title = `${post.title} — VLESS Tools`;
        app.innerHTML = `
            <div class="wrapper blog-post-page">
                <a href="#blog" class="blog-back-link">← Назад к блогу</a>
                <article class="blog-post-full">
                    <div class="blog-post-meta">
                        <span class="blog-post-date">${new Date(post.createdAt).toLocaleDateString('ru')}</span>
                        ${post.tags ? post.tags.map(t => `<span class="blog-tag">${escapeHtml(t)}</span>`).join('') : ''}
                    </div>
                    <h1 class="blog-post-title">${escapeHtml(post.title)}</h1>
                    <div class="blog-post-content">${post.contentHtml || post.content}</div>
                </article>
            </div>
        `;

        if (window.Prism) {
            Prism.highlightAll();
        }
    } catch (e) {
        app.innerHTML = `
            <div class="wrapper" style="text-align:center;padding:120px 20px;">
                <h2 style="color:var(--gold-primary);margin-bottom:16px;">Пост не найден</h2>
                <p style="color:var(--white-muted);margin-bottom:24px;">Возможно, он был удалён или ссылка неверна.</p>
                <a href="#blog" class="btn-primary">← Вернуться в блог</a>
            </div>
        `;
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function handleOAuthCallback() {
    const hash = window.location.hash;
    if (hash.includes('&token=')) {
        const params = new URLSearchParams(hash.slice(1));
        const token = params.get('token');
        if (token) {
            localStorage.setItem('blog_token', token);
            const cleanHash = hash.split('&token=')[0];
            window.location.hash = cleanHash || '';
        }
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    handleOAuthCallback();
    await loadTemplates();
    router();

    window.addEventListener('hashchange', router);

    document.querySelector('nav').addEventListener('click', (e) => {
        const link = e.target.closest('[data-nav]');
        if (link) {
            const route = link.dataset.nav;
            if (route === 'home') {
                e.preventDefault();
                navigateTo('');
            }
        }
    });
});
