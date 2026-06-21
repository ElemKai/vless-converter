let converterResult = [];

function initConverter() {
    const input = document.getElementById('conv-url');
    if (input) {
        try { const saved = sessionStorage.getItem('conv_url'); if (saved) input.value = saved; } catch {}
    }
}

function saveConvUrl() {
    const el = document.getElementById('conv-url');
    if (!el) return;
    try { sessionStorage.setItem('conv_url', el.value.trim()); } catch {}
}

async function convertSubscription() {
    const input = document.getElementById('conv-url');
    const format = document.getElementById('conv-format')?.value || 'vless';
    const resultSection = document.getElementById('conv-result-section');
    const resultDiv = document.getElementById('conv-result');

    if (!input || !resultSection || !resultDiv) return;

    const url = input.value.trim();
    if (!url) { setStatus('conv-status', 'Введите URL подписки', 'err'); return; }

    const useLocal = document.getElementById('conv-local-proxy')?.checked;

    setStatus('conv-status', 'Загрузка подписки...', 'ok');
    resultSection.style.display = 'none';
    resultDiv.innerHTML = '';
    converterResult = [];

    let text;
    let userInfo, profileTitle;

    if (useLocal) {
        // Use local Python proxy (residential IP — not blocked)
        try {
            const ws = new WebSocket('ws://127.0.0.1:8888?mode=fetch');
            const result = await new Promise((resolve, reject) => {
                ws.onopen = () => ws.send(JSON.stringify({ url }));
                ws.onmessage = e => resolve(JSON.parse(e.data));
                ws.onerror = () => reject(new Error('ws://127.0.0.1:8888 недоступен. Запустите: python ssh-proxy.py'));
                setTimeout(() => { if (ws.readyState <= 1) { ws.close(); reject(new Error('Таймаут')); } }, 15000);
            });
            if (result.error) throw new Error(result.error);
            if (result.status >= 400) throw new Error(`HTTP ${result.status}`);
            text = result.body;
            if (result.headers) {
                userInfo = result.headers['subscription-userinfo'] || '';
                profileTitle = result.headers['profile-title'] || '';
            }
        } catch (e) {
            resultDiv.innerHTML = `<p style="color:var(--red);">Локальный прокси: ${escapeHtml(e.message)}</p>
                <p style="color:var(--white-muted);font-size:13px;">Запустите: <code style="background:rgba(255,255,255,0.1);padding:2px 6px;border-radius:3px;">python ssh-proxy.py</code></p>`;
            resultSection.style.display = 'block';
            setStatus('conv-status', 'Ошибка локального прокси', 'err');
            return;
        }
    } else {
        const apiUrl = getBlogApiUrl();
        const proxyUrl = `${apiUrl}/?url=${encodeURIComponent(url)}`;

        try {
            const resp = await fetch(proxyUrl);
            if (!resp.ok) {
                const body = await resp.text();
                if (resp.status === 403) {
                    resultDiv.innerHTML = `<p style="color:var(--red);">HTTP 403 — провайдер блокирует запросы с дата-центра Deno Deploy.</p>
                        <p style="color:var(--white-muted);font-size:13px;margin-top:8px;">✅ Включите <strong>"Локальный прокси"</strong> ниже и запустите <code style="background:rgba(255,255,255,0.1);padding:2px 6px;border-radius:3px;">python ssh-proxy.py</code></p>`;
                    resultSection.style.display = 'block';
                    setStatus('conv-status', 'Блокировка провайдера', 'err');
                    return;
                }
                throw new Error(`HTTP ${resp.status}: ${body.substring(0, 200)}`);
            }
            text = await resp.text();
            userInfo = resp.headers.get('subscription-userinfo');
            profileTitle = resp.headers.get('profile-title');
        } catch (e) {
            resultDiv.innerHTML = `<p style="color:var(--red);">Ошибка: ${escapeHtml(e.message)}</p>`;
            resultSection.style.display = 'block';
            setStatus('conv-status', 'Ошибка загрузки', 'err');
            return;
        }
    }

    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    for (const line of lines) {
        if (line.startsWith('vless://')) {
            converterResult.push(line);
        }
    }

    if (converterResult.length === 0) {
        try {
            const decoded = atob(text.replace(/\s/g, ''));
            const decodedLines = decoded.split('\n').map(l => l.trim()).filter(Boolean);
            for (const line of decodedLines) {
                if (line.startsWith('vless://')) converterResult.push(line);
            }
        } catch {}
    }

    if (converterResult.length === 0) {
        resultDiv.innerHTML = '<p style="color:var(--red);">Не найдено VLESS ссылок в подписке</p>';
        resultSection.style.display = 'block';
        setStatus('conv-status', 'Не найдено VLESS ссылок', 'err');
        return;
    }

    let html = '';
    if (userInfo) {
        const parts = Object.fromEntries(userInfo.split(';').map(s => {
            const [k, v] = s.trim().split('=');
            return [k, v];
        }));
        html += `<div style="margin-bottom:12px;font-size:12px;color:var(--white-muted);">
            📊 Использовано: ${formatBytes(parts.upload || 0)} ↑ / ${formatBytes(parts.download || 0)} ↓
            ${parts.total ? `· Всего: ${formatBytes(parts.total)}` : ''}
            ${parts.expire ? `· Истекает: ${new Date(parts.expire * 1000).toLocaleDateString()}` : ''}
        </div>`;
    }
    if (profileTitle) {
        html += `<div style="margin-bottom:12px;font-size:13px;color:var(--gold);">📁 ${escapeHtml(decodeURIComponent(profileTitle))}</div>`;
    }
    html += `<div style="margin-bottom:8px;font-size:12px;color:var(--white-muted);">Найдено серверов: ${converterResult.length}</div>`;
    html += '<div class="vless-list">';

    for (const link of converterResult) {
        const parsed = parseVlessLink(link);
        html += `<div class="vless-item" onclick="copyVless('${escapeHtml(link)}')" title="Нажмите чтобы скопировать">
            <div class="vless-remark">${escapeHtml(parsed.remark || 'Без имени')}</div>
            <div style="color:var(--white-muted);font-size:11px;">${escapeHtml(parsed.server || '')} · ${parsed.port || ''}</div>
            <div style="color:var(--white-muted);font-size:11px;">${parsed.type || ''} · ${parsed.network || ''}${parsed.security ? ' · ' + parsed.security : ''}${parsed.encryption ? ' · ' + parsed.encryption : ''}</div>
        </div>`;
    }

    html += '</div>';
    html += `<div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap;">
        <button class="btn btn-ghost" onclick="copyAllVless()" style="font-size:12px;">[ Копировать все ]</button>
        <button class="btn btn-ghost" onclick="exportClash()" style="font-size:12px;">[ Koala Clash YAML ]</button>
        <button class="btn btn-ghost" onclick="exportHapp()" style="font-size:12px;">[ Happ JSON ]</button>
    </div>`;

    resultDiv.innerHTML = html;
    resultSection.style.display = 'block';
    setStatus('conv-status', `Готово: ${converterResult.length} серверов`, 'ok');
}

