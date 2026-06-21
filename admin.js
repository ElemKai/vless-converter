// ==================== TTYD (OpenWRT) ====================
function saveTtydUrl() {
    const el = document.getElementById('ttyd-url');
    if (!el) return;
    try { localStorage.setItem('ttyd_url', el.value.trim()); } catch {}
}
function getTtydUrl() {
    const el = document.getElementById('ttyd-url');
    if (el) return el.value.trim();
    try { return localStorage.getItem('ttyd_url') || 'http://192.168.2.1:7681'; } catch { return 'http://192.168.2.1:7681'; }
}
function openTtyd() {
    const url = getTtydUrl();
    if (!url) { setStatus('ttyd-status', 'Введите URL ttyd', 'err'); return; }
    const container = document.getElementById('ttyd-container');
    const iframe = document.getElementById('ttyd-iframe');
    if (!container || !iframe) return;
    container.style.display = 'block';
    iframe.src = url;
    setStatus('ttyd-status', `Открыто: ${url}`, 'ok');
    document.getElementById('ttyd-status-text').textContent = `Открыто: ${url}`;
}

// ==================== IP TOOLS ====================
function detectMyIp() {
    fetch('https://api.ipify.org?format=json').then(r => r.json()).then(d => {
        document.getElementById('my-ip').textContent = d.ip;
        return fetch(`http://ip-api.com/json/${d.ip}?fields=status,country,city,isp,lat,lon,timezone`);
    }).then(r => r.json()).then(d => {
        if (d.status === 'success') {
            document.getElementById('my-country').textContent = d.country || '—';
            document.getElementById('my-city').textContent = d.city || '—';
            document.getElementById('my-isp').textContent = d.isp || '—';
            document.getElementById('my-coords').textContent = d.lat && d.lon ? `${d.lat}, ${d.lon}` : '—';
            document.getElementById('my-timezone').textContent = d.timezone || '—';
        }
    }).catch(() => {
        document.getElementById('my-ip').textContent = 'Ошибка';
    });
}
function copyIpInfo() {
    const ip = document.getElementById('my-ip').textContent;
    const country = document.getElementById('my-country').textContent;
    const city = document.getElementById('my-city').textContent;
    const isp = document.getElementById('my-isp').textContent;
    navigator.clipboard.writeText(`IP: ${ip}\nСтрана: ${country}\nГород: ${city}\nПровайдер: ${isp}`);
}
function checkAnyIp() {
    const input = document.getElementById('check-ip-input').value.trim();
    if (!input) return;
    const result = document.getElementById('check-ip-result');
    result.style.display = 'block';
    result.innerHTML = '<p style="color:var(--white-muted);">Проверка...</p>';
    fetch(`http://ip-api.com/json/${encodeURIComponent(input)}?fields=status,country,city,isp,lat,lon,org,as,query,timezone`)
        .then(r => r.json()).then(d => {
            if (d.status !== 'success') { result.innerHTML = '<p style="color:#ef4444;">Не удалось получить информацию</p>'; return; }
            result.innerHTML = `
                <div class="ip-info-grid">
                    <div class="ip-info-item"><div class="ip-info-label">IP</div><div class="ip-info-value">${d.query || '—'}</div></div>
                    <div class="ip-info-item"><div class="ip-info-label">Страна</div><div class="ip-info-value">${d.country || '—'}</div></div>
                    <div class="ip-info-item"><div class="ip-info-label">Город</div><div class="ip-info-value">${d.city || '—'}</div></div>
                    <div class="ip-info-item"><div class="ip-info-label">Провайдер</div><div class="ip-info-value">${d.isp || d.org || '—'}</div></div>
                    <div class="ip-info-item"><div class="ip-info-label">Координаты</div><div class="ip-info-value">${d.lat && d.lon ? d.lat+', '+d.lon : '—'}</div></div>
                    <div class="ip-info-item"><div class="ip-info-label">Часовой пояс</div><div class="ip-info-value">${d.timezone || '—'}</div></div>
                </div>`;
        }).catch(() => { result.innerHTML = '<p style="color:#ef4444;">Ошибка запроса</p>'; });
}

