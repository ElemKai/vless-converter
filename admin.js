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
let speedTestAbortController = null;

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
            
            if (tabName === 'ssh-terminal' && sshFitAddon) {
                setTimeout(() => sshFitAddon.fit(), 100);
            }
        });
    });
    
    detectMyIp();
    renderClients();
    initTerminal();
    
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
    
    let ip = null;
    let geoData = null;
    
    // ========== ШАГ 1: Получаем IP адрес ==========
    const ipApis = [
        {
            name: 'ipify.org',
            url: 'https://api.ipify.org/?format=json',
            parse: (data) => data.ip
        },
        {
            name: 'ip.sb',
            url: 'https://ip.sb/json',
            parse: (data) => data.ip
        },
        {
            name: 'myip.com',
            url: 'https://api.myip.com/json',
            parse: (data) => data.ip
        },
        {
            name: 'httpbin.org',
            url: 'https://httpbin.org/ip',
            parse: (data) => data.origin
        }
    ];
    
    for (const api of ipApis) {
        try {
            console.log(`[IP] Получаем IP через ${api.name}...`);
            const response = await fetch(api.url, { cache: 'no-store' });
            if (!response.ok) {
                console.warn(`[IP] ${api.name} вернул HTTP ${response.status}`);
                continue;
            }
            
            const data = await response.json();
            ip = api.parse(data);
            
            if (ip) {
                console.log(`[IP] ✓ IP получен: ${ip}`);
                break;
            }
        } catch (error) {
            console.warn(`[IP] ${api.name} ошибка:`, error.message);
        }
    }
    
    // Устанавливаем IP сразу
    const ipEl = document.getElementById('my-ip');
    if (ipEl) ipEl.textContent = ip || 'Недоступно';
    
    // ========== ШАГ 2: Получаем геолокацию по IP ==========
    if (ip) {
        const geoApis = [
            {
                name: 'freeipapi.com',
                url: `https://freeipapi.com/api/json/${ip}`,
                parse: (data) => ({
                    country_name: data.countryName,
                    country_code: data.countryCode,
                    city: data.cityName,
                    org: '—',
                    latitude: data.latitude,
                    longitude: data.longitude,
                    timezone: data.timeZone
                })
            },
            {
                name: 'ip-api.com',
                url: `http://ip-api.com/json/${ip}?fields=status,message,country,countryCode,city,org,lat,lon,timezone,isp`,
                parse: (data) => ({
                    country_name: data.country,
                    country_code: data.countryCode,
                    city: data.city,
                    org: data.org || data.isp || '—',
                    latitude: data.lat,
                    longitude: data.lon,
                    timezone: data.timezone
                })
            },
            {
                name: 'ipapi.co',
                url: `https://ipapi.co/${ip}/json/`,
                parse: (data) => ({
                    country_name: data.country_name,
                    country_code: data.country_code,
                    city: data.city,
                    org: data.org || '—',
                    latitude: data.latitude,
                    longitude: data.longitude,
                    timezone: data.timezone
                })
            }
        ];
        
        for (const api of geoApis) {
            try {
                console.log(`[GEO] Получаем геолокацию через ${api.name}...`);
                const response = await fetch(api.url, { 
                    cache: 'no-store',
                    headers: { 'Accept': 'application/json' }
                });
                
                if (!response.ok) {
                    console.warn(`[GEO] ${api.name} вернул HTTP ${response.status}`);
                    continue;
                }
                
                const data = await response.json();
                
                if (data.error || data.status === 'fail') {
                    console.warn(`[GEO] ${api.name} вернул ошибку:`, data.reason || data.message);
                    continue;
                }
                
                geoData = api.parse(data);
                console.log(`[GEO] ✓ Геолокация получена через ${api.name}`);
                break;
                
            } catch (error) {
                console.warn(`[GEO] ${api.name} ошибка:`, error.message);
            }
        }
    }
    
    // ========== ШАГ 3: Заполняем поля ==========
    if (geoData) {
        myIpData = { ip, ...geoData };
        
        document.getElementById('my-country').textContent = 
            `${geoData.country_name || '—'} ${geoData.country_code ? '(' + geoData.country_code + ')' : ''}`;
        document.getElementById('my-city').textContent = geoData.city || '—';
        document.getElementById('my-isp').textContent = geoData.org || '—';
        document.getElementById('my-coords').textContent = 
            geoData.latitude && geoData.longitude ? `${geoData.latitude}, ${geoData.longitude}` : '—';
        document.getElementById('my-timezone').textContent = geoData.timezone || '—';
    } else {
        // Если геолокацию не получили — показываем прочерки
        ['my-country', 'my-city', 'my-isp', 'my-coords', 'my-timezone'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = '—';
        });
    }
}

