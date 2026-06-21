#!/usr/bin/env python3
"""
VLESS Tools — Local WebSocket proxy
- HTTP fetch: ws://127.0.0.1:8888?mode=fetch → HTTP(S) (uses your home IP)
- SSH proxy:  ws://127.0.0.1:8888 → SSH TCP to any host
"""
import asyncio, asyncssh, json
import websockets
from urllib.request import Request, urlopen
from urllib.parse import urlparse

HOST = '127.0.0.1'
PORT = 8888

async def handle_fetch(url):
    try:
        req = Request(url, headers={
            'User-Agent': 'Hiddify/1.24.1 (Android 13)',
            'Accept': '*/*',
        })
        loop = asyncio.get_event_loop()
        resp = await loop.run_in_executor(None, lambda: urlopen(req, timeout=15))
        body = resp.read().decode('utf-8', errors='replace')
        headers = dict(resp.headers.items())
        return {'type': 'fetch_result', 'status': resp.status, 'body': body, 'headers': headers}
    except Exception as e:
        return {'type': 'fetch_result', 'status': 0, 'body': '', 'error': str(e)}

async def handle(ws):
    q = ws.path.split('?', 1)[-1] if '?' in ws.path else ''
    params = dict(p.split('=', 1) for p in q.split('&') if '=' in p)

    if params.get('mode') == 'fetch':
        msg = await ws.recv()
        try:
            d = json.loads(msg)
            url = d.get('url', '')
        except:
            url = msg.strip()
        if url:
            result = await handle_fetch(url)
            await ws.send(json.dumps(result))
        return

    msg = json.loads(await ws.recv())
    host = msg.get('host')
    port = msg.get('port', 22)
    user = msg.get('user', 'root')
    password = msg.get('password', '')
    cols = msg.get('cols', 80)
    rows = msg.get('rows', 24)
    if not host:
        await ws.send(json.dumps({'type': 'error', 'text': 'No host'}))
        return

    try:
        conn = await asyncssh.connect(host, port=port, username=user,
            password=password, known_hosts=None)
        writer, reader = await conn.open_session(
            term_type='xterm-256color', cols=cols, rows=rows)
        await ws.send(json.dumps({'type': 'ready', 'text': 'SSH connected'}))

        async def read_loop():
            while True:
                data = await reader.read(4096)
                if not data:
                    break
                await ws.send(json.dumps({'type': 'data', 'text': data}))

        async def write_loop():
            async for msg in ws:
                try:
                    d = json.loads(msg)
                    if d.get('type') == 'stdin':
                        writer.write(d['data'])
                except:
                    pass

        await asyncio.gather(read_loop(), write_loop())
    except Exception as e:
        await ws.send(json.dumps({'type': 'error', 'text': str(e)}))

async def main():
    print(f'VLESS Local Proxy on ws://{HOST}:{PORT}')
    print(f'  HTTP fetch: ws://{HOST}:{PORT}?mode=fetch  (send {"url"} as JSON or text)')
    print(f'  SSH proxy:  ws://{HOST}:{PORT}            (send JSON credentials)')
    async with websockets.serve(handle, HOST, PORT):
        await asyncio.Future()

if __name__ == '__main__':
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass
