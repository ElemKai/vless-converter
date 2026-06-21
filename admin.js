// ==================== КОНФИГУРАЦИЯ ====================
const SSH_WORKER_URL = 'https://spare-macaque-5540.svoboda.deno.net';
const TTYD_PORT = 7681;

// ==================== ПЕРЕМЕННЫЕ ====================
let myIpData = null;
let clients = [];
let sshTerm = null;
let sshFitAddon = null;
let sshWebSocket = null;
let sshConnected = false;
let currentSshClient = null;

// ==================== ИНИЦИАЛИЗАЦИЯ ====================

document.addEventListener('DOMContentLoaded', () => {
    // Вкладки
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const tabName = this.dataset.tab;
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            document.getElementById(tabName).classList.add('active');
            
            // При переключении на SSH — подгоняем размер терминала
            if (tabName === 'ssh-terminal' && sshFitAddon) {
                setTimeout(() => sshFitAddon.fit(), 100);
            }
        });
    });
    
    // Автоопределение IP
    detectMyIp();
    
    // Загрузка клиентов
    renderClients();
    
    // Инициализация терминала
    initTerminal();
    
    // Обработка изменения размера окна
    window.addEventListener('resize', () => {
        if (sshFitAddon) sshFitAddon.fit();
        if (sshConnected && sshWebSocket && sshWebSocket.readyState === WebSocket.OPEN) {
            sshWebSocket.send(JSON.stringify({
                type: 'resize',
                cols: sshTerm.cols,
                rows: sshTerm.rows
            }));
        }
    });
});

// ==================== IP TOOLS ====================

async function detectMyIp() {
    const fields = ['my-ip', 'my-country', 'my-city', 'my-isp', 'my-coords', 'my-timezone'];
    fields.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = '...';
    });
    
    try {
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        
        myIpData = data;
        
        document.getElementById('my-ip').textContent = data.ip || '—';
        document.getElementById('my-country').textContent = 
            `${data.country_name || '—'} ${data.country_code ? '(' + data.country_code + ')' : ''}`;
        document.getElementById('my-city').textContent = data.city || '—';
        document.getElementById('my-isp').textContent = data.org || '—';
        document.getElementById('my-coords').textContent = 
            data.latitude && data.longitude ? `${data.latitude}, ${data.longitude}` : '—';
        document.getElementById('my-timezone').textContent = data.timezone || '—';
        
    } catch (error) {
        fields.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = 'Ошибка';
        });
        console.error('IP detect error:', error);
    }
}

function copyIpInfo() {
    if (!myIpData) return;
    
    const text = `IP: ${myIpData.ip}
Страна: ${myIpData.country_name}
Город: ${myIpData.city}
Провайдер: ${myIpData.org}
Координаты: ${myIpData.latitude}, ${myIpData.longitude}
Часовой пояс: ${myIpData.timezone}`;
    
    navigator.clipboard.writeText(text).then(() => {
        alert('✓ Информация скопирована');
    });
}

async function checkAnyIp() {
    const input = document.getElementById('check-ip-input').value.trim();
    if (!input) return;
    
    const resultDiv = document.getElementById('check-ip-result');
    resultDiv.style.display = 'block';
    resultDiv.innerHTML = '<div class="ip-loading">Загрузка...</div>';
    
    try {
        const response = await fetch(`https://ipapi.co/${input}/json/`);
        const data = await response.json();
        
        if (data.error) {
            resultDiv.innerHTML = `<div class="ip-error">❌ ${data.reason || 'Неизвестная ошибка'}</div>`;
            return;
        }
        
        resultDiv.innerHTML = `
            <div class="ip-info-grid">
                <div class="ip-info-item">
                    <div class="ip-info-label">IP</div>
                    <div class="ip-info-value">${data.ip || '—'}</div>
                </div>
                <div class="ip-info-item">
                    <div class="ip-info-label">Страна</div>
                    <div class="ip-info-value">${data.country_name || '—'} ${data.country_code ? '(' + data.country_code + ')' : ''}</div>
                </div>
                <div class="ip-info-item">
                    <div class="ip-info-label">Город</div>
                    <div class="ip-info-value">${data.city || '—'}</div>
                </div>
                <div class="ip-info-item">
                    <div class="ip-info-label">Провайдер</div>
                    <div class="ip-info-value">${data.org || '—'}</div>
                </div>
                <div class="ip-info-item">
                    <div class="ip-info-label">Координаты</div>
                    <div class="ip-info-value">${data.latitude}, ${data.longitude}</div>
                </div>
            </div>
            ${data.latitude && data.longitude ? `
                <div style="margin-top:16px;">
                    <a href="https://www.google.com/maps?q=${data.latitude},${data.longitude}" 
                       target="_blank" class="btn btn-ghost" style="display:inline-block;text-decoration:none;">
                        [ 🗺️ Открыть на карте ]
                    </a>
                </div>
            ` : ''}
        `;
        
    } catch (error) {
        resultDiv.innerHTML = `<div class="ip-error">❌ Ошибка: ${error.message}</div>`;
    }
}

