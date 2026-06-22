function initAdmin() {
    if (initAdmin._done) return;
    initAdmin._done = true;
    const token = sessionStorage.getItem('gh_token');

    // -- Blog editor --
    const editor = document.getElementById('blog-editor');
    const preview = document.getElementById('blog-preview');
    const saveBtn = document.getElementById('blog-save');
    const loadBtn = document.getElementById('blog-load');
    const postList = document.getElementById('post-list');

    if (editor) {
        editor.addEventListener('input', () => {
            if (preview) preview.innerHTML = editor.value.replace(/\n/g, '<br>');
        });
    }

    if (saveBtn) {
        saveBtn.addEventListener('click', async () => {
            if (!token) { showToast('Нет авторизации'); return; }
            const title = document.getElementById('post-title').value.trim();
            const slug = document.getElementById('post-slug').value.trim();
            const content = editor.value.trim();
            if (!title || !slug || !content) { showToast('Заполните все поля'); return; }
            saveBtn.disabled = true;
            saveBtn.textContent = 'Сохранение...';
            try {
                const resp = await fetch(`${BLOG_API_URL}/api/posts`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ title, slug, content }),
                });
                if (resp.ok) {
                    showToast('Опубликовано');
                    document.getElementById('post-title').value = '';
                    document.getElementById('post-slug').value = '';
                    editor.value = '';
                    if (preview) preview.innerHTML = '';
                    loadPosts();
                } else {
                    const err = await resp.text();
                    showToast('Ошибка: ' + err);
                }
            } catch (e) {
                showToast('Ошибка: ' + e.message);
            }
            saveBtn.disabled = false;
            saveBtn.textContent = 'Опубликовать';
        });
    }

    async function loadPosts() {
        if (!postList) return;
        try {
            const resp = await fetch(`${BLOG_API_URL}/api/posts`);
            const posts = await resp.json();
            postList.innerHTML = '';
            if (posts.length === 0) { postList.innerHTML = '<div style="color:var(--white-muted);font-size:13px">Нет постов</div>'; return; }
            for (const p of posts) {
                const div = document.createElement('div');
                div.className = 'blog-card';
                div.innerHTML = `
                    <div class="blog-card-title">${escapeHtml(p.title)}</div>
                    <div class="blog-card-excerpt">${escapeHtml(p.content.substring(0, 200))}${p.content.length > 200 ? '...' : ''}</div>
                    <div class="blog-card-meta">${new Date(p.created_at).toLocaleString('ru-RU')}</div>
                `;
                div.addEventListener('click', () => {
                    document.getElementById('post-title').value = p.title;
                    document.getElementById('post-slug').value = p.slug;
                    editor.value = p.content;
                    if (preview) preview.innerHTML = p.content.replace(/\n/g, '<br>');
                });
                postList.appendChild(div);
            }
        } catch {}
    }

    if (loadBtn) loadBtn.addEventListener('click', loadPosts);
    loadPosts();

    // -- OAuth --
    const oauthBtn = document.getElementById('gh-login');
    if (oauthBtn) {
        if (token) { oauthBtn.textContent = '✅ GitHub'; oauthBtn.disabled = true; }
        oauthBtn.addEventListener('click', () => {
            const clientId = 'Ov23liQkpqhGrtqF4sv6';
            const redirect = location.origin + location.pathname + '#/admin';
            window.location.href = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirect}&scope=repo`;
        });
    }

    // -- ttyd --
    const ttydFrame = document.getElementById('ttyd-frame');
    if (ttydFrame) {
        const connectBtn = document.getElementById('ttyd-connect');
        if (connectBtn) {
            connectBtn.addEventListener('click', () => {
                const host = document.getElementById('ttyd-host').value || '192.168.2.1';
                const port = document.getElementById('ttyd-port').value || '7681';
                ttydFrame.src = `http://${host}:${port}/`;
                ttydFrame.style.display = 'block';
            });
        }
    }

    // -- IP tools --
    const ipBtn = document.getElementById('ip-lookup');
    const ipResult = document.getElementById('ip-result');
    if (ipBtn) {
        ipBtn.addEventListener('click', async () => {
            const ip = document.getElementById('ip-input').value.trim();
            if (!ip) return;
            ipBtn.disabled = true;
            ipResult.textContent = 'Поиск...';
            try {
                const proxyUrl = 'https://spare-macaque-5540.svoboda.deno.net/api/proxy';
                const target = `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,message,country,regionName,city,isp,org,as,proxy,hosting,query`;
                const resp = await fetch(`${proxyUrl}?url=${encodeURIComponent(target)}`);
                const text = await resp.text();
                let data;
                try { data = JSON.parse(text); } catch { data = { status: 'fail', message: text }; }
                if (data.body !== undefined) {
                    try { data = JSON.parse(data.body); } catch { data = { status: 'fail', message: data.body }; }
                }
                ipResult.textContent = JSON.stringify(data, null, 2);
            } catch (e) {
                ipResult.textContent = 'Ошибка: ' + e.message;
            }
            ipBtn.disabled = false;
        });
    }

    // -- Speed test (speedometer) --
    const speedBtn = document.getElementById('speed-test');
    if (speedBtn) {
        const speedCanvas = document.getElementById('speed-canvas');
        const speedVal = document.getElementById('speed-value');
        const speedUnit = document.getElementById('speed-unit');

        speedBtn.addEventListener('click', () => {
            if (!speedCanvas || !speedVal || !speedUnit) return;
            const ctx = speedCanvas.getContext('2d');
            const w = speedCanvas.width = 280, h = speedCanvas.height = 280;
            const cx = w / 2, cy = h / 2, r = 110;
            let angle = 0;
            speedVal.textContent = '0';
            speedUnit.textContent = 'Mbps';

            const interval = setInterval(() => {
                angle += 0.02;
                if (angle > Math.PI * 1.5) { clearInterval(interval); speedBtn.disabled = false; return; }
                const speed = Math.round((angle / (Math.PI * 1.5)) * 500);
                speedVal.textContent = speed;
                ctx.clearRect(0, 0, w, h);

                ctx.strokeStyle = 'rgba(255,215,0,0.1)';
                ctx.lineWidth = 12;
                ctx.beginPath();
                ctx.arc(cx, cy, r, 0.75 * Math.PI, 2.25 * Math.PI);
                ctx.stroke();

                const grad = ctx.createLinearGradient(0, 0, w, h);
                grad.addColorStop(0, '#22c55e');
                grad.addColorStop(0.5, '#FFD700');
                grad.addColorStop(1, '#ef4444');
                ctx.strokeStyle = grad;
                ctx.beginPath();
                ctx.arc(cx, cy, r, 0.75 * Math.PI, 0.75 * Math.PI + angle);
                ctx.stroke();

                ctx.fillStyle = 'var(--white)';
                ctx.font = 'bold 14px monospace';
                ctx.textAlign = 'center';
                ctx.fillText('DOWNLOAD', cx, cy + 60);
            }, 30);
        });
    }
}
