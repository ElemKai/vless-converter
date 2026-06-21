function initCheckerTabs() {}

function checkServers() {
    const input = document.getElementById('vless-input');
    const text = input?.value.trim();
    if (!text) { setStatus('statusBar', 'Введите VLESS ссылки', 'err'); return; }
    const links = text.split('\n').map(l => l.trim()).filter(l => l.startsWith('vless://'));
    if (links.length === 0) { setStatus('statusBar', 'Нет VLESS ссылок', 'err'); return; }
    const timeout = parseInt(document.getElementById('timeout-input')?.value || '5000');
    const parallel = parseInt(document.getElementById('parallel-input')?.value || '5');
    setStatus('statusBar', `Проверка ${links.length} серверов...`, 'ok');
    document.getElementById('result-section').style.display = 'block';

    let online = 0, offline = 0, totalPing = 0, pingCount = 0;
    const results = [];
    let completed = 0;

    const updateStats = () => {
        document.getElementById('online-count').textContent = online;
        document.getElementById('offline-count').textContent = offline;
        document.getElementById('avg-ping').textContent = pingCount > 0 ? Math.round(totalPing / pingCount) + 'ms' : '-';
        renderResults(results);
    };

    const checkOne = async (link) => {
        const parsed = parseVlessLink(link);
        if (!parsed) { offline++; completed++; updateStats(); return; }
        const start = Date.now();
        try {
            const controller = new AbortController();
            const id = setTimeout(() => controller.abort(), timeout);
            const r = await fetch(`https://${parsed.host}:${parsed.port || 443}`, {
                method: 'HEAD', signal: controller.signal, mode: 'no-cors',
            });
            clearTimeout(id);
            const ping = Date.now() - start;
            online++;
            totalPing += ping;
            pingCount++;
            results.push({ link, name: parsed.name || parsed.host, host: parsed.host, ping, status: 'online', type: parsed.type || 'tcp' });
        } catch {
            offline++;
            results.push({ link, name: parsed.name || parsed.host, host: parsed.host, ping: null, status: 'offline', type: parsed.type || 'tcp' });
        }
        completed++;
        updateStats();
    };

    const runBatch = async () => {
        for (let i = 0; i < links.length; i += parallel) {
            const batch = links.slice(i, i + parallel);
            await Promise.all(batch.map(checkOne));
        }
        setStatus('statusBar', `Готово: ${online} онлайн, ${offline} офлайн`, online > 0 ? 'ok' : 'err');
    };
    runBatch();
}

function parseVlessLink(link) {
    try {
        const u = new URL(link);
        return {
            host: u.hostname, port: parseInt(u.port) || 443,
            name: u.hash?.replace('#', '') || u.hostname,
            type: u.searchParams.get('type') || 'tcp',
        };
    } catch { return null; }
}

function renderResults(results) {
    const table = document.getElementById('results-table');
    if (!table) return;
    table.innerHTML = `<table class="checker-table">
        <thead><tr><th></th><th>Сервер</th><th>Хост</th><th>Пинг</th><th>Тип</th></tr></thead>
        <tbody>${results.map(r => `
            <tr class="${r.status === 'online' ? 'status-online' : 'status-offline'}">
                <td class="status-cell">${r.status === 'online' ? '●' : '○'}</td>
                <td><div class="server-name">${escapeHtml(r.name)}</div></td>
                <td><div class="server-host">${escapeHtml(r.host)}</div></td>
                <td class="ping-cell">${r.ping !== null ? r.ping + 'ms' : '—'}</td>
                <td class="type-cell">${escapeHtml(r.type)}</td>
            </tr>`).join('')}
        </tbody>
    </table>`;
}

function copyResults() {
    const rows = document.querySelectorAll('#results-table .checker-table tbody tr');
    const text = Array.from(rows).map(r => {
        const cells = r.querySelectorAll('td');
        return `${cells[0]?.textContent} ${cells[1]?.textContent} ${cells[2]?.textContent} ${cells[3]?.textContent}`;
    }).join('\n');
    navigator.clipboard.writeText(text || 'Нет данных');
}
function exportResults() {
    const rows = document.querySelectorAll('#results-table .checker-table tbody tr');
    const csv = 'Status,Server,Host,Ping,Type\n' + Array.from(rows).map(r => {
        const cells = r.querySelectorAll('td');
        return `${cells[0]?.textContent},${cells[1]?.textContent},${cells[2]?.textContent},${cells[3]?.textContent},${cells[4]?.textContent}`;
    }).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'checker-results.csv';
    a.click();
}
