function loadBlogPosts() {
    const list = document.getElementById('blog-list');
    if (!list) return;
    list.innerHTML = '<div class="blog-loading">Загрузка...</div>';
    const apiUrl = getBlogApiUrl();

    fetch(`${apiUrl}/api/posts`)
        .then(r => r.json())
        .then(posts => {
            if (!Array.isArray(posts) || posts.length === 0) {
                list.innerHTML = '<div class="blog-empty">Пока нет записей</div>';
                return;
            }
            list.innerHTML = posts.map(post => `
                <article class="blog-card">
                    <div class="blog-card-meta">
                        <span class="blog-card-date">${formatDate(post.created_at)}</span>
                        ${(post.tags || []).map(t => `<span class="blog-tag">${escapeHtml(t)}</span>`).join('')}
                    </div>
                    <h2 class="blog-card-title">
                        <a href="#blog/${encodeURIComponent(post.slug)}">${escapeHtml(post.title)}</a>
                    </h2>
                    <div class="blog-card-excerpt">${escapeHtml(post.excerpt || post.content?.slice(0, 200) || '')}</div>
                    <a href="#blog/${encodeURIComponent(post.slug)}" class="blog-card-link">Читать далее →</a>
                </article>
            `).join('');
        })
        .catch(() => {
            list.innerHTML = '<div class="blog-empty">Ошибка загрузки. Проверьте соединение.</div>';
        });
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    try {
        return new Date(dateStr).toLocaleDateString('ru-RU', {
            year: 'numeric', month: 'long', day: 'numeric'
        });
    } catch { return dateStr; }
}
