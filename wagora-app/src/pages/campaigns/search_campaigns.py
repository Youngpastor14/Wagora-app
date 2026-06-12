import re

file_path = r"C:\Users\SHAH SAAD\Downloads\wagora_product_design\wagora-app\src\pages\campaigns\Campaigns.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    lines = f.readlines()

for idx, line in enumerate(lines):
    if "supabase" in line.lower() or "campaign" in line.lower() or "fetch" in line.lower() or "insert" in line.lower():
        print(f"Line {idx+1}: {line.strip()}")
