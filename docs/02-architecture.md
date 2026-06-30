# Architecture — LinguaCards

## 1. Tổng quan stack

| Lớp | Công nghệ | Lý do |
|-----|-----------|-------|
| Frontend/Framework | **Next.js 14 (App Router) + TypeScript** | Full-stack React, có server route handlers để giấu API key, SSR, deploy Vercel dễ |
| Styling | **Tailwind CSS** | Responsive nhanh, mobile-first, không cần CSS riêng nhiều |
| Auth + DB + Storage | **Supabase** (Postgres + Auth + Storage) | Google OAuth có sẵn, RLS, đồng bộ multi-device, free tier |
| Dictionary | **DictionaryAPI.dev** | Free, trả phonetic/audio/POS/definition/example tiếng Anh |
| Translate/AI | **OpenAI / Gemini** (qua provider abstraction) | Dịch nghĩa + ví dụ sang tiếng Việt |
| Validation | **Zod** | Validate payload API & dữ liệu provider |
| State (client) | React hooks + SWR (tùy chọn) | Đơn giản cho MVP |

## 2. Sơ đồ thành phần

```
                    ┌─────────────────────────────────────────────┐
                    │                Browser (Client)             │
                    │  Next.js Pages/Components (App Router)       │
                    │  - Dashboard / Decks / Study / QuickCreator │
                    │  - Supabase browser client (auth + data)    │
                    └───────────────┬─────────────────┬───────────┘
                                    │ RLS-protected   │ fetch
                                    │ direct queries  │ /api/*
                                    ▼                 ▼
        ┌───────────────────────────────┐   ┌──────────────────────────────┐
        │        Supabase                │   │  Next.js Route Handlers       │
        │  - Postgres (decks, cards,     │   │  (server-only, giữ API key)   │
        │    card_progress, profiles,    │   │  - POST /api/lookup           │
        │    dictionary_cache)           │   │  - POST /api/translate        │
        │  - Auth (Google OAuth)         │   └───────┬───────────────┬───────┘
        │  - RLS policies                │           │               │
        └───────────────────────────────┘           ▼               ▼
                                          ┌──────────────────┐ ┌──────────────┐
                                          │ DictionaryAPI.dev│ │ OpenAI/Gemini│
                                          └──────────────────┘ └──────────────┘
```

**Nguyên tắc truy cập dữ liệu:**
- Dữ liệu người dùng (decks/cards/progress): client query **trực tiếp** Supabase, bảo vệ bằng **RLS** theo `auth.uid()`.
- Gọi API bên ngoài (dictionary, AI): **bắt buộc qua route handler** server để không lộ key. Route handler cũng ghi/đọc `dictionary_cache`.

## 3. Cấu trúc thư mục

```
learning-language/
├── docs/                      # Tài liệu spec
├── supabase/
│   └── migrations/
│       └── 0001_init.sql      # Schema + RLS
├── src/
│   ├── app/
│   │   ├── layout.tsx         # Root layout
│   │   ├── page.tsx           # Landing → redirect dashboard nếu đã login
│   │   ├── globals.css
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx          # Google login
│   │   │   └── auth/callback/route.ts  # OAuth callback (exchange code)
│   │   ├── dashboard/page.tsx
│   │   ├── decks/
│   │   │   ├── page.tsx                 # Danh sách deck
│   │   │   └── [deckId]/page.tsx        # Chi tiết deck (danh sách card)
│   │   ├── study/[deckId]/page.tsx      # Study mode
│   │   └── api/
│   │       ├── lookup/route.ts          # Dictionary + dịch → draft card
│   │       └── translate/route.ts       # Dịch text rời
│   ├── components/
│   │   ├── ui/                 # Button, Input, Modal, Spinner...
│   │   ├── flashcard/          # FlashcardFlip, AudioButton, DraftEditor
│   │   ├── deck/               # DeckCard, DeckForm
│   │   └── QuickCreator.tsx    # FAB "+" + modal tạo thẻ nhanh
│   ├── lib/
│   │   ├── supabase/           # client.ts (browser), server.ts, middleware.ts
│   │   ├── dictionary/         # provider interface + dictionaryapi.ts
│   │   ├── ai/                 # provider interface + openai.ts / gemini.ts
│   │   └── db/                 # data-access helpers (decks, cards, progress)
│   ├── types/                  # Kiểu dữ liệu domain + DB
│   └── hooks/                  # useSession, useDecks...
├── middleware.ts              # Refresh session + bảo vệ route
├── .env.example
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.js
└── next.config.js
```

## 4. Luồng chính

### 4.1 Auto-generate flashcard
```
User gõ "resilient" + Enter
  → client POST /api/lookup { word, source:"en", target:"vi" }
    → server: kiểm tra dictionary_cache
        hit  → trả luôn
        miss → DictionaryAPI.dev (phonetic/audio/POS/def/example)
             → AI translate (def + example → vi)
             → ghi cache → trả draft card
  → client hiển thị DraftEditor (sửa được) → "Lưu" → insert vào bảng cards
```

### 4.2 Auth (Google)
```
/login → supabase.auth.signInWithOAuth({ provider:'google', redirectTo:/auth/callback })
  → Google → /auth/callback?code=... → exchangeCodeForSession → set cookies → /dashboard
middleware.ts refresh session mỗi request, chặn route cần đăng nhập.
```

### 4.3 Study session
```
/study/[deckId] → load cards + progress (RLS) → sắp xếp (ưu tiên hard/chưa học)
  → flip + đánh giá → upsert card_progress → next → progress bar
```

## 5. Provider abstraction

- `DictionaryProvider` interface → `DictionaryApiDevProvider` (mặc định). Có thể thêm Oxford/Cambridge sau.
- `TranslationProvider` interface → `OpenAIProvider` / `GeminiProvider`. Chọn qua env `AI_PROVIDER`.
- Factory đọc env, trả provider phù hợp; code gọi không phụ thuộc nhà cung cấp cụ thể.

## 6. Môi trường & Deploy

- Dev: `npm run dev` (localhost:3000). Supabase project riêng cho dev.
- Deploy: Vercel (frontend + route handlers) + Supabase cloud. Set env trên Vercel.
- Secrets chỉ ở server env: `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `GEMINI_API_KEY`.
- Public (client) env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
