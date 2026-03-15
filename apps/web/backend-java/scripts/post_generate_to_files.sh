#!/usr/bin/env bash
set -euo pipefail

# [EN] Sends POST /api/soup/generate and writes long outputs to files.
# [JA] POST /api/soup/generate を実行し、長い出力をファイルへ保存します。

BASE_URL="${BASE_URL:-http://localhost:8080}"
OUTPUT_DIR="${OUTPUT_DIR:-./tmp/generate-output}"
INGREDIENTS_CSV="${INGREDIENTS_CSV:-tomato,onion,miso}"

mkdir -p "$OUTPUT_DIR"

JSON_OUT="$OUTPUT_DIR/response.json"
DATA_URL_OUT="$OUTPUT_DIR/image_data_url.txt"
PNG_OUT="$OUTPUT_DIR/image.png"
SUMMARY_OUT="$OUTPUT_DIR/summary.txt"

python3 - "$INGREDIENTS_CSV" <<'PY' > "$OUTPUT_DIR/request.json"
import json
import sys

ingredients_csv = sys.argv[1]
ingredients = [x.strip() for x in ingredients_csv.split(',') if x.strip()]
print(json.dumps({"ingredients": ingredients}, ensure_ascii=False))
PY

curl -sS -X POST "$BASE_URL/api/soup/generate" \
  -H 'Content-Type: application/json' \
  --data @"$OUTPUT_DIR/request.json" \
  > "$JSON_OUT"

python3 - "$JSON_OUT" "$DATA_URL_OUT" "$PNG_OUT" "$SUMMARY_OUT" <<'PY'
import base64
import json
import pathlib
import sys

json_path = pathlib.Path(sys.argv[1])
data_url_path = pathlib.Path(sys.argv[2])
png_path = pathlib.Path(sys.argv[3])
summary_path = pathlib.Path(sys.argv[4])

obj = json.loads(json_path.read_text(encoding='utf-8'))

image_data_url = obj.get('imageDataUrl', '') or ''
flavor = obj.get('flavor', {})
comment = obj.get('comment', '') or ''

data_url_path.write_text(image_data_url, encoding='utf-8')

saved_png = False
if image_data_url.startswith('data:image/') and ';base64,' in image_data_url:
    b64 = image_data_url.split(';base64,', 1)[1]
    if b64.strip():
        png_path.write_bytes(base64.b64decode(b64))
        saved_png = True

summary_lines = [
    f"ingredients={obj.get('ingredients', [])}",
    f"flavor={flavor}",
    f"comment={comment}",
    f"imageDataUrlLength={len(image_data_url)}",
    f"imageSaved={saved_png}",
]
summary_path.write_text("\n".join(summary_lines) + "\n", encoding='utf-8')

print(f"saved: {json_path}")
print(f"saved: {data_url_path}")
if saved_png:
    print(f"saved: {png_path}")
else:
    print("image png not saved (empty or missing data URL)")
print(f"saved: {summary_path}")
PY