function parseVlessLink(link) {
    try {
        const u = new URL(link);
        const params = Object.fromEntries(u.searchParams.entries());
        const hash = u.hash.replace(/^#/, '');
        return {
            id: u.username,
            server: u.hostname,
            port: u.port,
            encryption: params.encryption || 'none',
            type: params.type || 'tcp',
            network: params.network || 'tcp',
            security: params.security || '',
            remark: decodeURIComponent(hash) || decodeURIComponent(u.searchParams.get('remark') || ''),
        };
    } catch {
        return { remark: link.substring(0, 60) };
    }
}

function formatBytes(bytes) {
    const n = parseInt(bytes);
    if (isNaN(n)) return bytes;
    if (n >= 1e12) return (n / 1e12).toFixed(1) + ' TB';
    if (n >= 1e9) return (n / 1e9).toFixed(1) + ' GB';
    if (n >= 1e6) return (n / 1e6).toFixed(1) + ' MB';
    if (n >= 1e3) return (n / 1e3).toFixed(1) + ' KB';
    return n + ' B';
}

function copyVless(link) {
    navigator.clipboard.writeText(link).then(() => {
        showToast('✓ VLESS скопирована');
    }).catch(() => {
        prompt('Копировать вручную:', link);
    });
}

function copyAllVless() {
    const all = converterResult.join('\n');
    navigator.clipboard.writeText(all).then(() => {
        showToast(`✓ ${converterResult.length} VLESS скопировано`);
    }).catch(() => {
        prompt('Копировать вручную:', all);
    });
}

function exportClash() {
    let yaml = 'proxies:\n';
    for (const link of converterResult) {
        const p = parseVlessLink(link);
        const name = (p.remark || 'server').replace(/[^a-zA-Z0-9_\-\u0400-\u04FF]/g, '_');
        yaml += `  - name: ${name}\n    type: vless\n    server: ${p.server || '127.0.0.1'}\n    port: ${p.port || 443}\n    uuid: ${p.id || ''}\n    encryption: ${p.encryption || 'none'}\n`;
        if (p.network === 'ws' || p.network === 'websocket') {
            yaml += `    network: ws\n    ws-opts:\n      path: "${p.searchParams?.path || '/'}"\n      headers:\n        Host: "${p.server}"\n`;
        } else {
            yaml += `    network: ${p.network || 'tcp'}\n`;
        }
        if (p.security === 'reality') yaml += '    reality: true\n';
        if (p.security === 'tls') yaml += '    tls: true\n    skip-cert-verify: true\n';
    }
    downloadText(yaml, 'clash-config.yaml', 'text/yaml');
}

function exportHapp() {
    const servers = converterResult.map(link => {
        const p = parseVlessLink(link);
        return {
            name: p.remark || 'Server',
            server: p.server,
            port: parseInt(p.port) || 443,
            uuid: p.id || '',
            encryption: p.encryption || 'none',
            network: p.network || 'tcp',
            security: p.security || '',
        };
    });
    const json = JSON.stringify({ version: 2, servers }, null, 2);
    downloadText(json, 'happ-config.json', 'application/json');
}

function downloadText(text, filename, mime) {
    const blob = new Blob([text], { type: mime });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
}
