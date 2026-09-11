# API Integration — LinguaCards

## 1. Dictionary: DictionaryAPI.dev

- Endpoint: `GET https://api.dictionaryapi.dev/api/v2/entries/en/{word}`
- Miễn phí, không cần key. Trả mảng entry.
- Trích xuất:
  - `phonetic` / `phonetics[].text` → IPA.
  - `phonetics[].audio` → URL audio (lọc theo `-us`/`-uk` trong tên file để phân biệt US/UK).
  - `meanings[].partOfSpeech` → từ loại.
  - `meanings[].definitions[].definition` → định nghĩa (tiếng Anh).
  - `meanings[].definitions[].example` → câu ví dụ (tiếng Anh).
- Lỗi 404 = không tìm thấy từ → trả `notFound`, client cho phép nhập tay.

Hạn chế: chỉ định nghĩa tiếng Anh → cần AI dịch sang tiếng Việt.

## 2. Translate/AI provider

Abstraction `TranslationProvider`:
```ts
interface TranslationProvider {
  translateBatch(texts: string[], opts: { from: string; to: string }): Promise<string[]>;
  // Dịch nghĩa + ví dụ; trả về theo đúng thứ tự input.
}
```

**Chuỗi provider có dự phòng** ([lib/ai/index.ts](../src/lib/ai/index.ts) +
[lib/ai/chain.ts](../src/lib/ai/chain.ts)):

| | Provider | Ghi chú |
|---|---|---|
| Chính | theo `AI_PROVIDER` | Để trống = tự dò: có `GEMINI_API_KEY` → gemini, có `OPENAI_API_KEY` → openai, không có gì → mymemory |
| Dự phòng | theo `AI_FALLBACK` (mặc định `mymemory`) | `off` để tắt. Bỏ qua nếu trùng provider chính |

- **Gemini** (mặc định `gemini-3.5-flash-lite`): dòng Flash có **free tier**, chất lượng
  nghĩa/ví dụ hơn hẳn dịch máy thuần. Chọn Flash-Lite vì việc ở đây chỉ là dịch chuỗi ngắn,
  mà hạn mức free của nó rộng nhất.
  **Trần free theo phút chặt hơn rate limit của chính app** (`/api/lookup` cho 30 lượt/phút),
  nên tra liên tiếp là chạm trần — dự phòng MyMemory là thành phần **chịu tải**, không phải
  phòng hờ. Số cụ thể xem AI Studio → Rate limits (tài liệu Google không ghim con số).
  **Model bị khai tử theo thời gian** (`gemini-2.0-flash` đã shut down, `gemini-1.5-flash`
  không còn trong tài liệu) — dịch hỏng hàng loạt thì kiểm tra tên model trước tiên; chuỗi
  dự phòng sẽ che lỗi này nên nó không tự lộ ra.
- **OpenAI** (`gpt-4o-mini`) không có free tier — chỉ dùng nếu chấp nhận trả tiền.
- **MyMemory** free, không cần key (~5k từ/ngày ẩn danh, ~50k nếu khai `MYMEMORY_EMAIL`).
- **LibreTranslate** cho ai muốn self-host.
- Prompt yêu cầu dịch ngắn gọn, tự nhiên, giữ thứ tự, trả JSON array để parse ổn định.
- Không dựng được provider nào → bỏ qua bước dịch (`translationSkipped`), thẻ vẫn tạo được
  với nghĩa tiếng Anh.

**Khi nào coi là "provider hỏng" và rơi sang provider kế** (`FallbackProvider`):
1. Ném lỗi (mạng, 4xx/5xx, hết quota).
2. Trả về **sai số phần tử** so với input.
3. Trả về **y hệt input**. Đây là ca dễ bỏ sót: provider LLM parse hỏng thì
   `parseTranslationArray` trả về chính input thay vì ném lỗi — nhìn như thành công mà thực
   chất không dịch gì. Chỉ xét khi batch có ít nhất một chuỗi không rỗng.

Nhờ vậy hết quota chỉ làm **chất lượng dịch giảm**, không làm hỏng việc tạo thẻ.

## 3. Route handlers (server)

> Các route handler này phục vụ **cả web lẫn mobile**. Web xác thực bằng cookie cùng
> origin; app mobile gửi `Authorization: Bearer <access_token>` của session Supabase
> (xem [06-mobile.md](./06-mobile.md)).

### `POST /api/lookup`
Request:
```json
{ "word": "resilient", "source": "en", "target": "vi" }
```
Xử lý:
1. Normalize `word` (trim, lowercase).
2. Đọc `dictionary_cache`; nếu hit → trả luôn.
3. Miss → gọi DictionaryAPI.dev → build cấu trúc → gọi AI dịch nghĩa+ví dụ.
4. Ghi cache → trả `DraftCard`.

Response (`DraftCard`):
```json
{
  "term": "resilient",
  "phonetic": "/rɪˈzɪl.i.ənt/",
  "audioUs": "https://.../resilient-us.mp3",
  "audioUk": "https://.../resilient-uk.mp3",
  "partOfSpeech": "adjective",
  "meaningVi": "kiên cường; có khả năng phục hồi",
  "definitions": [
    { "partOfSpeech": "adjective", "definition": "able to recover quickly", "definitionVi": "có khả năng phục hồi nhanh" }
  ],
  "examples": [
    { "text": "a resilient economy", "textVi": "một nền kinh tế có sức bật" }
  ],
  "sourceLanguage": "en",
  "targetLanguage": "vi",
  "fromCache": false,
  "translationSkipped": false
}
```

### `POST /api/translate`
Dịch text rời (dùng khi người dùng sửa và muốn dịch lại 1 ví dụ).
```json
// req
{ "texts": ["a resilient economy"], "from": "en", "to": "vi" }
// res
{ "translations": ["một nền kinh tế có sức bật"] }
```

## 4. Bảo mật & chi phí

- Tất cả key (OpenAI/Gemini, Supabase service role) chỉ ở server env, không prefix `NEXT_PUBLIC_`.
- Cache `dictionary_cache` cắt giảm gọi lặp + token AI.
- Rate limit cơ bản (tùy chọn nâng cao): giới hạn lookup theo user/IP để tránh lạm dụng.

## 5. Biến môi trường (xem `.env.example`)

| Biến | Phạm vi | Bắt buộc |
|------|---------|----------|
| NEXT_PUBLIC_SUPABASE_URL | client | ✅ |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | client | ✅ |
| SUPABASE_SERVICE_ROLE_KEY | server | ✅ (cho cache/server ops) |
| AI_PROVIDER | server | không — để trống là tự dò theo key |
| AI_FALLBACK | server | không — mặc định `mymemory`, `off` để tắt |
| GEMINI_API_KEY / GEMINI_MODEL | server | nếu dùng gemini (khuyến nghị) |
| OPENAI_API_KEY / OPENAI_MODEL | server | nếu dùng openai |
| MYMEMORY_EMAIL | server | không — khai email để tăng quota |
| LIBRETRANSLATE_URL / _API_KEY | server | nếu dùng libretranslate |
| NEXT_PUBLIC_SITE_URL | client | cho redirect OAuth |
