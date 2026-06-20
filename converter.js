// Глобальные переменные
let currentResults = [];
let currentTab = 'subscription';
let lastDebugInfo = {};

// CORS прокси
const CORS_PROXIES = {
    'custom': (url, customProxyUrl) => `${customProxyUrl}?url=${encodeURIComponent(url)}`,
    'corsproxy.io': url => `https://corsproxy.io/?url=${encodeURIComponent(url)}`,
    'allorigins.win': url => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    'allorigins.json': url => `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
    'cors.eu.org': url => `https://cors.eu.org/${url}`,
    'thingproxy': url => `https://thingproxy.freeboard.io/fetch/${url}`,
    'codetabs.com': url => `https://api.codetabs.com/v1/proxy/?quest=${encodeURIComponent(url)}`,
    'none': url => url
};

const PROXY_ORDER = ['corsproxy.io', 'allorigins.win', 'thingproxy', 'cors.eu.org', 'codetabs.com'];

// ==================== ИНИЦИАЛИЗАЦИЯ ====================

function initTabs() {
    console.log('[INIT] Инициализация вкладок');
    
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const tabName = this.dataset.tab;
            currentTab = tabName;
            
            console.log('[TAB] Клик на вкладку:', tabName, 'currentTab теперь:', currentTab);
            
            // Обновляем активную вкладку
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            // Показываем соответствующий контент
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            const tabContent = document.getElementById(tabName);
            if (tabContent) {
                tabContent.classList.add('active');
                console.log('[TAB] Контент показан:', tabName);
            } else {
                console.error('[TAB] Контент не найден для:', tabName);
            }
            
            // Показываем/скрываем кнопку конвертации
            const mainConvertRow = document.getElementById('main-convert-row');
            if (mainConvertRow) {
                if (tabName === 'subscription') {
                    mainConvertRow.style.display = 'none';
                } else {
                    mainConvertRow.style.display = 'block';
                }
            }
        });
    });
    
    // Скрываем кнопку при загрузке (активна вкладка subscription)
    const mainConvertRow = document.getElementById('main-convert-row');
    if (mainConvertRow) {
        mainConvertRow.style.display = 'none';
    }
    
    console.log('[INIT] Вкладки инициализированы. currentTab:', currentTab);
}

function initCustomProxy() {
    const proxySelect = document.getElementById('cors-proxy');
    const customBlock = document.getElementById('custom-proxy-block');
    
    if (proxySelect && customBlock) {
        proxySelect.addEventListener('change', function() {
            if (this.value === 'custom') {
                customBlock.style.display = 'block';
            } else {
                customBlock.style.display = 'none';
            }
        });
    }
}

function initFileUpload() {
    const dropZone = document.getElementById('file-drop-zone');
    const fileInput = document.getElementById('subscription-file');
    
    if (!dropZone || !fileInput) return;
    
    dropZone.addEventListener('click', (e) => {
        if (e.target.tagName !== 'INPUT' && !e.target.closest('.file-select-btn')) {
            fileInput.click();
        }
    });
    
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFile(e.target.files[0]);
        }
    });
    
    ['dragenter', 'dragover'].forEach(event => {
        dropZone.addEventListener(event, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.add('dragover');
        });
    });
    
    ['dragleave', 'drop'].forEach(event => {
        dropZone.addEventListener(event, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.remove('dragover');
        });
    });
    
    dropZone.addEventListener('drop', (e) => {
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFile(files[0]);
        }
    });
}

// Запуск
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initTabs();
        initCustomProxy();
        initFileUpload();
    });
} else {
    initTabs();
    initCustomProxy();
    initFileUpload();
}

// ==================== СТАТУС И DEBUG ====================

function setStatus(type, text) {
    const sb = document.getElementById('statusBar');
    if (!sb) return;
    sb.className = 'status-bar ' + type;
    document.getElementById('statusText').textContent = text;
}

function updateDebug(stage, data) {
    lastDebugInfo[stage] = data;
    renderDebug();
}

function renderDebug() {
    const content = document.getElementById('debug-content');
    if (!content) return;
    
    let html = '';
    for (const [stage, data] of Object.entries(lastDebugInfo)) {
        html += `<div class="debug-line"><span class="debug-key">[${stage}]</span></div>`;
        if (typeof data === 'string') {
            html += `<div class="debug-line" style="padding-left:12px;">${escapeHtml(data)}</div>`;
        } else if (data && data.error) {
            html += `<div class="debug-line debug-error" style="padding-left:12px;">❌ ${escapeHtml(data.error)}</div>`;
        } else if (data && typeof data === 'object') {
            for (const [key, value] of Object.entries(data)) {
                const displayValue = typeof value === 'string' && value.length > 200 
                    ? value.substring(0, 200) + '...' 
                    : String(value);
                html += `<div class="debug-line" style="padding-left:12px;"><span class="debug-key">${key}:</span> <span class="debug-value">${escapeHtml(displayValue)}</span></div>`;
            }
        }
        html += `<div class="debug-line">&nbsp;</div>`;
    }
    
    content.innerHTML = html || 'Нет данных';
}

function toggleDebug() {
    const panel = document.getElementById('debug-panel');
    const text = document.getElementById('debug-toggle-text');
    if (panel.style.display === 'none') {
        panel.style.display = 'block';
        text.textContent = '▼ Скрыть диагностику';
    } else {
        panel.style.display = 'none';
        text.textContent = '▶ Показать диагностику';
    }
}

// ==================== ЗАГРУЗКА ПО URL ====================

