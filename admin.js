function initAdmin() {
    if (initAdmin._done) return;
    initAdmin._done = true;

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
                if (!resp.ok) { ipResult.textContent = 'Ошибка прокси: ' + (resp.status === 502 ? 'сервер недоступен' : resp.status); return; }
                let data;
                try { data = JSON.parse(text); } catch { ipResult.textContent = 'Ошибка: невалидный ответ'; return; }
                if (data.error) { ipResult.textContent = 'Ошибка: ' + data.error; return; }
                if (data.body !== undefined) {
                    try { data = JSON.parse(data.body); } catch { ipResult.textContent = 'Ошибка: ' + data.body; return; }
                }
                ipResult.textContent = JSON.stringify(data, null, 2);
            } catch (e) {
                ipResult.textContent = 'Ошибка: ' + e.message;
            }
            ipBtn.disabled = false;
        });
    }

    // -- Speed test (Яндекс.Интернетометр style) --
    const speedBtn = document.getElementById('speed-test');
    if (speedBtn) {
        const canvas = document.getElementById('speed-canvas');
        const pingEl = document.getElementById('speed-ping');
        const dlEl = document.getElementById('speed-dl');
        const ipEl = document.getElementById('speed-ip');

        function drawGauge(ctx, w, h, cx, cy, r, fraction, label, sublabel) {
            ctx.clearRect(0, 0, w, h);
            ctx.strokeStyle = 'rgba(255,215,0,0.08)';
            ctx.lineWidth = 14;
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0.75 * Math.PI, 2.25 * Math.PI);
            ctx.stroke();
            const grad = ctx.createLinearGradient(0, 0, w, h);
            grad.addColorStop(0, '#22c55e');
            grad.addColorStop(0.5, '#FFD700');
            grad.addColorStop(1, '#ef4444');
            ctx.strokeStyle = grad;
            ctx.lineWidth = 14;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0.75 * Math.PI, 0.75 * Math.PI + fraction * 1.5 * Math.PI);
            ctx.stroke();
            if (label) {
                ctx.fillStyle = 'var(--white)';
                ctx.font = 'bold 28px monospace';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(label, cx, cy - 6);
            }
            if (sublabel) {
                ctx.fillStyle = 'var(--white-muted)';
                ctx.font = '12px monospace';
                ctx.textBaseline = 'middle';
                ctx.fillText(sublabel, cx, cy + 24);
            }
        }

        async function lookupIP() {
            try {
                const target = 'http://ip-api.com/json/?fields=query,isp,org';
                const proxyUrl = 'https://spare-macaque-5540.svoboda.deno.net/api/proxy';
                const resp = await fetch(`${proxyUrl}?url=${encodeURIComponent(target)}`);
                const text = await resp.text();
                const d = JSON.parse(text);
                const body = typeof d.body === 'string' ? JSON.parse(d.body) : d;
                if (body.query) {
                    const parts = [body.query];
                    if (body.isp) parts.push(body.isp);
                    if (body.org && body.org !== body.isp) parts.push(body.org);
                    ipEl.textContent = parts.join(' · ');
                }
            } catch {}
        }

        speedBtn.addEventListener('click', async () => {
            speedBtn.disabled = true;
            speedBtn.textContent = '⏳ Тестирование...';
            pingEl.textContent = '...';
            dlEl.textContent = '...';
            ipEl.textContent = '';

            const ctx = canvas.getContext('2d');
            const w = 300, h = 170;
            canvas.width = w; canvas.height = h;
            const cx = w / 2, cy = h - 10, r = 68;
            drawGauge(ctx, w, h, cx, cy, r, 0, '', '');

            const MAX_MBPS = 1000;

            // 1. Ping
            try {
                drawGauge(ctx, w, h, cx, cy, r, 0, '...', 'Пинг');
                let pingTotal = 0;
                for (let i = 0; i < 5; i++) {
                    const t = performance.now();
                    await fetch(`https://speed.cloudflare.com/__down?bytes=100&t=${Date.now()}${i}`);
                    pingTotal += performance.now() - t;
                }
                const pingMs = Math.round(pingTotal / 5);
                pingEl.textContent = pingMs + ' ms';
                drawGauge(ctx, w, h, cx, cy, r, 0.05, pingMs + ' ms', 'Пинг');
            } catch { pingEl.textContent = 'ERR'; }

            // 2. Download (10MB)
            try {
                drawGauge(ctx, w, h, cx, cy, r, 0, '...', 'Загрузка');
                const dlBytes = 10 * 1024 * 1024;
                const dlStart = performance.now();
                const dlResp = await fetch(`https://speed.cloudflare.com/__down?bytes=${dlBytes}&t=${Date.now()}`);
                const dlReader = dlResp.body.getReader();
                let received = 0;
                while (true) {
                    const { done, value } = await dlReader.read();
                    if (done) break;
                    received += value.length;
                    const el = (performance.now() - dlStart) / 1000;
                    const m = (received * 8) / el / 1e6;
                    drawGauge(ctx, w, h, cx, cy, r, Math.min(m / MAX_MBPS, 1), Math.round(m), 'Мбит/с');
                }
                const dlElapsed = (performance.now() - dlStart) / 1000;
                const dlMbps = (received * 8) / dlElapsed / 1e6;
                dlEl.textContent = dlMbps.toFixed(1) + ' Mbps';
                drawGauge(ctx, w, h, cx, cy, r, Math.min(dlMbps / MAX_MBPS, 1), Math.round(dlMbps), 'Мбит/с ↓');
            } catch { dlEl.textContent = 'ERR'; }

            lookupIP();

            speedBtn.textContent = '🔄 Повторить';
            speedBtn.disabled = false;
        });
    }
}