// ==================== SPEED TEST ====================

async function runSpeedTest() {
    const btn = document.getElementById('speed-test-btn');
    if (btn.disabled) return;
    btn.disabled = true;
    btn.textContent = '[ ⏳ Тестирование... ]';
    
    document.getElementById('speed-label').textContent = 'Измерение ping...';
    
    // 1. Ping test
    try {
        const pingStart = performance.now();
        await fetch('https://cloudflare.com/cdn-cgi/trace?_=' + Date.now(), { 
            cache: 'no-store', mode: 'no-cors' 
        });
        const ping = Math.round(performance.now() - pingStart);
        document.getElementById('speed-ping').textContent = `${ping} мс`;
    } catch (e) {
        document.getElementById('speed-ping').textContent = '—';
    }
    
    // 2. Download test (10 MB)
    document.getElementById('speed-label').textContent = '↓ Download...';
    
    try {
        const downloadSize = 10 * 1024 * 1024;
        const downloadStart = performance.now();
        
        const response = await fetch(`https://speed.cloudflare.com/__down?bytes=${downloadSize}`, {
            cache: 'no-store'
        });
        
        const reader = response.body.getReader();
        let received = 0;
        
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            received += value.length;
            
            const elapsed = (performance.now() - downloadStart) / 1000;
            const speedMbps = (received * 8) / elapsed / 1000000;
            document.getElementById('speed-value').textContent = speedMbps.toFixed(1);
        }
        
        const downloadTime = (performance.now() - downloadStart) / 1000;
        const downloadSpeed = (received * 8) / downloadTime / 1000000;
        document.getElementById('speed-download').textContent = `${downloadSpeed.toFixed(2)} Мбит/с`;
        
    } catch (e) {
        document.getElementById('speed-download').textContent = 'Ошибка';
    }
    
    // 3. Upload test (1 MB)
    document.getElementById('speed-label').textContent = '↑ Upload...';
    
    try {
        const uploadSize = 1 * 1024 * 1024;
        const data = new Uint8Array(uploadSize);
        for (let i = 0; i < uploadSize; i++) data[i] = Math.random() * 256;

        const uploadStart = performance.now();
        
        await fetch('https://speed.cloudflare.com/__up', {
            method: 'POST',
            body: data,
            cache: 'no-store'
        });
        
        const uploadTime = (performance.now() - uploadStart) / 1000;
        const uploadSpeed = (uploadSize * 8) / uploadTime / 1000000;
        document.getElementById('speed-upload').textContent = `${uploadSpeed.toFixed(2)} Мбит/с`;
        
    } catch (e) {
        document.getElementById('speed-upload').textContent = 'Ошибка';
    }
    
    document.getElementById('speed-label').textContent = '✓ Тест завершён';
    btn.disabled = false;
    btn.textContent = '[ ⚡ Повторить тест ]';
}

// ==================== SSH TERMINAL ====================