async function loadSubscription() {
    const url = document.getElementById('subscription-url').value.trim();
    if (!url) {
        setStatus('err', '[ ERROR ] введите URL подписки');
        return;
    }
    
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        setStatus('err', '[ ERROR ] URL должен начинаться с http:// или https://');
        return;
    }
    
    const proxyChoice = document.getElementById('cors-proxy').value;
    
    lastDebugInfo = {};
    updateDebug('start', { url: url, proxy: proxyChoice });
    
    setStatus('', '[ INFO ] загрузка...');
    
    let proxiesToTry = [];
    let customProxyUrl = null;
    
    if (proxyChoice === 'custom') {
        customProxyUrl = document.getElementById('custom-proxy-url').value.trim();
        if (!customProxyUrl) {
            setStatus('err', '[ ERROR ] введите URL вашего Worker');
            return;
        }
        if (!customProxyUrl.startsWith('http')) {
            setStatus('err', '[ ERROR ] URL Worker должен начинаться с http:// или https://');
            return;
        }
        customProxyUrl = customProxyUrl.replace(/\/$/, '');
        proxiesToTry = ['custom'];
        updateDebug('custom_proxy', { url: customProxyUrl, hint: 'Happ-эмуляция' });
    } else if (proxyChoice === 'auto') {
        proxiesToTry = [...PROXY_ORDER];
    } else if (proxyChoice === 'none') {
        proxiesToTry = ['none'];
    } else {
        proxiesToTry = [proxyChoice];
    }
    
    let lastError = null;
    let content = null;
    let usedProxy = null;
    
    for (const proxyName of proxiesToTry) {
        try {
            setStatus('', `[ INFO ] попытка через ${proxyName}...`);
            updateDebug(`try_${proxyName}`, 'подключение...');
            
            let proxyUrl;
            if (proxyName === 'custom') {
                proxyUrl = CORS_PROXIES['custom'](url, customProxyUrl);
            } else {
                proxyUrl = CORS_PROXIES[proxyName](url);
            }
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);
            
            const response = await fetch(proxyUrl, {
                method: 'GET',
                signal: controller.signal,
                cache: 'no-cache'
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            let rawText = await response.text();
            
            if (proxyName === 'allorigins.json') {
                try {
                    const jsonData = JSON.parse(rawText);
                    if (jsonData.contents) rawText = jsonData.contents;
                } catch (e) {}
            }
            
            content = rawText;
            usedProxy = proxyName;
            
            updateDebug(`try_${proxyName}`, {
                status: '✓ успех',
                size: content.length + ' символов',
                preview: content.substring(0, 150)
            });
            
            break;
            
        } catch (error) {
            lastError = error;
            updateDebug(`try_${proxyName}`, { error: error.message });
            continue;
        }
    }
    
    if (!content) {
        showManualFallback(url, lastError);
        return;
    }
    
    const trimmed = content.trim();
    const isHtml = trimmed.startsWith('<!doctype') || 
                   trimmed.startsWith('<html') || 
                   trimmed.startsWith('<HTML') ||
                   content.includes('<div id="root">');
    
    if (!isHtml) {
        updateDebug('direct_subscription', {
            type: 'не HTML — вероятно подписка',
            size: content.length + ' символов'
        });
        
        document.getElementById('subscription-raw').value = content;
        await processSubscriptionContent(content);
        return;
    }
    
    const vlessLinks = extractAllVlessFromHtml(content);
    
    if (vlessLinks.length > 0) {
        updateDebug('vless_in_html', { count: vlessLinks.length });
        
        document.getElementById('subscription-raw').value = content;
        
        const results = vlessLinks.map(link => {
            const parsed = parseVlessLink(link);
            return { name: parsed.name || 'VLESS Server', link: link };
        });
        
        renderResults(results);
        const timeStr = new Date().toLocaleTimeString('ru');
        setStatus('ok', `[ OK ] извлечено ${results.length} VLESS — ${timeStr}`);
        return;
    }
    
    const extractedSubUrl = extractSubscriptionUrlFromHtml(content);
    
    if (extractedSubUrl && extractedSubUrl !== url) {
        updateDebug('panel_detected', {
            type: 'Stun.su / V2board',
            subscriptionUrl: extractedSubUrl
        });
        
        setStatus('', `[ INFO ] загрузка подписки через тот же прокси...`);
        
        try {
            let subProxyUrl;
            if (usedProxy === 'custom') {
                subProxyUrl = CORS_PROXIES['custom'](extractedSubUrl, customProxyUrl);
            } else {
                subProxyUrl = CORS_PROXIES[usedProxy](extractedSubUrl);
            }
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);
            
            const subResponse = await fetch(subProxyUrl, {
                method: 'GET',
                signal: controller.signal,
                cache: 'no-cache'
            });
            
            clearTimeout(timeoutId);
            
            if (!subResponse.ok) {
                throw new Error(`HTTP ${subResponse.status}`);
            }
            
            let subContent = await subResponse.text();
            
            if (usedProxy === 'allorigins.json') {
                try {
                    const jsonData = JSON.parse(subContent);
                    if (jsonData.contents) subContent = jsonData.contents;
                } catch (e) {}
            }
            
            updateDebug('subscription_response', {
                size: subContent.length + ' символов',
                preview: subContent.substring(0, 150)
            });
            
            const subTrimmed = subContent.trim();
            const subIsHtml = subTrimmed.startsWith('<!doctype') || 
                              subTrimmed.startsWith('<html') ||
                              subContent.includes('<div id="root">');
            
            if (!subIsHtml) {
                document.getElementById('subscription-raw').value = subContent;
                await processSubscriptionContent(subContent);
                return;
            }
            
            const subVlessLinks = extractAllVlessFromHtml(subContent);
            if (subVlessLinks.length > 0) {
                const results = subVlessLinks.map(link => {
                    const parsed = parseVlessLink(link);
                    return { name: parsed.name || 'VLESS Server', link: link };
                });
                renderResults(results);
                setStatus('ok', `[ OK ] извлечено ${results.length} VLESS`);
                return;
            }
            
            showExtractedUrlModal(extractedSubUrl, subContent);
            
        } catch (error) {
            updateDebug('subscription_error', { error: error.message });
            showExtractedUrlModal(extractedSubUrl, content);
        }
    } else {
        setStatus('err', '[ ERROR ] VLESS не найдены');
        updateDebug('no_vless', {
            hint: 'Сервер отдаёт только HTML-страницу. Нужна прямая ссылка подписки или свой Worker.'
        });
        showNoVlessModal(content);
    }
}

// ==================== УНИВЕРСАЛЬНЫЙ ПОИСК VLESS В HTML ====================

