# VLESS Tools

> VLESS-инструменты, конвертер подписок, чекер серверов, блог и админ-панель.
> Single-page приложение на чистом JS. Бэкенд — Deno Deploy Worker.

---

## Возможности

| Раздел | Ссылка | Описание |
|--------|--------|----------|
| **Конвертер** | `/#converter` | Извлечение VLESS из подписок (URL, файл, YAML, JSON, base64) |
| **Чекер** | `/#checker` | Проверка доступности VLESS-серверов с пингом и статистикой |
| **Блог** | `/#blog` | Markdown-посты с админ-панели |
| **Админ-панель** | `/#admin` | 3 SSH-терминала, IP-инструменты, тест скорости, клиенты, редактор блога |

---

## 🖥️ Терминал OpenWRT (ttyd) — самый простой способ с телефона

В админ-панели есть вкладка **OpenWRT (ttyd)** — открывает терминал роутера прямо на сайте.

### Установка ttyd на OpenWRT

```bash
# Подключись к роутеру по SSH
ssh root@192.168.2.1

# Установи ttyd
opkg update
opkg install ttyd

# Запусти (вручную или добавь в /etc/rc.local):
ttyd -p 7681 login

# Для автозапуска при загрузке:
cat > /etc/init.d/ttyd-custom << 'EOF'
#!/bin/sh /etc/rc.common
START=99
start() {
    /usr/bin/ttyd -p 7681 login
}
stop() {
    killall ttyd
}
EOF
chmod +x /etc/init.d/ttyd-custom
/etc/init.d/ttyd-custom enable
/etc/init.d/ttyd-custom start
```

После установки:
1. Открой сайт `/#admin`
2. Перейди на вкладку **OpenWRT (ttyd)**
3. Нажми **Открыть** — терминал появится в iframe

Также доступно напрямую: **http://192.168.2.1:7681**

---

## 💻 Локальный SSH (через WebSocket-прокси)

Альтернативный способ для ПК через Python-прокси:

```bash
pip install websockets asyncssh
python ssh-proxy.py
```

В админке на вкладке **Локальный SSH** укажи `ws://127.0.0.1:8888` и подключись.

---

## Файлы

```
index.html          — SPA entry point, шаблоны страниц
style.css           — все стили (тёмная тема, анимации)
app.js              — роутер, навигация
common.js           — конфигурация, инициализация страниц
admin.js            — админ-панель (SSH, ttyd, IP, speedtest, клиенты, блог)
converter.js        — конвертер подписок
checker.js          — чекер серверов
blog.js             — блог (список постов)
ssh-proxy.py        — локальный WebSocket SSH-прокси (Python)
terminal.html       — отдельная страница терминала
api/main.ts         — Deno Deploy Worker (SSH, blog API, OAuth)
```
