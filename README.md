# 🛠️ VLESS Tools

> Полный набор инструментов для работы с VLESS, подписками и сетью.  
> Всё работает прямо в браузере — ваши данные никуда не отправляются.

<p align="center">
    <a href="https://elemkai.github.io/vless-converter/">
        <img src="https://img.shields.io/badge/🌐-Открыть_сайт-38bdf8?style=for-the-badge" alt="Demo">
    </a>
    <a href="https://github.com/elemkai/vless-converter">
        <img src="https://img.shields.io/github/stars/elemkai/vless-converter?style=for-the-badge&color=22c55e" alt="Stars">
    </a>
    <img src="https://img.shields.io/badge/License-MIT-22c55e?style=for-the-badge" alt="License">
    <img src="https://img.shields.io/badge/Browser-100%25-38bdf8?style=for-the-badge" alt="Browser">
</p>

---

## 📦 Инструменты

| Инструмент | Описание | Статус |
|------------|----------|--------|
| ⚡ [**VLESS Converter**](#-vless-converter) | Конвертация конфигов и подписок в VLESS-ссылки | ✅ Активно |
| 🔍 [**VLESS Checker**](#-vless-checker) | Проверка доступности серверов и измерение пинга | ✅ Активно |
| 🛠️ [**Админ-панель**](#️-админ-панель) | IP-инструменты, тест скорости, SSH, управление клиентами | ✅ Активно |
| 🛡️ WireGuard Generator | Генерация конфигов WireGuard | 🚧 Скоро |
| 🔧 Config Editor | Редактор конфигов с подсветкой | 🚧 Скоро |

---

## ⚡ VLESS Converter

**URL:** [`/converter.html`](https://elemkai.github.io/vless-converter/converter.html)

Мощный конвертер, который умеет извлекать VLESS-ссылки из любых источников — как это делают Happ и FlClashX.

### Возможности

- 📡 **Загрузка подписок по URL** — через CORS-прокси или собственный Worker
- 📁 **Загрузка из файла** — drag & drop или выбор файла
- 📝 **Ручная вставка** — base64, JSON, plain text
- 🔄 **Конвертация Koala Clash** (YAML) → VLESS
- 🔄 **Конвертация Happ JSON** → VLESS
- 🎯 **Умный парсинг** — автоматически распознаёт:
  - Base64 (стандартный и URL-safe)
  - Gzip + Base64
  - JSON панели (Stun.su, V2board, 3x-ui)
  - HTML с закодированными ссылками
- 🌐 **Happ-эмуляция** — через собственный Deno/Cloudflare Worker
- 💾 **Массовая обработка** — все серверы сразу
- 📋 **Копирование** одной ссылки или всех сразу
- 💾 **Скачивание** всех ссылок в `.txt`

### Как это работает


---

## 🔍 VLESS Checker

**URL:** [`/checker.html`](https://elemkai.github.io/vless-converter/checker.html)

Проверка доступности VLESS серверов с подробной статистикой.

### Возможности

- 📡 Массовая проверка списка серверов
- ⏱️ Измерение времени отклика (ping)
- 📊 Статистика: онлайн / офлайн / средний пинг
- 🎛️ Настройка таймаута и количества параллельных проверок
- 📋 Копирование результатов в текстовом формате
- 💾 Экспорт в CSV для анализа в Excel
- 🗂️ Сортировка: онлайн-серверы сначала, по пингу

---

## 🛠️ Админ-панель

**URL:** [`/admin.html`](https://elemkai.github.io/vless-converter/admin.html)

Полноценная админ-панель для сетевых задач.

### 🌐 IP & Геолокация

- 🎯 Автоматическое определение вашего IP
- 🗺️ Геолокация: страна, город, провайдер, координаты
- 🔍 Проверка любого IP или домена
- 🗺️ Открытие на Google Maps

### ⚡ Тест скорости (как Яндекс Интернетометр)

- 📊 **SVG-спидометр** с градиентной дугой и стрелкой
- 🚀 **6 параллельных соединений** для точного измерения
- ⏱️ **Warmup 2 сек** — отбрасываем медленный старт
- 📈 **Sliding window** — сглаживание скачков
- 📡 **Ping** — 10 замеров, медиана
- 📊 **Jitter** — среднее отклонение
- 📉 Шкала 0-2000 Мбит/с (логарифмическая)

### 💻 SSH Терминал

- 🔌 Подключение к SSH через браузер
- 🌐 Через Deno Worker (бесплатно)
- 🎨 Цветной терминал (xterm.js)
- 📏 Автоматический resize
- 🔐 Поддержка resize сессии

### 📡 Управление клиентами OpenWRT

- ➕ Добавление клиентов (имя, IP, порты, пароль)
- 🌐 **[ 🌐 LuCI ]** — веб-интерфейс роутера в iframe
- 💻 **[ 💻 SSH ]** — быстрое подключение через терминал
- 📡 **[ 📡 Ping ]** — проверка доступности
- 💾 Сохранение в `localStorage`

---

## 🎨 Дизайн

Все страницы выполнены в едином стиле:

- 🌑 Тёмная тема с неоновыми акцентами
- 💚 Цвета: `#38bdf8` (голубой), `#22c55e` (зелёный)
- 🔤 Моноширинный шрифт (терминальный стиль)
- 📱 Полная адаптивность (десктоп, планшет, мобильный)
- 🍔 Бургер-меню для мобильных
- ✨ Анимации и плавные переходы

---

## 🛠 Технологии

| Категория | Технология |
|-----------|-----------|
| Frontend | HTML5, CSS3, Vanilla JavaScript |
| Терминал | [xterm.js](https://xtermjs.org/) |
| Хостинг | GitHub Pages |
| Worker | [Deno Deploy](https://deno.com/deploy) |
| API | ipify.org, freeipapi.com, ip-api.com |
| Speed Test | Cloudflare Speed Test endpoints |

---

## 🚀 Установка и деплой

### Локально

```bash
git clone https://github.com/elemkai/vless-converter.git
cd vless-converter
# Откройте index.html в браузере