function extractAllVlessFromHtml(html) {
    const allLinks = new Set();
    
    const directMatches = html.match(/vless:\/\/[^\s<>"']+/gi);
    if (directMatches) {
        directMatches.forEach(link => {
            const clean = link.replace(/[)\],;'"]+$/, '').trim();
            if (clean.startsWith('vless://') && clean.length > 10) {
                allLinks.add(clean);
            }
        });
    }
    
    const dataAttrRegex = /data-([a-z\-]+)=["']([^"']+)["']/gi;
    let match;
    
    while ((match = dataAttrRegex.exec(html)) !== null) {
        const attrValue = match[2];
        if (attrValue.length < 20) continue;
        
        const vlessInAttr = attrValue.match(/vless:\/\/[^\s<>"']+/gi);
        if (vlessInAttr) {
            vlessInAttr.forEach(link => {
                const clean = link.replace(/[)\],;'"]+$/, '').trim();
                if (clean.startsWith('vless://') && clean.length > 10) {
                    allLinks.add(clean);
                }
            });
        }
        
        const decoded = tryDecodeBase64(attrValue);
        if (decoded) {
            const vlessInDecoded = decoded.match(/vless:\/\/[^\s<>"']+/gi);
            if (vlessInDecoded) {
                vlessInDecoded.forEach(link => {
                    const clean = link.replace(/[)\],;'"]+$/, '').trim();
                    if (clean.startsWith('vless://') && clean.length > 10) {
                        allLinks.add(clean);
                    }
                });
            }
        }
    }
    
    const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/gi;
    let scriptMatch;
    
    while ((scriptMatch = scriptRegex.exec(html)) !== null) {
        const scriptContent = scriptMatch[1];
        if (!scriptContent || scriptContent.length < 50) continue;
        
        const vlessInScript = scriptContent.match(/vless:\/\/[^\s<>"']+/gi);
        if (vlessInScript) {
            vlessInScript.forEach(link => {
                const clean = link.replace(/[)\],;'"]+$/, '').trim();
                if (clean.startsWith('vless://') && clean.length > 10) {
                    allLinks.add(clean);
                }
            });
        }
        
        const b64Matches = scriptContent.match(/["']([A-Za-z0-9+/=]{50,})["']/g);
        if (b64Matches) {
            b64Matches.forEach(b64Str => {
                const clean = b64Str.replace(/["']/g, '');
                const decoded = tryDecodeBase64(clean);
                if (decoded) {
                    const vlessInB64 = decoded.match(/vless:\/\/[^\s<>"']+/gi);
                    if (vlessInB64) {
                        vlessInB64.forEach(link => {
                            const cleanLink = link.replace(/[)\],;'"]+$/, '').trim();
                            if (cleanLink.startsWith('vless://') && cleanLink.length > 10) {
                                allLinks.add(cleanLink);
                            }
                        });
                    }
                }
            });
        }
    }
    
    const b64Regex = /["']([A-Za-z0-9+/=]{100,})["']/g;
    let b64Match;
    
    while ((b64Match = b64Regex.exec(html)) !== null) {
        const b64Str = b64Match[1];
        const decoded = tryDecodeBase64(b64Str);
        if (decoded) {
            const vlessInDecoded = decoded.match(/vless:\/\/[^\s<>"']+/gi);
            if (vlessInDecoded) {
                vlessInDecoded.forEach(link => {
                    const clean = link.replace(/[)\],;'"]+$/, '').trim();
                    if (clean.startsWith('vless://') && clean.length > 10) {
                        allLinks.add(clean);
                    }
                });
            }
        }
    }
    
    return [...allLinks];
}

function tryDecodeBase64(str) {
    if (!str || str.length < 20) return null;
    
    let cleaned = str.replace(/\s/g, '');
    
    if (!/^[A-Za-z0-9+\/=_-]+$/.test(cleaned)) return null;
    
    cleaned = cleaned.replace(/-/g, '+').replace(/_/g, '/');
    const pad = cleaned.length % 4;
    if (pad) cleaned += '='.repeat(4 - pad);
    
    try {
        const decoded = atob(cleaned);
        
        let nonPrintable = 0;
        for (let i = 0; i < Math.min(decoded.length, 100); i++) {
            const code = decoded.charCodeAt(i);
            if (code < 32 && code !== 9 && code !== 10 && code !== 13) {
                nonPrintable++;
            }
        }
        
        if (nonPrintable / Math.min(decoded.length, 100) > 0.3) {
            return null;
        }
        
        return decoded;
    } catch (e) {
        return null;
    }
}

function extractSubscriptionUrlFromHtml(html) {
    try {
        const match = html.match(/data-panel=["']([A-Za-z0-9+/=_-]+)["']/i);
        if (!match) return null;
        
        let b64 = match[1].replace(/-/g, '+').replace(/_/g, '/');
        const pad = b64.length % 4;
        if (pad) b64 += '='.repeat(4 - pad);
        
        const jsonStr = atob(b64);
        const data = JSON.parse(jsonStr);
        
        const response = data.response || data;
        
        if (response.subscriptionUrl) {
            return response.subscriptionUrl;
        }
        
        if (Array.isArray(response.links) && response.links.length > 0) {
            for (const link of response.links) {
                if (typeof link === 'string') return link;
                if (link && link.url) return link.url;
            }
        }
        
        if (response.ssConfLinks && typeof response.ssConfLinks === 'object') {
            const values = Object.values(response.ssConfLinks);
            if (values.length > 0) return values[0];
        }
        
        return null;
        
    } catch (e) {
        return null;
    }
}

// ==================== ЗАГРУЗКА ФАЙЛА ====================

function handleFile(file) {
    updateDebug('file', {
        name: file.name,
        size: file.size + ' байт',
        type: file.type || 'неизвестен'
    });
    
    const reader = new FileReader();
    
    reader.onload = async (e) => {
        const content = e.target.result;
        document.getElementById('subscription-raw').value = content;
        
        setStatus('ok', `[ OK ] файл загружен: ${file.name} (${content.length} символов)`);
        
        updateDebug('file_loaded', {
            size: content.length + ' символов',
            preview: content.substring(0, 150)
        });
        
        await processSubscriptionContent(content);
    };
    
    reader.onerror = () => {
        setStatus('err', '[ ERROR ] не удалось прочитать файл');
        updateDebug('file_error', { error: 'ошибка чтения' });
    };
    
    reader.readAsText(file, 'utf-8');
}

// ==================== РУЧНАЯ ВСТАВКА ====================

async function parseSubscriptionManual() {
    const content = document.getElementById('subscription-raw').value.trim();
    if (!content) {
        setStatus('err', '[ ERROR ] вставьте содержимое подписки');
        return;
    }
    updateDebug('manual', { size: content.length + ' символов' });
    await processSubscriptionContent(content);
}

// ==================== ОБРАБОТКА СОДЕРЖИМОГО ====================

async function processSubscriptionContent(content) {
    try {
        let decoded = null;
        let decodeMethod = 'none';
        
        if (content.includes('vless://')) {
            decoded = content;
            decodeMethod = 'plain text (vless:// найден)';
        }
        
        if (!decoded) {
            try {
                const cleaned = content.replace(/\s/g, '');
                if (/^[A-Za-z0-9+\/=]+$/.test(cleaned) && cleaned.length > 20) {
                    const result = atob(cleaned);
                    if (looksLikeSubscription(result)) {
                        decoded = result;
                        decodeMethod = 'base64 (стандартный)';
                    } else if (looksLikePanelJson(result)) {
                        decoded = result;
                        decodeMethod = 'base64 (JSON панели)';
                    }
                }
            } catch (e) {}
        }
        
        if (!decoded) {
            try {
                const cleaned = content.replace(/\s/g, '')
                    .replace(/-/g, '+')
                    .replace(/_/g, '/');
                const pad = cleaned.length % 4;
                const padded = pad ? cleaned + '='.repeat(4 - pad) : cleaned;
                
                if (/^[A-Za-z0-9+\/=]+$/.test(padded) && padded.length > 20) {
                    const result = atob(padded);
                    if (looksLikeSubscription(result)) {
                        decoded = result;
                        decodeMethod = 'base64 (URL-safe)';
                    } else if (looksLikePanelJson(result)) {
                        decoded = result;
                        decodeMethod = 'base64 URL-safe (JSON панели)';
                    }
                }
            } catch (e) {}
        }
        
        if (!decoded && typeof DecompressionStream !== 'undefined') {
            try {
                const cleaned = content.replace(/\s/g, '')
                    .replace(/-/g, '+')
                    .replace(/_/g, '/');
                const pad = cleaned.length % 4;
                const b64 = pad ? cleaned + '='.repeat(4 - pad) : cleaned;
                
                const binary = atob(b64);
                const bytes = new Uint8Array(binary.length);
                for (let i = 0; i < binary.length; i++) {
                    bytes[i] = binary.charCodeAt(i);
                }
                
                if (bytes[0] === 0x1f && bytes[1] === 0x8b) {
                    const ds = new DecompressionStream('gzip');
                    const blob = new Blob([bytes]);
                    const stream = blob.stream().pipeThrough(ds);
                    const decompressedBlob = await new Response(stream).blob();
                    const result = await decompressedBlob.text();
                    
                    if (looksLikeSubscription(result)) {
                        decoded = result;
                        decodeMethod = 'gzip + base64';
                    }
                }
            } catch (e) {}
        }
        
        if (!decoded) {
            decoded = content;
            decodeMethod = 'использован как есть';
        }
        
        updateDebug('decode', {
            method: decodeMethod,
            size: decoded.length + ' символов',
            preview: decoded.substring(0, 200)
        });
        
        const subUrl = extractSubscriptionUrlFromJson(decoded);
        
        if (subUrl) {
            updateDebug('panel_json_found', {
                subscriptionUrl: subUrl
            });
            
            setStatus('ok', `[ OK ] найдена прямая ссылка подписки`);
            showExtractedUrlModal(subUrl, decoded);
            return;
        }
        
        const vlessLinks = extractVlessLinks(decoded);
        
        if (vlessLinks.length === 0) {
            const protocols = detectProtocols(decoded);
            if (protocols.length > 0) {
                setStatus('err', `[ ERROR ] VLESS не найдены. Найдены: ${protocols.join(', ')}`);
            } else {
                setStatus('err', '[ ERROR ] не найдено vless://');
            }
            updateDebug('extract', { error: 'vless:// не найдены', found_protocols: protocols.join(', ') || 'нет' });
            return;
        }
        
        updateDebug('extract', { found: vlessLinks.length + ' ссылок vless://' });
        
        const results = vlessLinks.map(link => {
            const parsed = parseVlessLink(link);
            return {
                name: parsed.name || 'VLESS Server',
                link: link
            };
        });
        
        renderResults(results);
        const timeStr = new Date().toLocaleTimeString('ru');
        setStatus('ok', `[ OK ] извлечено ${results.length} VLESS (${decodeMethod}) — ${timeStr}`);
        
    } catch (e) {
        setStatus('err', '[ ERROR ] ' + e.message);
        updateDebug('error', { error: e.message });
    }
}

function looksLikePanelJson(text) {
    if (!text) return false;
    try {
        const json = JSON.parse(text);
        const response = json.response || json;
        return !!(response.subscriptionUrl || 
                  (Array.isArray(response.links) && response.links.length > 0) ||
                  response.ssConfLinks);
    } catch (e) {
        return false;
    }
}

function extractSubscriptionUrlFromJson(text) {
    try {
        const json = JSON.parse(text);
        const response = json.response || json;
        
        if (response.subscriptionUrl) return response.subscriptionUrl;
        
        if (Array.isArray(response.links) && response.links.length > 0) {
            for (const link of response.links) {
                if (typeof link === 'string' && link.startsWith('http')) return link;
                if (link && link.url) return link.url;
            }
        }
        
        if (response.ssConfLinks && typeof response.ssConfLinks === 'object') {
            const values = Object.values(response.ssConfLinks);
            for (const val of values) {
                if (typeof val === 'string' && val.startsWith('http')) return val;
            }
        }
        
        return null;
    } catch (e) {
        return null;
    }
}

function looksLikeSubscription(text) {
    if (!text) return false;
    return text.includes('vless://') || 
           text.includes('vmess://') || 
           text.includes('trojan://') ||
           text.includes('ss://') ||
           text.includes('hysteria://') ||
           text.includes('tuic://');
}

function detectProtocols(text) {
    const protocols = [];
    const checks = [
        ['vless', 'vless://'],
        ['vmess', 'vmess://'],
        ['trojan', 'trojan://'],
        ['ss', 'ss://'],
        ['hysteria', 'hysteria://'],
        ['hysteria2', 'hysteria2://'],
        ['tuic', 'tuic://'],
        ['wireguard', 'wireguard://'],
        ['wg', 'wg://']
    ];
    for (const [name, pattern] of checks) {
        if (text.includes(pattern)) protocols.push(name);
    }
    return protocols;
}

function extractVlessLinks(text) {
    const links = [];
    const regex = /vless:\/\/[^\s<>"']+/gi;
    const matches = text.match(regex);
    
    if (matches) {
        matches.forEach(link => {
            const cleanLink = link.replace(/[)\],;'"]+$/, '').trim();
            if (cleanLink.startsWith('vless://') && cleanLink.length > 10) {
                links.push(cleanLink);
            }
        });
    }
    
    return [...new Set(links)];
}

function parseVlessLink(url) {
    try {
        const withoutProto = url.replace(/^vless:\/\//, '');
        const [main, fragment = ''] = withoutProto.split('#');
        
        let name = '';
        if (fragment) {
            try {
                name = decodeURIComponent(fragment);
            } catch (e) {
                name = fragment;
            }
        }
        
        return { name: name };
    } catch (e) {
        return { name: '' };
    }
}

// ==================== КОНВЕРТАЦИЯ ====================

function convert() {
    console.log('[CONVERT] Вызвана convert(), currentTab:', currentTab);
    
    if (currentTab === 'koala') {
        console.log('[CONVERT] → convertKoala()');
        convertKoala();
    } else if (currentTab === 'happ') {
        console.log('[CONVERT] → convertHapp()');
        convertHapp();
    } else {
        console.warn('[CONVERT] Неизвестная вкладка:', currentTab);
        setStatus('err', '[ ERROR ] выберите вкладку Koala Clash или Happ JSON');
    }
}

function convertKoala() {
    console.log('[KOALA] Начало конвертации');
    
    const input = document.getElementById('koala-input');
    if (!input) {
        console.error('[KOALA] Элемент koala-input не найден!');
        setStatus('err', '[ ERROR ] поле ввода Koala не найдено');
        return;
    }
    
    const value = input.value.trim();
    console.log('[KOALA] Длина ввода:', value.length, 'символов');
    
    if (!value) {
        setStatus('err', '[ ERROR ] пустой ввод');
        return;
    }
    
    try {
        let config;
        
        try {
            config = JSON.parse(value);
            console.log('[KOALA] Распознан как JSON');
        } catch (e) {
            config = parseKoalaConfig(value);
            console.log('[KOALA] Распознан как YAML, прокси:', config.proxies?.length);
        }
        
        const results = koalaToVlessArray(config);
        console.log('[KOALA] Результатов:', results.length);
        
        if (results.length === 0) {
            setStatus('err', '[ ERROR ] не найдено VLESS прокси');
            return;
        }
        
        renderResults(results);
        const timeStr = new Date().toLocaleTimeString('ru');
        setStatus('ok', `[ OK ] конвертация выполнена (${results.length} шт.) — ${timeStr}`);
        console.log('[KOALA] ✓ Успешно');
        
    } catch (e) {
        console.error('[KOALA] Ошибка:', e);
        setStatus('err', '[ ERROR ] ' + e.message);
    }
}

function convertHapp() {
    console.log('[HAPP] Начало конвертации');
    
    const input = document.getElementById('happ-input');
    if (!input) {
        console.error('[HAPP] Элемент happ-input не найден!');
        setStatus('err', '[ ERROR ] поле ввода Happ не найдено');
        return;
    }
    
    const value = input.value.trim();
    console.log('[HAPP] Длина ввода:', value.length, 'символов');
    
    if (!value) {
        setStatus('err', '[ ERROR ] пустой ввод');
        return;
    }
    
    try {
        const config = JSON.parse(value);
        console.log('[HAPP] JSON распарсен');
        
        const results = jsonToVlessArray(config);
        console.log('[HAPP] Результатов:', results.length);
        
        if (results.length === 0) {
            setStatus('err', '[ ERROR ] не найдено VLESS outbound');
            return;
        }
        
        renderResults(results);
        const timeStr = new Date().toLocaleTimeString('ru');
        setStatus('ok', `[ OK ] конвертация выполнена (${results.length} шт.) — ${timeStr}`);
        console.log('[HAPP] ✓ Успешно');
        
    } catch (e) {
        console.error('[HAPP] Ошибка:', e);
        setStatus('err', '[ ERROR ] ' + e.message);
    }
}

// ==================== РЕНДЕР ====================

function renderResults(results) {
    currentResults = results;
    const listDiv = document.getElementById('results-list');
    const countSpan = document.getElementById('result-count');
    
    countSpan.textContent = `Найдено: ${results.length} ссылок`;
    listDiv.innerHTML = '';
    
    results.forEach((item, index) => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'result-item';
        itemDiv.innerHTML = `
            <div class="result-item-header">
                <div class="result-item-name">${escapeHtml(item.name)}</div>
                <button class="copy-item-btn" data-copy-index="${index}" onclick="copyItem(${index})">[ Copy ]</button>
            </div>
            <textarea class="result-item-link" readonly>${escapeHtml(item.link)}</textarea>
        `;
        listDiv.appendChild(itemDiv);
    });
    
    document.getElementById('result-section').style.display = 'block';
    document.getElementById('result-section').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ==================== ДЕЙСТВИЯ ====================

function copyItem(index) {
    const item = currentResults[index];
    if (!item) return;
    const btn = document.querySelector(`[data-copy-index="${index}"]`);
    
    navigator.clipboard.writeText(item.link).then(() => {
        if (btn) {
            btn.textContent = '[ Copied! ]';
            btn.classList.add('copied');
            setTimeout(() => {
                btn.textContent = '[ Copy ]';
                btn.classList.remove('copied');
            }, 2000);
        }
    }).catch(() => {
        const ta = document.createElement('textarea');
        ta.value = item.link;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        if (btn) {
            btn.textContent = '[ Copied! ]';
            btn.classList.add('copied');
            setTimeout(() => {
                btn.textContent = '[ Copy ]';
                btn.classList.remove('copied');
            }, 2000);
        }
    });
}

function copyAll() {
    if (currentResults.length === 0) return;
    const allLinks = currentResults.map(r => r.link).join('\n');
    navigator.clipboard.writeText(allLinks).then(() => {
        setStatus('ok', `[ OK ] скопировано ${currentResults.length} ссылок`);
    }).catch(() => {
        const ta = document.createElement('textarea');
        ta.value = allLinks;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        setStatus('ok', `[ OK ] скопировано ${currentResults.length} ссылок`);
    });
}

function downloadAll() {
    if (currentResults.length === 0) return;
    const content = currentResults.map(r => r.link).join('\n');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'vless_links.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setStatus('ok', `[ OK ] файл скачан (${currentResults.length} ссылок)`);
}

function clearAll() {
    document.getElementById('koala-input').value = '';
    document.getElementById('happ-input').value = '';
    document.getElementById('subscription-url').value = '';
    document.getElementById('subscription-raw').value = '';
    document.getElementById('results-list').innerHTML = '';
    document.getElementById('result-section').style.display = 'none';
    currentResults = [];
    lastDebugInfo = {};
    renderDebug();
    setStatus('', 'ожидание ввода...');
}

// ==================== HAPP JSON ====================

function jsonToVlessArray(configJson) {
    let config = typeof configJson === 'string' ? JSON.parse(configJson) : configJson;
    const results = [];
    for (const outbound of config.outbounds || []) {
        if (outbound.protocol === 'vless') {
            try {
                const link = buildVlessFromOutbound(outbound, config.remarks || '');
                results.push({ name: config.remarks || outbound.tag || 'VLESS', link: link });
            } catch (e) { console.warn('Ошибка outbound:', e); }
        }
    }
    return results;
}

function buildVlessFromOutbound(vlessOutbound, remarks) {
    const vnext = vlessOutbound.settings.vnext[0];
    const user = vnext.users[0];
    const uuid = user.id;
    const address = vnext.address;
    const port = vnext.port;
    const streamSettings = vlessOutbound.streamSettings || {};
    const network = streamSettings.network || 'tcp';
    const security = streamSettings.security || 'none';
    const params = {};
    params['security'] = security;
    params['type'] = network;
    
    if (network === 'tcp') {
        params['headerType'] = '';
        params['path'] = '';
        params['host'] = '';
        const tcpSettings = streamSettings.tcpSettings || {};
        const header = tcpSettings.header || {};
        if (header.type === 'http') {
            params['headerType'] = 'http';
            const request = header.request || {};
            if (request.path) {
                const pathVal = request.path;
                params['path'] = Array.isArray(pathVal) ? pathVal.join(',') : pathVal;
            }
            if (request.headers && request.headers.Host) {
                const hostVal = request.headers.Host;
                params['host'] = Array.isArray(hostVal) ? hostVal.join(',') : hostVal;
            }
        }
    } else if (network === 'ws') {
        const wsSettings = streamSettings.wsSettings || {};
        if (wsSettings.path) params['path'] = wsSettings.path;
        if (wsSettings.headers && wsSettings.headers.Host) params['host'] = wsSettings.headers.Host;
    }
    
    if (user.flow) params['flow'] = user.flow;
    
    if (security === 'reality') {
        const reality = streamSettings.realitySettings || {};
        if (reality.serverName) params['sni'] = reality.serverName;
        if (reality.fingerprint) params['fp'] = reality.fingerprint;
        if (reality.publicKey) params['pbk'] = reality.publicKey;
        if (reality.shortId) params['sid'] = reality.shortId;
        if (reality.spiderX) params['spx'] = reality.spiderX;
    } else if (security === 'tls') {
        const tls = streamSettings.tlsSettings || {};
        if (tls.serverName) params['sni'] = tls.serverName;
        if (tls.fingerprint) params['fp'] = tls.fingerprint;
        if (tls.alpn) {
            const alpnVal = tls.alpn;
            params['alpn'] = Array.isArray(alpnVal) ? alpnVal.join(',') : alpnVal;
        }
    }
    
    const paramOrder = ['security', 'type', 'headerType', 'path', 'host', 'flow', 'sni', 'fp', 'pbk', 'sid', 'spx', 'alpn'];
    const queryParts = [];
    for (const key of paramOrder) {
        if (key in params) {
            queryParts.push(`${key}=${encodeURIComponent(String(params[key]))}`);
        }
    }
    
    const fragment = remarks ? encodeURIComponent(remarks) : '';
    let vlessUrl = `vless://${uuid}@${address}:${port}?${queryParts.join('&')}`;
    if (fragment) vlessUrl += `#${fragment}`;
    return vlessUrl;
}

// ==================== KOALA CLASH ====================

function parseKoalaConfig(text) {
    const config = { proxies: [] };
    const lines = text.split('\n');
    let currentProxy = null;
    let inProxies = false;
    let currentKey = null;
    
    for (let i = 0; i < lines.length; i++) {
        const rawLine = lines[i];
        const trimmed = rawLine.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const indent = rawLine.length - rawLine.trimStart().length;
        
        if (trimmed === 'proxies:') { inProxies = true; continue; }
        if (!inProxies) continue;
        
        if (trimmed.startsWith('- ')) {
            if (currentProxy) config.proxies.push(currentProxy);
            currentProxy = {};
            currentKey = null;
            const content = trimmed.substring(2).trim();
            if (content.includes(':')) {
                const colonIndex = content.indexOf(':');
                const key = content.substring(0, colonIndex).trim();
                const value = parseYamlValue(content.substring(colonIndex + 1).trim());
                currentProxy[key] = value;
                currentKey = key;
            }
            continue;
        }
        
        if (!currentProxy) continue;
        
        if (trimmed.endsWith(':') && !trimmed.includes(': ')) {
            currentKey = trimmed.slice(0, -1).trim();
            currentProxy[currentKey] = {};
            continue;
        }
        
        if (trimmed.startsWith('- ') && currentKey && typeof currentProxy[currentKey] === 'object' && !Array.isArray(currentProxy[currentKey])) {
            if (!Array.isArray(currentProxy[currentKey])) currentProxy[currentKey] = [];
            currentProxy[currentKey].push(parseYamlValue(trimmed.substring(2).trim()));
            continue;
        }
        
        if (trimmed.includes(':')) {
            const colonIndex = trimmed.indexOf(':');
            const key = trimmed.substring(0, colonIndex).trim();
            const valueStr = trimmed.substring(colonIndex + 1).trim();
            if (indent > 6 && currentKey && typeof currentProxy[currentKey] === 'object') {
                currentProxy[currentKey][key] = parseYamlValue(valueStr);
            } else {
                currentProxy[key] = parseYamlValue(valueStr);
                currentKey = key;
            }
        }
    }
    if (currentProxy) config.proxies.push(currentProxy);
    return config;
}

function parseYamlValue(valueStr) {
    if (!valueStr) return '';
    if ((valueStr.startsWith("'") && valueStr.endsWith("'")) || (valueStr.startsWith('"') && valueStr.endsWith('"'))) {
        return valueStr.slice(1, -1);
    }
    if (valueStr === 'true') return true;
    if (valueStr === 'false') return false;
    if (/^\d+$/.test(valueStr)) return parseInt(valueStr, 10);
    if (/^\d+\.\d+$/.test(valueStr)) return parseFloat(valueStr);
    return valueStr;
}

function koalaToVlessArray(config) {
    const results = [];
    for (const proxy of config.proxies || []) {
        if (proxy.type !== 'vless' && proxy.type !== 'VLESS') continue;
        try {
            const link = buildVlessFromKoalaProxy(proxy);
            results.push({ name: proxy.name || 'VLESS', link: link });
        } catch (e) { console.warn('Ошибка прокси:', proxy.name, e); }
    }
    return results;
}

function buildVlessFromKoalaProxy(vlessProxy) {
    const uuid = vlessProxy.uuid || vlessProxy.id;
    const address = vlessProxy.server || vlessProxy.address;
    const port = vlessProxy.port;
    if (!uuid || !address || !port) throw new Error("Нет uuid/server/port");
    
    const params = {};
    params['security'] = (vlessProxy.tls === true || vlessProxy.tls === 'true') ? 'tls' : 'none';
    params['type'] = vlessProxy.network || 'tcp';
    
    if (params['type'] === 'ws') {
        if (vlessProxy.path) params['path'] = vlessProxy.path;
        if (vlessProxy.host) params['host'] = vlessProxy.host;
        else if (vlessProxy.headers && vlessProxy.headers.Host) params['host'] = vlessProxy.headers.Host;
    } else if (params['type'] === 'tcp') {
        params['headerType'] = vlessProxy.headerType || '';
        if (vlessProxy.path) params['path'] = vlessProxy.path;
        if (vlessProxy.host) params['host'] = vlessProxy.host;
    }
    
    if (params['security'] === 'tls') {
        if (vlessProxy.servername) params['sni'] = vlessProxy.servername;
        else if (vlessProxy.sni) params['sni'] = vlessProxy.sni;
        if (vlessProxy.fp) params['fp'] = vlessProxy.fp;
        else if (vlessProxy.fingerprint) params['fp'] = vlessProxy.fingerprint;
        if (vlessProxy.alpn) params['alpn'] = Array.isArray(vlessProxy.alpn) ? vlessProxy.alpn.join(',') : vlessProxy.alpn;
        if (vlessProxy.flow) params['flow'] = vlessProxy.flow;
    }
    
    if (vlessProxy.reality === true || vlessProxy.reality === 'true') {
        params['security'] = 'reality';
        if (vlessProxy.servername) params['sni'] = vlessProxy.servername;
        else if (vlessProxy.sni) params['sni'] = vlessProxy.sni;
        if (vlessProxy.fp) params['fp'] = vlessProxy.fp;
        else if (vlessProxy.fingerprint) params['fp'] = vlessProxy.fingerprint;
        if (vlessProxy.pbk || vlessProxy.publicKey) params['pbk'] = vlessProxy.pbk || vlessProxy.publicKey;
        if (vlessProxy.sid || vlessProxy.shortId) params['sid'] = vlessProxy.sid || vlessProxy.shortId;
        if (vlessProxy.spx || vlessProxy.spiderX) params['spx'] = vlessProxy.spx || vlessProxy.spiderX;
    }
    
    const paramOrder = ['security', 'type', 'headerType', 'path', 'host', 'flow', 'sni', 'fp', 'pbk', 'sid', 'spx', 'alpn'];
    const queryParts = [];
    for (const key of paramOrder) {
        if (key in params) queryParts.push(`${key}=${encodeURIComponent(String(params[key]))}`);
    }
    
    const fragment = (vlessProxy.name || '') ? encodeURIComponent(vlessProxy.name) : '';
    let vlessUrl = `vless://${uuid}@${address}:${port}?${queryParts.join('&')}`;
    if (fragment) vlessUrl += `#${fragment}`;
    return vlessUrl;
}

// ==================== МОДАЛЬНЫЕ ОКНА ====================

function showExtractedUrlModal(subUrl, originalContent) {
    const oldModal = document.getElementById('manual-modal');
    if (oldModal) oldModal.remove();
    
    const modal = document.createElement('div');
    modal.id = 'manual-modal';
    modal.className = 'manual-modal-overlay';
    modal.innerHTML = `
        <div class="manual-modal-box">
            <div class="manual-modal-topbar">
                <div class="dot red"></div>
                <div class="dot yellow"></div>
                <div class="dot green"></div>
                <span class="manual-modal-title">// ✓ Прямая ссылка подписки найдена</span>
                <button class="manual-modal-close" onclick="closeManualModal()">✕</button>
            </div>
            <div class="manual-modal-body">
                <div class="success-icon">✅</div>
                <div class="success-title">Панель управления распознана</div>
                <div class="success-text">
                    Найдена прямая ссылка на подписку. Используйте её со своим Worker (Happ-эмуляция).
                </div>
                
                <div class="extracted-url-block">
                    <div class="extracted-url-label">Прямая ссылка на подписку:</div>
                    <div class="extracted-url-value" id="extracted-url-value">${escapeHtml(subUrl)}</div>
                    <div class="extracted-url-actions">
                        <button class="btn btn-blue" onclick="copyExtractedUrl()" id="copy-extracted-btn">
                            [ 📋 Скопировать ]
                        </button>
                        <button class="btn btn-ghost" onclick="useExtractedUrl()">
                            [ ⚡ Использовать ]
                        </button>
                    </div>
                </div>
                
                <div class="manual-alt" style="margin-top:20px;">
                    <div class="manual-alt-title">💡 Важно</div>
                    <div class="manual-alt-text">
                        Для загрузки этой ссылки нужен <b>свой Worker</b> с Happ-эмуляцией.<br>
                        Выберите в прокси <b>"🚀 Свой прокси (Happ-эмуляция)"</b> и вставьте URL Worker.
                    </div>
                </div>
                
                <button class="btn btn-ghost" onclick="closeManualModal()" style="margin-top:16px;width:100%;">
                    [ Закрыть ]
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

function copyExtractedUrl() {
    const urlEl = document.getElementById('extracted-url-value');
    if (!urlEl) return;
    
    const url = urlEl.textContent;
    const btn = document.getElementById('copy-extracted-btn');
    
    navigator.clipboard.writeText(url).then(() => {
        if (btn) {
            btn.textContent = '[ ✓ Скопировано! ]';
            setTimeout(() => {
                btn.textContent = '[ 📋 Скопировать ]';
            }, 2000);
        }
    }).catch(() => {
        const ta = document.createElement('textarea');
        ta.value = url;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        
        if (btn) {
            btn.textContent = '[ ✓ Скопировано! ]';
            setTimeout(() => {
                btn.textContent = '[ 📋 Скопировать ]';
            }, 2000);
        }
    });
}

function useExtractedUrl() {
    const urlEl = document.getElementById('extracted-url-value');
    if (!urlEl) return;
    
    const url = urlEl.textContent;
    closeManualModal();
    
    document.getElementById('subscription-url').value = url;
    document.getElementById('subscription-raw').value = '';
    
    setStatus('ok', `[ OK ] ссылка вставлена`);
}

function closeManualModal() {
    const modal = document.getElementById('manual-modal');
    if (modal) modal.remove();
}

function showManualFallback(url, lastError) {
    setStatus('err', '[ ERROR ] все прокси недоступны');
    
    updateDebug('all_proxies_failed', {
        last_error: lastError?.message || 'неизвестно',
        hint: 'Публичные CORS прокси недоступны. Используйте ручной способ или свой Worker.'
    });
    
    const panel = document.getElementById('debug-panel');
    const text = document.getElementById('debug-toggle-text');
    if (panel) {
        panel.style.display = 'block';
        text.textContent = '▼ Скрыть диагностику';
    }
    
    const oldModal = document.getElementById('manual-modal');
    if (oldModal) oldModal.remove();
    
    const modal = document.createElement('div');
    modal.id = 'manual-modal';
    modal.className = 'manual-modal-overlay';
    modal.innerHTML = `
        <div class="manual-modal-box">
            <div class="manual-modal-topbar">
                <div class="dot red"></div>
                <div class="dot yellow"></div>
                <div class="dot green"></div>
                <span class="manual-modal-title">// CORS прокси недоступны</span>
                <button class="manual-modal-close" onclick="closeManualModal()">✕</button>
            </div>
            <div class="manual-modal-body">
                <div class="success-icon" style="color:#f59e0b;">⚠️</div>
                <div class="success-title" style="color:#f59e0b;">Прокси не работают</div>
                <div class="success-text">
                    Публичные CORS прокси сейчас недоступны или блокируются.
                </div>
                
                <div class="manual-alt" style="margin-top:20px;">
                    <div class="manual-alt-title">💡 Решение</div>
                    <div class="manual-alt-text">
                        <b>Вариант 1:</b> Создайте свой Worker на Cloudflare (бесплатно, 2 минуты)<br>
                        → Выберите "🚀 Свой прокси (Happ-эмуляция)"<br><br>
                        <b>Вариант 2:</b> Вставьте содержимое подписки вручную<br>
                        → Откройте URL в новой вкладке, скопируйте содержимое<br>
                        → Вставьте в поле "Содержимое подписки"
                    </div>
                </div>
                
                <button class="btn btn-ghost" onclick="closeManualModal()" style="margin-top:16px;width:100%;">
                    [ Закрыть ]
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

function showNoVlessModal(html) {
    const oldModal = document.getElementById('manual-modal');
    if (oldModal) oldModal.remove();
    
    const modal = document.createElement('div');
    modal.id = 'manual-modal';
    modal.className = 'manual-modal-overlay';
    modal.innerHTML = `
        <div class="manual-modal-box">
            <div class="manual-modal-topbar">
                <div class="dot red"></div>
                <div class="dot yellow"></div>
                <div class="dot green"></div>
                <span class="manual-modal-title">// VLESS не найдены</span>
                <button class="manual-modal-close" onclick="closeManualModal()">✕</button>
            </div>
            <div class="manual-modal-body">
                <div class="success-icon">⚠️</div>
                <div class="success-title" style="color:#f59e0b;">VLESS ссылки не найдены</div>
                <div class="success-text">
                    В загруженном HTML нет закодированных VLESS ссылок.<br>
                    Сервер отдаёт только страницу с инструкцией.
                </div>
                
                <div class="manual-alt" style="margin-top:20px;">
                    <div class="manual-alt-title">💡 Решение</div>
                    <div class="manual-alt-text">
                        Нужен <b>свой Worker</b> на Cloudflare, который притворится Happ.<br><br>
                        1. Создайте Worker (2 минуты, бесплатно)<br>
                        2. Вставьте URL Worker в поле "URL вашего Worker"<br>
                        3. Выберите "🚀 Свой прокси (Happ-эмуляция)"<br>
                        4. Нажмите [ 📥 Загрузить ]
                    </div>
                </div>
                
                <details class="raw-details" style="margin-top:16px;">
                    <summary>🔍 Статистика поиска</summary>
                    <div class="raw-html-preview" style="margin-top:10px;">
HTML размер: ${html.length} символов
Прямых vless:// найдено: ${(html.match(/vless:\/\//g) || []).length}
data-* атрибутов: ${(html.match(/data-[a-z\-]+=/gi) || []).length}
                    </div>
                </details>
                
                <button class="btn btn-ghost" onclick="closeManualModal()" style="margin-top:16px;width:100%;">
                    [ Закрыть ]
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}