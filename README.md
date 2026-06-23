# VLESS Tools

SPA для работы с VLESS-подписками: конвертер, чекер, админка OpenWRT, тест скорости.

## Страницы

| Страница | Описание |
|----------|----------|
| **Конвертер** | Загрузка подписки по URL (через Deno-прокси) или вставка текста. Парсит YAML Clash и base64. Экспорт в Koala Clash YAML и Happ JSON |
| **Чекер** | Проверка доступности VLESS-серверов через WebSocket (ping). Одиночная и массовая проверка |
| **Админка** | OpenWRT terminal (ttyd), IP-lookup (через ip-api.com), тест скорости (ping + download 10MB с Cloudflare) |

## Файлы

- `index.html` — SPA, вся разметка
- `common.js` — утилиты: toast, escapeHtml, particles, tab-switching
- `app.js` — роутер SPA
- `converter.js` — парсинг подписок, экспорт
- `checker.js` — WebSocket ping
- `admin.js` — OpenWRT terminal, IP lookup, speed test
- `style.css` — стили
- `api/main.ts` — Deno Deploy: прокси для подписок, SSH relay, блог (Supabase)
- `ssh-proxy.py` — локальный WebSocket SSH-прокси для ttyd

## Запуск

Просто откройте `index.html` в браузере или залейте на статический хостинг.

Для SSH-терминала (ttyd):
```bash
python3 ssh-proxy.py
```
Затем подключитесь в админке к OpenWRT.

Deno API деплоится отдельно:
```bash
cd api
deno deploy
```