function initTerminal() {
    const container = document.getElementById('terminal-container');
    if (!container) {
        console.warn('[SSH] Контейнер терминала не найден');
        return;
    }
    
    // Проверяем, загружена ли библиотека xterm
    if (typeof Terminal === 'undefined') {
        console.error('[SSH] xterm.js не загружен');
        container.innerHTML = '<div style="color:#ef4444;padding:20px;">❌ xterm.js не загружен. Проверьте интернет-соединение.</div>';
        return;
    }
    
    try {
        sshTerm = new Terminal({
            cursorBlink: true,
            fontSize: 14,
            fontFamily: 'Fira Code, Consolas, Monaco, monospace',
            theme: {
                background: '#0b1120',
                foreground: '#e5e7eb',
                cursor: '#22c55e',
                cursorAccent: '#0b1120',
                selectionBackground: 'rgba(56, 189, 248, 0.3)',
                black: '#000000',
                red: '#ef4444',
                green: '#22c55e',
                yellow: '#f59e0b',
                blue: '#38bdf8',
                magenta: '#a855f7',
                cyan: '#06b6d4',
                white: '#e5e7eb',
                brightBlack: '#6b7280',
                brightRed: '#f87171',
                brightGreen: '#4ade80',
                brightYellow: '#fbbf24',
                brightBlue: '#60a5fa',
                brightMagenta: '#c084fc',
                brightCyan: '#22d3ee',
                brightWhite: '#f9fafb'
            },
            convertEol: true,
            scrollback: 5000
        });
        
        // Подключаем аддоны если доступны
        if (typeof FitAddon !== 'undefined' && FitAddon.FitAddon) {
            sshFitAddon = new FitAddon.FitAddon();
            sshTerm.loadAddon(sshFitAddon);
        }
        
        if (typeof WebLinksAddon !== 'undefined' && WebLinksAddon.WebLinksAddon) {
            sshTerm.loadAddon(new WebLinksAddon.WebLinksAddon());
        }
        
        sshTerm.open(container);
        
        if (sshFitAddon) {
            sshFitAddon.fit();
        }
        
        // Приветственное сообщение
        sshTerm.writeln('\x1b[36m╔══════════════════════════════════════════════╗\x1b[0m');
        sshTerm.writeln('\x1b[36m║\x1b[0m  \x1b[32mVLESS SSH Terminal\x1b[0m                           \x1b[36m║\x1b[0m');
        sshTerm.writeln('\x1b[36m║\x1b[0m  \x1b[90mчерез Deno Worker\x1b[0m                          \x1b[36m║\x1b[0m');
        sshTerm.writeln('\x1b[36m╚══════════════════════════════════════════════╝\x1b[0m');
        sshTerm.writeln('');
        sshTerm.writeln('\x1b[33m[INFO]\x1b[0m Введите данные подключения и нажмите [ 🔌 Подключиться ]');
        sshTerm.writeln(`\x1b[90m[INFO]\x1b[0m Worker: ${SSH_WORKER_URL}`);
        sshTerm.writeln('');
        
    } catch (error) {
        console.error('[SSH] Ошибка инициализации:', error);
        container.innerHTML = `<div style="color:#ef4444;padding:20px;">❌ Ошибка: ${error.message}</div>`;
    }
}

async function connectSsh() {
    if (!sshTerm) {
        alert('Терминал не инициализирован');
        return;
    }
    
    const host = document.getElementById('ssh-host').value.trim();
    const port = document.getElementById('ssh-port').value.trim() || '22';
    const user = document.getElementById('ssh-user').value.trim() || 'root';
    const password = document.getElementById('ssh-password').value;
    
    if (!host) {
        sshTerm.writeln('\x1b[31m[ERROR]\x1b[0m Введите хост');
        return;
    }
    
    if (sshConnected) {
        sshTerm.writeln('\x1b[33m[WARN]\x1b[0m Уже подключено. Сначала отключитесь.');
        return;
    }
    
    sshTerm.writeln('');
    sshTerm.writeln(`\x1b[36m[INFO]\x1b[0m Подключение к \x1b[32m${user}@${host}:${port}\x1b[0m...`);
    sshTerm.writeln(`\x1b[90m[INFO]\x1b[0m Через Worker: ${SSH_WORKER_URL}`);
    setSshStatus('connecting', 'подключение...');
    
    try {
        // Формируем WebSocket URL
        const workerHost = new URL(SSH_WORKER_URL).host;
        const wsProtocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${wsProtocol}//${workerHost}/ssh?host=${encodeURIComponent(host)}&port=${encodeURIComponent(port)}&user=${encodeURIComponent(user)}&password=${encodeURIComponent(password)}&cols=${sshTerm.cols}&rows=${sshTerm.rows}`;
        
        sshTerm.writeln(`\x1b[90m[INFO]\x1b[0m WebSocket: ${wsProtocol}//${workerHost}/ssh`);
        
        sshWebSocket = new WebSocket(wsUrl);
        sshWebSocket.binaryType = 'arraybuffer';
        
        sshWebSocket.onopen = () => {
            sshConnected = true;
            sshTerm.writeln('\x1b[32m[OK]\x1b[0m Соединение установлено');
            sshTerm.writeln('\x1b[33m[INFO]\x1b[0m Ожидание аутентификации SSH...\r\n');
            setSshStatus('ok', `подключено к ${host}`);
            
            document.getElementById('ssh-connect-btn').style.display = 'none';
            document.getElementById('ssh-disconnect-btn').style.display = 'inline-block';
            
            // Фокус на терминал
            sshTerm.focus();
        };
        
        sshWebSocket.onmessage = (event) => {
            if (event.data instanceof ArrayBuffer) {
                sshTerm.write(new Uint8Array(event.data));
            } else {
                sshTerm.write(String(event.data));
            }
        };
        
        sshWebSocket.onclose = (event) => {
            const wasConnected = sshConnected;
            sshConnected = false;
            
            sshTerm.writeln('');
            if (wasConnected) {
                sshTerm.writeln(`\x1b[33m[INFO]\x1b[0m Соединение закрыто (код: ${event.code})`);
            }
            setSshStatus('', 'отключено');
            
            document.getElementById('ssh-connect-btn').style.display = 'inline-block';
            document.getElementById('ssh-disconnect-btn').style.display = 'none';
        };
        
        sshWebSocket.onerror = (error) => {
            sshTerm.writeln(`\x1b[31m[ERROR]\x1b[0m Ошибка WebSocket соединения`);
            setSshStatus('err', 'ошибка соединения');
        };
        
        // Отправка ввода с терминала на сервер
        sshTerm.onData((data) => {
            if (sshWebSocket && sshWebSocket.readyState === WebSocket.OPEN) {
                sshWebSocket.send(data);
            }
        });
        
        // Отправка resize событий
        sshTerm.onResize((size) => {
            if (sshWebSocket && sshWebSocket.readyState === WebSocket.OPEN) {
                sshWebSocket.send(JSON.stringify({
                    type: 'resize',
                    cols: size.cols,
                    rows: size.rows
                }));
            }
        });
        
    } catch (error) {
        sshTerm.writeln(`\x1b[31m[ERROR]\x1b[0m ${error.message}`);
        setSshStatus('err', 'ошибка');
    }
}