// ==================== SPEED TEST ====================
function runSpeedTest() {
    const btn = document.getElementById('speed-test-btn');
    const label = document.getElementById('speed-label');
    if (!btn || !label) return;
    btn.disabled = true;
    btn.textContent = '[ Измерение... ]';
    label.textContent = 'Тестирование скорости...';

    const chunks = [];
    let totalBytes = 0;
    const startTime = Date.now();
    const results = [];
    const numDownloads = 6;

    let completed = 0;
    const urls = [
        'https://proof.ovh.net/files/100Mb.dat',
        'https://speedtest.tele2.net/100MB.zip',
        'https://speed.hetzner.de/100MB.bin',
    ];

    function measureDownload(url) {
        const s = Date.now();
        return fetch(url, { mode: 'cors', cache: 'no-store' }).then(r => {
            const reader = r.body.getReader();
            let bytes = 0;
            function read() {
                return reader.read().then(({ done, value }) => {
                    if (done) return bytes;
                    bytes += value.length;
                    return read();
                });
            }
            return read().then(bytes => {
                const elapsed = (Date.now() - s) / 1000;
                if (elapsed > 0) results.push((bytes * 8) / elapsed / 1_000_000);
            });
        }).catch(() => {});
    }

    Promise.all(Array(numDownloads).fill(0).map(() => {
        const url = urls[Math.floor(Math.random() * urls.length)];
        return measureDownload(url).then(() => {
            completed++;
            const pct = Math.round((completed / numDownloads) * 100);
            label.textContent = `Тестирование... ${pct}%`;
        });
    })).then(() => {
        const total = Date.now() - startTime;
        const mbps = results.length > 0
            ? (results.reduce((a, b) => a + b, 0) / results.length).toFixed(1)
            : '0';
        document.getElementById('speed-download').textContent = mbps + ' Мбит/с';
        label.textContent = `Средняя скорость: ${mbps} Мбит/с`;
        updateSpeedometer(parseFloat(mbps));
        btn.disabled = false;
        btn.textContent = '[ Измерить ]';
    });
}
function updateSpeedometer(mbps) {
    const needle = document.getElementById('speed-needle');
    const valueText = document.getElementById('speed-value-text');
    const arc = document.getElementById('speed-arc');
    if (needle && valueText) {
        const angle = Math.min(mbps / 2000, 1) * 180 - 90;
        needle.style.transform = `rotate(${angle} 200 200)`;
        valueText.textContent = Math.round(mbps);
    }
    if (arc) {
        const pct = Math.min(mbps / 2000, 1);
        arc.style.strokeDashoffset = `${502 - (502 * pct)}`;
    }
}

