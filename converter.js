let results = [];

function initConverterTabs() {
    document.querySelector('#subscription-file')?.addEventListener('change', handleFileSelect);
    setupFileDropZone();
}
function handleFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;
    setStatus('statusBar', 'Чтение файла...', 'ok');
    const reader = new FileReader();
    reader.onload = ev => {
        document.getElementById('subscription-raw').value = ev.target.result;
        setStatus('statusBar', 'Файл загружен. Нажмите Обработать.', 'ok');
    };
    reader.readAsText(file);
}
function setupFileDropZone() {
    const zone = document.getElementById('file-drop-zone');
    if (!zone) return;
    zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('dragover'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
    zone.addEventListener('drop', e => {
        e.preventDefault();
        zone.classList.remove('dragover');
        const file = e.dataTransfer.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = ev => {
                document.getElementById('subscription-raw').value = ev.target.result;
                setStatus('statusBar', 'Файл загружен.', 'ok');
            };
            reader.readAsText(file);
        }
    });
}
function loadSubscription() {
    const url = document.getElementById('subscription-url').value.trim();
    if (!url) { setStatus('statusBar', 'Введите URL подписки', 'err'); return; }
    setStatus('statusBar', 'Загрузка...', 'ok');
    fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`)
        .then(r => r.ok ? r.text() : Promise.reject('HTTP ' + r.status))
        .then(text => {
            document.getElementById('subscription-raw').value = text;
            setStatus('statusBar', 'Загружено. Нажмите Обработать.', 'ok');
        })
        .catch(() => setStatus('statusBar', 'Ошибка загрузки. Попробуйте вручную.', 'err'));
}
function parseSubscriptionManual() {
    const raw = document.getElementById('subscription-raw').value.trim();
    if (!raw) { setStatus('statusBar', 'Нет данных', 'err'); return; }
    setStatus('statusBar', 'Парсинг...', 'ok');
    const links = extractVlessLinks(raw);
    displayResults(links);
}
function convert() {
    const koala = document.getElementById('koala-input')?.value.trim();
    const happ = document.getElementById('happ-input')?.value.trim();
    if (!koala && !happ) { setStatus('statusBar', 'Нет данных для конвертации', 'err'); return; }
    setStatus('statusBar', 'Конвертация...', 'ok');
    let links = [];
    if (koala) links = links.concat(parseKoalaYaml(koala));
    if (happ) links = links.concat(parseHappJson(happ));
    displayResults(links);
}
function extractVlessLinks(text) {
    const links = [];
    const vlessRe = /vless:\/\/[^\s<>"']+/g;
    let m;
    while ((m = vlessRe.exec(text)) !== null) links.push(m[0]);
    if (links.length === 0) {
        try {
            const decoded = atob(text);
            const m2 = decoded.match(vlessRe);
            if (m2) links.push(...m2);
        } catch {}
    }
    if (links.length === 0) {
        try {
            const json = JSON.parse(text);
            const extract = (obj) => {
                if (!obj || typeof obj !== 'object') return;
                if (obj.vless || obj.vmess) links.push(obj.vless || obj.vmess);
                Object.values(obj).forEach(v => extract(v));
            };
            extract(json);
        } catch {}
    }
    return links;
}
function parseKoalaYaml(text) {
    const links = [];
    const vlessRe = /vless:\/\/[^\s<>"']+/g;
    const m = text.match(vlessRe);
    if (m) links.push(...m);
    return links;
}
function parseHappJson(text) {
    const links = [];
    try {
        const json = JSON.parse(text);
        const walk = (obj) => {
            if (!obj || typeof obj !== 'object') return;
            if (obj.protocol === 'vless' && obj.settings?.vnext) {
                obj.settings.vnext.forEach(vn => {
                    (vn.users || []).forEach(u => {
                        const p = obj.port || 443;
                        const s = obj.streamSettings || {};
                        const params = new URLSearchParams({
                            type: s.network || 'tcp', security: obj.security || 'tls', flow: u.flow || '',
                            fp: s.fingerprint || '', pbk: s.realitySettings?.publicKey || '',
                            sid: s.realitySettings?.shortId || '',
                            sni: s.realitySettings?.serverName || s.tlsSettings?.serverName || '',
                        });
                        const link = `vless://${u.id}@${vn.address}:${p}?${params}#${vn.address}`;
                        links.push(link);
                    });
                });
            }
            Object.values(obj).forEach(v => walk(v));
        };
        walk(json);
    } catch {}
    return links;
}
function displayResults(linkList) {
    results = linkList;
    const section = document.getElementById('result-section');
    const list = document.getElementById('results-list');
    const count = document.getElementById('result-count');
    if (!section || !list) return;
    if (results.length === 0) {
        setStatus('statusBar', 'VLESS-ссылки не найдены', 'err');
        return;
    }
    setStatus('statusBar', `Найдено: ${results.length}`, 'ok');
    section.style.display = 'block';
    count.textContent = `Найдено: ${results.length} ссылок`;
    list.innerHTML = results.map((link, i) => {
        const name = link.split('#')[1] || `Server ${i + 1}`;
        return `<div class="result-item">
            <div class="result-item-header">
                <span class="result-item-name">${escapeHtml(name)}</span>
                <button class="copy-item-btn" onclick="copyItem(${i})">[ Копировать ]</button>
            </div>
            <textarea class="result-item-link" readonly>${escapeHtml(link)}</textarea>
        </div>`;
    }).join('');
}
function copyItem(i) {
    if (results[i] === undefined) return;
    navigator.clipboard.writeText(results[i]).then(() => {
        const btn = document.querySelectorAll('.copy-item-btn')[i];
        if (btn) { btn.textContent = '[ Скопировано ]'; setTimeout(() => btn.textContent = '[ Копировать ]', 2000); }
    });
}
function copyAll() {
    navigator.clipboard.writeText(results.join('\n'));
    const btn = document.querySelector('.result-actions .btn-ghost');
    if (btn) { btn.textContent = '[ Скопировано ]'; setTimeout(() => btn.textContent = '[ Копировать все ]', 2000); }
}
function downloadAll() {
    const blob = new Blob([results.join('\n')], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'vless-links.txt';
    a.click();
}
function clearAll() {
    results = [];
    document.getElementById('result-section').style.display = 'none';
    document.getElementById('subscription-raw').value = '';
    setStatus('statusBar', 'очищено', '');
}
function clearChecker() { document.getElementById('vless-input').value = ''; setStatus('statusBar', 'очищено', ''); }
function toggleDebug() {
    const panel = document.getElementById('debug-panel');
    const text = document.getElementById('debug-toggle-text');
    if (!panel) return;
    const show = panel.style.display !== 'block';
    panel.style.display = show ? 'block' : 'none';
    if (text) text.textContent = show ? '▼ Скрыть диагностику' : '▶ Показать диагностику';
}
