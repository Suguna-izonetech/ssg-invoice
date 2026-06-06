import httpx
base = 'http://127.0.0.1:8000/api'
h = httpx.get(base.replace('/api','/api/health'))
print('health', h.status_code, h.json())
login = httpx.post(f'{base}/auth/login', json={'username':'admin','password':'Admin@123456','device_fingerprint':'testfp','device_info':'test'})
print('login status', login.status_code)
print(login.text)
if login.status_code == 200:
    data = login.json()
    headers = {'Authorization': 'Bearer ' + data['access_token']}
    for path in ['/auth/me', '/dashboard/stats', '/invoices?page=1', '/sessions']:
        r = httpx.get(base + path, headers=headers)
        print(path, r.status_code, r.text[:200])
