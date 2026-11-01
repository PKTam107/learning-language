#!/usr/bin/env bash
# Chạy từ cron hoặc GitHub Actions; không in khóa hay nội dung phản hồi.
set -euo pipefail
: "${SUPABASE_URL:?Thiếu SUPABASE_URL}"
: "${SUPABASE_SERVICE_ROLE_KEY:?Thiếu SUPABASE_SERVICE_ROLE_KEY}"

# Upsert cùng một dòng để tạo hoạt động ghi thật mà không đụng dữ liệu học.
code=$(curl --silent --show-error --output /dev/null --write-out '%{http_code}' \
  --connect-timeout 10 --max-time 30 --retry 2 --retry-delay 3 \
  --request POST "${SUPABASE_URL%/}/rest/v1/system_heartbeat?on_conflict=id" \
  --header "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  --header "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  --header 'Content-Type: application/json' \
  --header 'Prefer: resolution=merge-duplicates,return=minimal' \
  --data "{\"id\":\"daily\",\"last_seen_at\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}")
if [[ "$code" != "201" && "$code" != "200" && "$code" != "204" ]]; then
  echo "Heartbeat thất bại (HTTP $code). Kiểm tra migration 0014, secrets và trạng thái project." >&2
  exit 1
fi
echo "Heartbeat đã cập nhật ($(date -u +%Y-%m-%dT%H:%M:%SZ))."