// ==================== BLOG EDITOR ====================
function initBlogEditor() {}
function checkBlogAuth() {
    const token = (() => { try { return localStorage.getItem('blog_token'); } catch { return null; } })();
    if (token) {
        document.getElementById('blog-auth-section').style.display = 'none';
        document.getElementById('blog-editor-section').style.display = 'block';
        loadBlogEditorList();
    }
}
function loginWithGithub() {
    const currentUrl = window.location.href.split('&token=')[0];
    const redirectUrl = currentUrl.startsWith('file://') ? 'https://ssh-svoboda.ru/' : currentUrl;
    const authUrl = `${getBlogApiUrl()}/auth/github/login?redirect=${encodeURIComponent(redirectUrl)}`;
    window.location.href = authUrl;
}
function logoutBlog() {
    try { localStorage.removeItem('blog_token'); } catch {}
    document.getElementById('blog-auth-section').style.display = 'block';
    document.getElementById('blog-editor-section').style.display = 'none';
}
function getToken() { try { return localStorage.getItem('blog_token'); } catch { return null; } }
function saveBlogPost() {
    const title = document.getElementById('blog-post-title').value.trim();
    const content = document.getElementById('blog-post-content').value.trim();
    const tags = document.getElementById('blog-post-tags').value.split(',').map(t => t.trim()).filter(Boolean);
    const slug = document.getElementById('blog-post-slug').value.trim();
    const editId = document.getElementById('blog-editor-id').textContent || null;
    if (!title || !content) { setStatus('blog-editor-status', 'Заполните заголовок и содержимое', 'err'); return; }

    const token = getToken();
    if (!token) { setStatus('blog-editor-status', 'Требуется авторизация', 'err'); return; }

    const method = editId ? 'PUT' : 'POST';
    const url = editId ? `${getBlogApiUrl()}/api/posts/${editId}` : `${getBlogApiUrl()}/api/posts`;

    fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
            title, content,
            slug: slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
            tags,
            published: true,
        }),
    }).then(r => r.json()).then(result => {
        if (result.error) { setStatus('blog-editor-status', `Ошибка: ${result.error}`, 'err'); return; }
        setStatus('blog-editor-status', 'Пост сохранён!', 'ok');
        clearBlogEditor();
        loadBlogEditorList();
    }).catch(() => setStatus('blog-editor-status', 'Ошибка сети', 'err'));
}
function loadBlogEditorList() {
    const list = document.getElementById('blog-editor-list');
    if (!list) return;
    list.innerHTML = '<p style="color:var(--white-muted);">Загрузка...</p>';
    const token = getToken();
    fetch(`${getBlogApiUrl()}/api/posts`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
    }).then(r => r.json()).then(posts => {
        if (!Array.isArray(posts) || posts.length === 0) {
            list.innerHTML = '<p style="color:var(--white-muted);">Нет постов</p>';
            return;
        }
        list.innerHTML = posts.map(p => `
            <div class="blog-editor-item">
                <div>
                    <div class="blog-editor-item-title">${escapeHtml(p.title)}</div>
                    <div class="blog-editor-item-meta">${p.slug} · ${new Date(p.created_at).toLocaleDateString()}</div>
                </div>
                <div class="blog-editor-item-actions">
                    <button class="btn btn-ghost" onclick="editBlogPost('${p.id}')" style="padding:4px 12px;font-size:12px;">✏️</button>
                    <button class="btn btn-ghost" onclick="deleteBlogPost('${p.id}')" style="padding:4px 12px;font-size:12px;">🗑️</button>
                </div>
            </div>
        `).join('');
    }).catch(() => { list.innerHTML = '<p style="color:#ef4444;">Ошибка загрузки</p>'; });
}
function editBlogPost(id) {
    const token = getToken();
    if (!token) return;
    fetch(`${getBlogApiUrl()}/api/posts/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` },
    }).then(r => r.json()).then(post => {
        if (post.error) return;
        document.getElementById('blog-post-title').value = post.title || '';
        document.getElementById('blog-post-content').value = post.content || '';
        document.getElementById('blog-post-tags').value = (post.tags || []).join(', ');
        document.getElementById('blog-post-slug').value = post.slug || '';
        document.getElementById('blog-editor-id').textContent = post.id || '';
        document.getElementById('blog-save-btn').textContent = '[ Обновить ]';
    });
}
function deleteBlogPost(id) {
    if (!confirm('Удалить пост?')) return;
    const token = getToken();
    if (!token) return;
    fetch(`${getBlogApiUrl()}/api/posts/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
    }).then(r => r.json()).then(result => {
        if (result.error) { alert('Ошибка: ' + result.error); return; }
        loadBlogEditorList();
    }).catch(() => alert('Ошибка сети'));
}
function generateSlug() {
    const title = document.getElementById('blog-post-title').value.trim();
    if (!title) return;
    const slug = title.toLowerCase()
        .replace(/[^a-z0-9а-яё\s-]/g, '')
        .replace(/[а-яё]/g, c => 'aoekmhoptcuyx'.split('')[Math.floor(Math.random() * 14)])
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
    document.getElementById('blog-post-slug').value = slug || 'post-' + Date.now();
}
function clearBlogEditor() {
    document.getElementById('blog-post-title').value = '';
    document.getElementById('blog-post-content').value = '';
    document.getElementById('blog-post-tags').value = '';
    document.getElementById('blog-post-slug').value = '';
    document.getElementById('blog-editor-id').textContent = '';
    document.getElementById('blog-save-btn').textContent = '[ Опубликовать ]';
    setStatus('blog-editor-status', 'готово', '');
}

// ==================== INIT ====================
function initAdminTabs() {
    detectMyIp();
    const ttydInput = document.getElementById('ttyd-url');
    if (ttydInput) {
        try { const saved = localStorage.getItem('ttyd_url'); if (saved) ttydInput.value = saved; } catch {}
    }
}
