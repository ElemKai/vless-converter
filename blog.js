let allPosts = [];

async function loadBlogPosts() {
    const list = document.getElementById('blog-list');
    if (!list) return;

    list.innerHTML = '<div class="blog-loading">Загрузка...</div>';

    try {
        const res = await fetch(`${BLOG_API_URL}/api/posts`);
        if (!res.ok) throw new Error('HTTP ' + res.status);
        allPosts = await res.json();
        renderBlogList(list);
    } catch (e) {
        list.innerHTML = `
            <div class="blog-empty">
                <p>Не удалось загрузить посты. Проверьте соединение.</p>
                <p style="font-size:13px;color:var(--white-muted);margin-top:8px;">${escapeHtml(e.message)}</p>
            </div>
        `;
    }
}

function renderBlogList(container) {
    if (!allPosts || allPosts.length === 0) {
        container.innerHTML = `
            <div class="blog-empty">
                <div style="font-size:48px;margin-bottom:16px;">📝</div>
                <h2 style="color:var(--white-primary);margin-bottom:8px;">В блоге пока пусто</h2>
                <p style="color:var(--white-muted);">Скоро здесь появятся заметки и полезные materialы.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = allPosts.map(post => `
        <article class="blog-card">
            <div class="blog-card-meta">
                <span class="blog-card-date">${new Date(post.createdAt).toLocaleDateString('ru', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                ${post.tags ? post.tags.map(t => `<span class="blog-tag">${escapeHtml(t)}</span>`).join('') : ''}
            </div>
            <h2 class="blog-card-title">
                <a href="#blog/${encodeURIComponent(post.slug)}">${escapeHtml(post.title)}</a>
            </h2>
            <p class="blog-card-excerpt">${escapeHtml(post.excerpt || post.content.substring(0, 200))}</p>
            <a href="#blog/${encodeURIComponent(post.slug)}" class="blog-card-link">Читать далее →</a>
        </article>
    `).join('');
}
