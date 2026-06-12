import os

workspace = r"C:\Users\SHAH SAAD\Downloads\wagora_product_design"
sql_files = []

for root, dirs, files in os.walk(workspace):
    for file in files:
        if file.endswith(".sql"):
            sql_files.append(os.path.join(root, file))

print("SQL files found:", sql_files)