function copyIpInfo() {
    if (!myIpData) {
        alert('Данные ещё не загружены');
        return;
    }
    
    const text = `IP: ${myIpData.ip}
Страна: ${myIpData.country_name || '—'}
Город: ${myIpData.city || '—'}
Провайдер: ${myIpData.org || '—'}
Координаты: ${myIpData.latitude && myIpData.longitude ? `${myIpData.latitude}, ${myIpData.longitude}` : '—'}
Часовой пояс: ${myIpData.timezone || '—'}`;
    
    navigator.clipboard.writeText(text).then(() => {
        alert('✓ Информация скопирована');
    }).catch(() => {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        alert('✓ Информация скопирована');
    });
}

async function checkAnyIp() {
    const input = document.getElementById('check-ip-input').value.trim();
    if (!input) {
        alert('Введите IP адрес или домен');
        return;
    }
    
    const resultDiv = document.getElementById('check-ip-result');
    resultDiv.style.display = 'block';
    resultDiv.innerHTML = '<div class="ip-loading">Загрузка...</div>';
    
    const apis = [
        {
            name: 'freeipapi.com',
            url: `https://freeipapi.com/api/json/${input}`,
            parse: (data) => ({
                ip: data.ipAddress,
                country_name: data.countryName,
                country_code: data.countryCode,
                city: data.cityName,
                region: data.regionName,
                org: '—',
                latitude: data.latitude,
                longitude: data.longitude,
                timezone: data.timeZone
            })
        },
        {
            name: 'ip-api.com',
            url: `http://ip-api.com/json/${input}?fields=status,message,country,countryCode,region,city,org,lat,lon,timezone,isp,query`,
            parse: (data) => ({
                ip: data.query,
                country_name: data.country,
                country_code: data.countryCode,
                city: data.city,
                region: data.region,
                org: data.org || data.isp || '—',
                latitude: data.lat,
                longitude: data.lon,
                timezone: data.timezone
            })
        }
    ];
    
    for (const api of apis) {
        try {
            const response = await fetch(api.url, {
                cache: 'no-store',
                headers: { 'Accept': 'application/json' }
            });
            
            if (!response.ok) continue;
            
            const data = await response.json();
            
            if (data.error || data.status === 'fail') {
                resultDiv.innerHTML = `<div class="ip-error">❌ ${data.reason || data.message || 'Неизвестная ошибка'}</div>`;
                return;
            }
            
            const parsed = api.parse(data);
            
            resultDiv.innerHTML = `
                <div class="ip-info-grid">
                    <div class="ip-info-item">
                        <div class="ip-info-label">IP</div>
                        <div class="ip-info-value">${parsed.ip || '—'}</div>
                    </div>
                    <div class="ip-info-item">
                        <div class="ip-info-label">Страна</div>
                        <div class="ip-info-value">${parsed.country_name || '—'} ${parsed.country_code ? '(' + parsed.country_code + ')' : ''}</div>
                    </div>
                    <div class="ip-info-item">
                        <div class="ip-info-label">Город</div>
                        <div class="ip-info-value">${parsed.city || '—'}</div>
                    </div>
                    <div class="ip-info-item">
                        <div class="ip-info-label">Регион</div>
                        <div class="ip-info-value">${parsed.region || '—'}</div>
                    </div>
                    <div class="ip-info-item">
                        <div class="ip-info-label">Провайдер</div>
                        <div class="ip-info-value">${parsed.org || '—'}</div>
                    </div>
                    <div class="ip-info-item">
                        <div class="ip-info-label">Координаты</div>
                        <div class="ip-info-value">${parsed.latitude && parsed.longitude ? `${parsed.latitude}, ${parsed.longitude}` : '—'}</div>
                    </div>
                    <div class="ip-info-item">
                        <div class="ip-info-label">Часовой пояс</div>
                        <div class="ip-info-value">${parsed.timezone || '—'}</div>
                    </div>
                </div>
                ${parsed.latitude && parsed.longitude ? `
                    <div style="margin-top:16px;">
                        <a href="https://www.google.com/maps?q=${parsed.latitude},${parsed.longitude}" 
                           target="_blank" class="btn btn-ghost" style="display:inline-block;text-decoration:none;">
                            [ 🗺️ Открыть на карте ]
                        </a>
                    </div>
                ` : ''}
            `;
            
            console.log(`[IP] ✓ Проверка через ${api.name} успешна`);
            return;
            
        } catch (error) {
            console.warn(`[IP] ${api.name} ошибка:`, error.message);
            continue;
        }
    }
    
    resultDiv.innerHTML = `<div class="ip-error">❌ Все API недоступны. Попробуйте позже.</div>`;
}

