import re
import json
from pathlib import Path

# 輸入與輸出檔案
input_file = Path("easylist.txt")
output_file = Path("easy.json")

if not input_file.exists():
    print("❌ 找不到 easylist.txt，請放在與此腳本相同的資料夾內。")
    exit(1)

# 判斷是否為封鎖規則（排除註解與白名單）
def is_block_rule(line):
    return (
        line and
        not line.startswith("!") and
        not line.startswith("@@") and
        "##" not in line and
        "#@#" not in line and
        "###" not in line
    )

# 將 EasyList 規則轉換為 DNR JSON 規則
def convert_to_rule(url_filter, rule_id):
    return {
        "id": rule_id,
        "priority": 1,
        "action": { "type": "block" },
        "condition": {
            "urlFilter": url_filter,
            "resourceTypes": ["script", "image", "sub_frame"]
        }
    }

# 開始轉換
rules = []
with input_file.open(encoding="utf-8") as f:
    lines = [line.strip() for line in f if line.strip()]

rule_id = 1
for line in lines:
    if is_block_rule(line):
        # 簡化常見過濾語法
        filter_text = line
        filter_text = re.sub(r"^\|\|", "", filter_text)
        filter_text = re.sub(r"[\*\^]", "", filter_text)
        filter_text = filter_text.strip()

        if 5 <= len(filter_text) <= 100:
            rules.append(convert_to_rule(filter_text, rule_id))
            rule_id += 1

        if rule_id > 30000:  # DNR 上限
            break

# 輸出成 easy.json
with output_file.open("w", encoding="utf-8") as f:
    json.dump(rules, f, indent=2, ensure_ascii=False)

print(f"✅ 已轉換 {len(rules)} 條規則，輸出為 {output_file}")