function disconnectSsh() {
    if (sshWebSocket) {
        sshWebSocket.close();
        sshWebSocket = null;
    }
    sshConnected = false;
    currentSshClient = null;
    
    document.getElementById('ssh-connect-btn').style.display = 'inline-block';
    document.getElementById('ssh-disconnect-btn').style.display = 'none';
    
    if (sshTerm) {
        sshTerm.writeln('\x1b[33m[INFO]\x1b[0m Отключено вручную');
    }
}

function clearTerminal() {
    if (sshTerm) sshTerm.clear();
}

function setSshStatus(type, text) {
    const sb = document.getElementById('ssh-status');
    if (!sb) return;
    sb.className = 'status-bar ' + type;
    const statusText = document.getElementById('ssh-status-text');
    if (statusText) statusText.textContent = text;
}

// ==================== CLIENTS MANAGER ====================

function loadClients() {
    try {
        const saved = localStorage.getItem('vless_clients');
        clients = saved ? JSON.parse(saved) : [];
    } catch (e) {
        clients = [];
    }
}

function saveClients() {
    localStorage.setItem('vless_clients', JSON.stringify(clients));
}

function addClient() {
    const name = document.getElementById('client-name').value.trim();
    const ip = document.getElementById('client-ip').value.trim();
    const httpPort = document.getElementById('client-http-port').value.trim() || '80';
    const sshPort = document.getElementById('client-ssh-port').value.trim() || '22';
    const sshPass = document.getElementById('client-ssh-pass').value;
    
    if (!name || !ip) {
        alert('Введите имя и IP клиента');
        return;
    }
    
    loadClients();
    
    clients.push({
        id: Date.now(),
        name,
        ip,
        httpPort,
        sshPort,
        sshPass,
        addedAt: new Date().toISOString()
    });
    
    saveClients();
    renderClients();
    
    document.getElementById('client-name').value = '';
    document.getElementById('client-ip').value = '';
    document.getElementById('client-ssh-pass').value = '';
}

function deleteClient(id) {
    if (!confirm('Удалить клиента?')) return;
    loadClients();
    clients = clients.filter(c => c.id !== id);
    saveClients();
    renderClients();
}