// ==================== SPEED TEST (как Яндекс Интернетометр) ====================

function updateSpeedometer(speedMbps) {
    const maxSpeed = 2000;
    const normalizedSpeed = Math.min(speedMbps, maxSpeed);
    const logSpeed = Math.log10(normalizedSpeed + 1) / Math.log10(maxSpeed + 1);
    const angle = -90 + (logSpeed * 180);
    
    const needle = document.getElementById('speed-needle');
    if (needle) {
        needle.setAttribute('transform', `rotate(${angle} 200 200)`);
    }
    
    const arc = document.getElementById('speed-arc');
    if (arc) {
        const totalLength = 502;
        const offset = totalLength - (logSpeed * totalLength);
        arc.setAttribute('stroke-dashoffset', offset);
    }
    
    const valueText = document.getElementById('speed-value-text');
    if (valueText) {
        if (speedMbps < 10) {
            valueText.textContent = speedMbps.toFixed(1);
        } else if (speedMbps < 100) {
            valueText.textContent = speedMbps.toFixed(0);
        } else {
            valueText.textContent = Math.round(speedMbps);
        }
    }
}

async function runSpeedTest() {
    const btn = document.getElementById('speed-test-btn');
    if (btn.disabled) return;
    
    if (speedTestAbortController) {
        speedTestAbortController.abort();
    }
    speedTestAbortController = new AbortController();
    
    btn.disabled = true;
    btn.textContent = '[ ⏳ Тестирование... ]';
    
    updateSpeedometer(0);
    document.getElementById('speed-download').textContent = '—';
    document.getElementById('speed-upload').textContent = '—';
    document.getElementById('speed-ping').textContent = '—';
    document.getElementById('speed-jitter').textContent = '—';
    document.getElementById('speed-label').textContent = 'Инициализация...';
    
    // ========== 1. PING TEST (10 замеров, медиана + jitter) ==========
    document.getElementById('speed-label').textContent = '📡 Измерение задержки...';
    
    const pings = [];
    try {
        for (let i = 0; i < 10; i++) {
            if (speedTestAbortController.signal.aborted) return;
            
            const pingStart = performance.now();
            await fetch(`https://speed.cloudflare.com/__down?bytes=0&r=${Math.random()}`, {
                cache: 'no-store',
                signal: speedTestAbortController.signal
            });
            const ping = performance.now() - pingStart;
            pings.push(ping);
            
            document.getElementById('speed-ping').textContent = `${Math.round(ping)} мс`;
            await new Promise(r => setTimeout(r, 100));
        }
        
        pings.sort((a, b) => a - b);
        const medianPing = pings[Math.floor(pings.length / 2)];
        document.getElementById('speed-ping').textContent = `${Math.round(medianPing)} мс`;
        
        const jitter = pings.reduce((sum, p) => sum + Math.abs(p - medianPing), 0) / pings.length;
        document.getElementById('speed-jitter').textContent = `${Math.round(jitter)} мс`;
        
    } catch (e) {
        if (e.name === 'AbortError') return;
        document.getElementById('speed-ping').textContent = '—';
    }
    
    // ========== 2. DOWNLOAD TEST (методика Яндекса) ==========
    document.getElementById('speed-label').textContent = '↓ Измерение входящей скорости...';
    
    try {
        const PARALLEL_CONNECTIONS = 6;
        const CHUNK_SIZE = 25 * 1024 * 1024;
        const WARMUP_TIME = 2000;
        const MEASUREMENT_TIME = 10000;
        const UI_UPDATE_INTERVAL = 100;
        
        const downloadStart = performance.now();
        let totalReceived = 0;
        let lastTotalReceived = 0;
        let lastUpdateTime = downloadStart;
        const speedSamples = [];
        const WINDOW_SIZE = 500;
        
        const downloadPromises = [];
        
        for (let i = 0; i < PARALLEL_CONNECTIONS; i++) {
            const promise = (async () => {
                const response = await fetch(
                    `https://speed.cloudflare.com/__down?bytes=${CHUNK_SIZE}&r=${Math.random()}-${i}`,
                    {
                        cache: 'no-store',
                        signal: speedTestAbortController.signal
                    }
                );
                
                const reader = response.body.getReader();
                
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    if (speedTestAbortController.signal.aborted) break;
                    
                    totalReceived += value.length;
                }
            })();
            
            downloadPromises.push(promise);
        }
        
        const uiUpdater = setInterval(() => {
            const now = performance.now();
            const elapsed = now - downloadStart;
            
            if (elapsed < WARMUP_TIME) {
                document.getElementById('speed-label').textContent = 
                    `↓ Прогрев... ${((WARMUP_TIME - elapsed) / 1000).toFixed(1)}с`;
                return;
            }
            
            const deltaTime = (now - lastUpdateTime) / 1000;
            const deltaBytes = totalReceived - lastTotalReceived;
            const instantSpeed = (deltaBytes * 8) / deltaTime / 1000000;
            
            speedSamples.push({ time: now, speed: instantSpeed });
            
            while (speedSamples.length > 0 && now - speedSamples[0].time > WINDOW_SIZE) {
                speedSamples.shift();
            }
            
            const avgSpeed = speedSamples.reduce((sum, s) => sum + s.speed, 0) / speedSamples.length;
            
            updateSpeedometer(avgSpeed);
            
            lastTotalReceived = totalReceived;
            lastUpdateTime = now;
            
            if (elapsed > MEASUREMENT_TIME + WARMUP_TIME) {
                clearInterval(uiUpdater);
            }
        }, UI_UPDATE_INTERVAL);
        
        await Promise.allSettled(downloadPromises);
        clearInterval(uiUpdater);
        
        const finalSamples = speedSamples.filter(s => 
            (downloadStart + MEASUREMENT_TIME + WARMUP_TIME) - s.time < 3000
        );
        
        let finalDownloadSpeed;
        if (finalSamples.length > 0) {
            finalDownloadSpeed = finalSamples.reduce((sum, s) => sum + s.speed, 0) / finalSamples.length;
        } else {
            const totalTime = (performance.now() - downloadStart - WARMUP_TIME) / 1000;
            finalDownloadSpeed = (totalReceived * 8) / totalTime / 1000000;
        }
        
        updateSpeedometer(finalDownloadSpeed);
        document.getElementById('speed-download').textContent = `${finalDownloadSpeed.toFixed(2)} Мбит/с`;
        
        console.log(`[SPEED] Download: ${finalDownloadSpeed.toFixed(2)} Мбит/с ` +
                    `(${(totalReceived / 1024 / 1024).toFixed(1)} МБ, ` +
                    `${PARALLEL_CONNECTIONS} соединений)`);
        
    } catch (e) {
        if (e.name === 'AbortError') return;
        console.error('[SPEED] Download error:', e);
        document.getElementById('speed-download').textContent = 'Ошибка';
    }
    
    // ========== 3. UPLOAD TEST ==========
    document.getElementById('speed-label').textContent = '↑ Измерение исходящей скорости...';
    await new Promise(r => setTimeout(r, 500));
    
    try {
        const PARALLEL_UPLOADS = 4;
        const UPLOAD_CHUNK = 5 * 1024 * 1024;
        const WARMUP_TIME = 1500;
        const MEASUREMENT_TIME = 8000;
        const UI_UPDATE_INTERVAL = 100;
        
        const uploadStart = performance.now();
        let totalSent = 0;
        let lastTotalSent = 0;
        let lastUpdateTime = uploadStart;
        const speedSamples = [];
        
        const generateData = (size) => {
            const data = new Uint8Array(size);
            for (let i = 0; i < size; i += 4096) {
                const chunk = Math.min(4096, size - i);
                for (let j = 0; j < chunk; j++) {
                    data[i + j] = Math.floor(Math.random() * 256);
                }
            }
            return data;
        };
        
        const uploadPromises = [];
        
        for (let i = 0; i < PARALLEL_UPLOADS; i++) {
            const promise = (async () => {
                for (let round = 0; round < 5; round++) {
                    if (speedTestAbortController.signal.aborted) break;
                    
                    const data = generateData(UPLOAD_CHUNK);
                    
                    await fetch(`https://speed.cloudflare.com/__up?r=${Math.random()}-${i}-${round}`, {
                        method: 'POST',
                        body: data,
                        cache: 'no-store',
                        signal: speedTestAbortController.signal
                    });
                    
                    totalSent += data.length;
                }
            })();
            
            uploadPromises.push(promise);
        }
        
        const uiUpdater = setInterval(() => {
            const now = performance.now();
            const elapsed = now - uploadStart;
            
            if (elapsed < WARMUP_TIME) {
                document.getElementById('speed-label').textContent = 
                    `↑ Прогрев... ${((WARMUP_TIME - elapsed) / 1000).toFixed(1)}с`;
                return;
            }
            
            const deltaTime = (now - lastUpdateTime) / 1000;
            const deltaBytes = totalSent - lastTotalSent;
            const instantSpeed = (deltaBytes * 8) / deltaTime / 1000000;
            
            speedSamples.push({ time: now, speed: instantSpeed });
            
            while (speedSamples.length > 0 && now - speedSamples[0].time > 500) {
                speedSamples.shift();
            }
            
            const avgSpeed = speedSamples.reduce((sum, s) => sum + s.speed, 0) / speedSamples.length;
            updateSpeedometer(avgSpeed);
            
            lastTotalSent = totalSent;
            lastUpdateTime = now;
            
            if (elapsed > MEASUREMENT_TIME + WARMUP_TIME) {
                clearInterval(uiUpdater);
            }
        }, UI_UPDATE_INTERVAL);
        
        await Promise.allSettled(uploadPromises);
        clearInterval(uiUpdater);
        
        const finalSamples = speedSamples.filter(s => 
            (uploadStart + MEASUREMENT_TIME + WARMUP_TIME) - s.time < 3000
        );
        
        let finalUploadSpeed;
        if (finalSamples.length > 0) {
            finalUploadSpeed = finalSamples.reduce((sum, s) => sum + s.speed, 0) / finalSamples.length;
        } else {
            const totalTime = (performance.now() - uploadStart - WARMUP_TIME) / 1000;
            finalUploadSpeed = (totalSent * 8) / totalTime / 1000000;
        }
        
        updateSpeedometer(finalUploadSpeed);
        document.getElementById('speed-upload').textContent = `${finalUploadSpeed.toFixed(2)} Мбит/с`;
        
        console.log(`[SPEED] Upload: ${finalUploadSpeed.toFixed(2)} Мбит/с ` +
                    `(${(totalSent / 1024 / 1024).toFixed(1)} МБ)`);
        
    } catch (e) {
        if (e.name === 'AbortError') return;
        console.error('[SPEED] Upload error:', e);
        document.getElementById('speed-upload').textContent = 'Ошибка';
    }
    
    document.getElementById('speed-label').textContent = '✓ Тест завершён';
    btn.disabled = false;
    btn.textContent = '[ ⚡ Повторить тест ]';
    speedTestAbortController = null;
}

// ==================== SSH TERMINAL ====================

function initTerminal() {
    const container = document.getElementById('terminal-container');
    if (!container) {
        console.warn('[SSH] Контейнер терминала не найден');
        return;
    }
    
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
        
        sshTerm.onData((data) => {
            if (sshWebSocket && sshWebSocket.readyState === WebSocket.OPEN) {
                sshWebSocket.send(data);
            }
        });
        
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

function connectToClient(id) {
    const client = clients.find(c => c.id === id);
    if (!client) return;
    
    if (sshConnected) {
        disconnectSsh();
    }
    
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    const sshTabBtn = document.querySelector('[data-tab="ssh-terminal"]');
    if (sshTabBtn) sshTabBtn.classList.add('active');
    
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    const sshTabContent = document.getElementById('ssh-terminal');
    if (sshTabContent) sshTabContent.classList.add('active');
    
    document.getElementById('ssh-host').value = client.ip;
    document.getElementById('ssh-port').value = client.sshPort || '22';
    document.getElementById('ssh-user').value = 'root';
    document.getElementById('ssh-password').value = client.sshPass || '';
    
    currentSshClient = client;
    
    setTimeout(() => {
        if (sshFitAddon) sshFitAddon.fit();
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