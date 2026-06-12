import os

workspace = r"C:\Users\SHAH SAAD\Downloads\wagora_product_design"
matches = []

for root, dirs, files in os.walk(workspace):
    # Skip large directories
    if any(p in root for p in ["node_modules", "venv", ".git", "__pycache__"]):
        continue
    for file in files:
        if file.endswith((".env", ".local", ".json", ".config", ".ts", ".py", ".yml", ".yaml")):
            path = os.path.join(root, file)
            try:
                with open(path, "r", encoding="utf-8", errors="ignore") as f:
                    for idx, line in enumerate(f):
                        if any(k in line.lower() for k in ["postgres://", "db_password", "database_url", "db_pass"]):
                            matches.append(f"{path}:{idx+1}: {line.strip()}")
            except Exception:
                pass

print("Matches found:")
for m in matches:
    print(m)