function editClient(id) {
    loadClients();
    const client = clients.find(c => c.id === id);
    if (!client) return;
    
    const newName = prompt('Имя клиента:', client.name);
    if (newName === null) return;
    
    const newIp = prompt('IP / Домен:', client.ip);
    if (newIp === null) return;
    
    const newPass = prompt('SSH пароль (оставьте пустым, чтобы не менять):', '');
    
    client.name = newName.trim() || client.name;
    client.ip = newIp.trim() || client.ip;
    if (newPass !== null && newPass !== '') {
        client.sshPass = newPass;
    }
    
    saveClients();
    renderClients();
}

function renderClients() {
    loadClients();
    const listDiv = document.getElementById('clients-list');
    
    if (clients.length === 0) {
        listDiv.innerHTML = '<div class="clients-empty">Список клиентов пуст. Добавьте первого клиента выше.</div>';
        return;
    }
    
    listDiv.innerHTML = clients.map(client => `
        <div class="client-card">
            <div class="client-card-header">
                <div class="client-name">${escapeHtml(client.name)}</div>
                <div class="client-actions-top">
                    <button class="copy-item-btn" onclick="editClient(${client.id})">[ ✏️ ]</button>
                    <button class="copy-item-btn" onclick="deleteClient(${client.id})">[ 🗑️ ]</button>
                </div>
            </div>
            <div class="client-info">
                <div class="client-info-row">
                    <span class="client-info-label">IP:</span>
                    <span class="client-info-value">${escapeHtml(client.ip)}</span>
                </div>
                <div class="client-info-row">
                    <span class="client-info-label">LuCI:</span>
                    <span class="client-info-value">:${client.httpPort}</span>
                </div>
                <div class="client-info-row">
                    <span class="client-info-label">SSH:</span>
                    <span class="client-info-value">:${client.sshPort}</span>
                </div>
            </div>
            <div class="client-buttons">
                <button class="btn btn-blue" onclick="openLuci(${client.id})">[ 🌐 LuCI ]</button>
                <button class="btn btn-ghost" onclick="connectToClient(${client.id})">[ 💻 SSH ]</button>
                <button class="btn btn-ghost" onclick="pingClient(${client.id})">[ 📡 Ping ]</button>
            </div>
        </div>
    `).join('');
}

// --- Действия с клиентами ---

function openLuci(id) {
    const client = clients.find(c => c.id === id);
    if (!client) return;
    
    const url = `http://${client.ip}:${client.httpPort}/`;
    
    document.getElementById('luci-modal-title').textContent = `// LuCI — ${client.name}`;
    document.getElementById('luci-iframe').src = url;
    document.getElementById('luci-modal').style.display = 'flex';
}

function closeLuciModal() {
    document.getElementById('luci-modal').style.display = 'none';
    setTimeout(() => { document.getElementById('luci-iframe').src = ''; }, 100);
}

// Подключение к клиенту через SSH (открывает вкладку SSH и подключается)
function connectToClient(id) {
    const client = clients.find(c => c.id === id);
    if (!client) return;
    
    // Если уже подключены — отключаемся
    if (sshConnected) {
        disconnectSsh();
    }
    
    // Переключаемся на вкладку SSH
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    const sshTabBtn = document.querySelector('[data-tab="ssh-terminal"]');
    if (sshTabBtn) sshTabBtn.classList.add('active');
    
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    const sshTabContent = document.getElementById('ssh-terminal');
    if (sshTabContent) sshTabContent.classList.add('active');
    
    // Заполняем форму
    document.getElementById('ssh-host').value = client.ip;
    document.getElementById('ssh-port').value = client.sshPort || '22';
    document.getElementById('ssh-user').value = 'root';
    document.getElementById('ssh-password').value = client.sshPass || '';
    
    currentSshClient = client;
    
    // Подгоняем терминал
    setTimeout(() => {
        if (sshFitAddon) sshFitAddon.fit();
        
        // Автоматически подключаемся
        connectSsh();
    }, 200);
}

async function pingClient(id) {
    const client = clients.find(c => c.id === id);
    if (!client) return;
    
    const start = performance.now();
    try {
        await fetch(`http://${client.ip}:${client.httpPort}/favicon.ico`, {
            mode: 'no-cors',
            cache: 'no-store'
        });
        const ping = Math.round(performance.now() - start);
        alert(`✓ ${client.name} (${client.ip}) доступен\nHTTP Ping: ${ping} мс`);
    } catch (e) {
        const ping = Math.round(performance.now() - start);
        alert(`✗ ${client.name} (${client.ip}) недоступен или блокирует HTTP\nВремя: ${ping} мс`);
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}