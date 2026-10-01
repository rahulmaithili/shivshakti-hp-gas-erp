import re

with open('app.js', 'r', encoding='utf-8') as f:
    app_js = f.read()
with open('Code.gs', 'r', encoding='utf-8') as f:
    code_gs = f.read()

client_calls = sorted(list(set(re.findall(r"apiCall\s*\(\s*['\"]([^'\"]+)['\"]", app_js))))
server_actions = sorted(list(set(re.findall(r"case\s+['\"]([^'\"]+)['\"]:", code_gs) + ['login', 'ping'])))

print(f"Client API actions ({len(client_calls)}):", client_calls)
print(f"Server API actions ({len(server_actions)}):", server_actions)

missing = [c for c in client_calls if c not in server_actions]
print("Missing on Server:", missing)
assert len(missing) == 0, f"Missing actions: {missing}"
print("ALL CLIENT CALLS MATCH SERVER ACTIONS PERFECTLY!")
