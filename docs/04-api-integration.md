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
- Mặc định `AI_PROVIDER=openai` (model `gpt-4o-mini`) — rẻ, đủ tốt cho dịch ngắn.
- Có `GeminiProvider` thay thế (`AI_PROVIDER=gemini`, model `gemini-1.5-flash`).
- Prompt yêu cầu dịch ngắn gọn, tự nhiên, giữ thứ tự, trả JSON array để parse ổn định.
- Nếu không cấu hình key AI → bỏ qua dịch (trả nghĩa tiếng Anh + flag `translationSkipped`), app vẫn chạy.

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
| AI_PROVIDER | server | `openai`\|`gemini` (default openai) |
| OPENAI_API_KEY | server | nếu dùng openai |
| GEMINI_API_KEY | server | nếu dùng gemini |
| NEXT_PUBLIC_SITE_URL | client | cho redirect OAuth |
