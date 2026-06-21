# VLESS Tools

> VLESS-инструменты, конвертер подписок, чекер серверов, блог и админ-панель.
> Single-page приложение на чистом JS. Бэкенд — Deno Deploy Worker.

---

## Возможности

| Раздел | Описание |
|--------|----------|
| **Конвертер** (`/#converter`) | Извлечение VLESS-ссылок из подписок (URL, файл, JSON, YAML, base64, gzip, HTML панелей) |
| **Чекер** (`/#checker`) | Проверка доступности VLESS-серверов с пингом, статистикой и экспортом |
| **Блог** (`/#blog`) | Заметки и наблюдения с Markdown-постами через админ-панель |
| **Админ-панель** (`/#admin`) | IP-геолокация, тест скорости (SVG-спидометр), SSH-терминал (xterm.js), управление клиентами OpenWRT, редактор блога |

---

## Как это работает

SPA с хеш-роутингом — все страницы в одном `index.html`, навигация через `/#page`.  
Данные конвертера обрабатываются локально в браузере — ничего не отправляется на сервер.

Для блога и SSH используется Deno Deploy Worker (`api/main.ts`):
- Blog API: CRUD постов, GitHub OAuth авторизация
- SSH: WebSocket-прокси до сервера
- Speed test: Cloudflare-эндпоинты

---

## Бэкенд

`api/main.ts` — единый Deno Deploy Worker, объединяет:

- **SSH WebSocket прокси** — подключение к любому SSH-серверу через браузер
- **HTTP subscription proxy** — загрузка подписок через сервер (обходит CORS)
- **Blog API** — `/api/posts` (CRUD), `/api/me` (профиль)
- **GitHub OAuth** — `/auth/github/login`, `/auth/github/callback` для авторизации админов
- **JWT** — токены для защиты blog API

Переменные окружения (Deno Deploy):
- `GITHUB_CLIENT_ID` — ID GitHub OAuth App
- `GITHUB_CLIENT_SECRET` — секрет GitHub OAuth App
- `JWT_SECRET` — секрет для подписи JWT
- `ALLOWED_USERS` — список GitHub логинов через запятую

---

## Технологии

**Frontend**: HTML5, CSS3, Vanilla JS (SPA с хеш-роутингом)  
**Терминал**: [xterm.js](https://xtermjs.org/)  
**Бэкенд**: [Deno Deploy](https://deno.com/deploy) (TypeScript)  
**Хостинг**: GitHub Pages / custom domain  
**Аутентификация**: GitHub OAuth + JWT

---

## Локальный запуск

```bash
# Просто открой index.html в браузере
# Или через HTTP-сервер (рекомендуется для blog API / OAuth):
python -m http.server 5500
```

Для блога и SSH нужен запущенный Deno Deploy Worker.

---

## Структура

```
index.html          — SPA entry point, шаблоны всех страниц
style.css           — все стили (тёмная тема, анимации, адаптивность)
app.js              — роутер, навигация, OAuth callback
common.js           — общая конфигурация (BLOG_API_URL, SITE_CONFIG)
converter.js        — конвертер подписок
checker.js          — чекер серверов
blog.js             — блог (список постов)
admin.js            — админ-панель (IP, speedtest, SSH, клиенты, редактор блога)
api/main.ts         — Deno Deploy Worker (SSH, blog API, OAuth)
```

---

## Лицензия

MIT
