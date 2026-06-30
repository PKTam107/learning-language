import type { DraftCard, LanguageCode } from "@/types";
import { getDictionaryProvider } from "@/lib/dictionary";
import { getTranslationProvider } from "@/lib/ai";
import { createServiceClient } from "@/lib/supabase/server";

/** Chuẩn hóa từ khóa để cache & lookup nhất quán. */
export function normalizeTerm(word: string): string {
  return word.trim().toLowerCase();
}

/**
 * Orchestrate lookup: cache → dictionary → AI translate → build DraftCard → ghi cache.
 * Đây là logic dùng bởi route handler /api/lookup.
 */
export async function buildDraftCard(
  word: string,
  source: LanguageCode,
  target: LanguageCode
): Promise<DraftCard> {
  const term = normalizeTerm(word);
  const service = safeServiceClient();

  // 1) Cache
  if (service) {
    const { data } = await service
      .from("dictionary_cache")
      .select("payload")
      .eq("term", term)
      .eq("source_language", source)
      .eq("target_language", target)
      .maybeSingle();
    if (data?.payload) {
      return { ...(data.payload as DraftCard), fromCache: true };
    }
  }

  // 2) Dictionary
  const dict = getDictionaryProvider(source);
  const result = await dict.lookup(term, source);
  const translator = getTranslationProvider();

  if (result.notFound) {
    // Cụm từ / từ không có trong dictionary (vd "meaning of life").
    // Fallback: dịch trực tiếp cả cụm để vẫn tạo được thẻ có nghĩa VI.
    if (translator && source !== target) {
      try {
        const [translated] = await translator.translateBatch([term], {
          from: source,
          to: target,
        });
        if (translated && translated.trim()) {
          const draft: DraftCard = {
            term,
            meaningVi: translated,
            definitions: [],
            examples: [],
            sourceLanguage: source,
            targetLanguage: target,
            fromCache: false,
            notFound: true, // vẫn báo client biết đây là tra cứu thủ công
          };
          await writeCache(service, draft);
          return draft;
        }
      } catch {
        // dịch fallback lỗi → trả notFound như cũ
      }
    }
    return {
      term,
      definitions: [],
      examples: [],
      sourceLanguage: source,
      targetLanguage: target,
      notFound: true,
    };
  }

  // 3) Translate (nếu có provider)
  let translationSkipped = false;
  let meaningVi: string | undefined;

  if (translator && source !== target) {
    try {
      const defTexts = result.definitions.map((d) => d.definition);
      const exTexts = result.examples.map((e) => e.text);
      const all = [...defTexts, ...exTexts];
      const translated = await translator.translateBatch(all, {
        from: source,
        to: target,
      });
      result.definitions.forEach((d, i) => {
        d.definitionVi = translated[i];
      });
      result.examples.forEach((e, i) => {
        e.textVi = translated[defTexts.length + i];
      });
      meaningVi = result.definitions[0]?.definitionVi;
    } catch {
      translationSkipped = true;
    }
  } else if (source !== target) {
    translationSkipped = true;
  }

  const draft: DraftCard = {
    term,
    phonetic: result.phonetic,
    audioUs: result.audioUs,
    audioUk: result.audioUk,
    partOfSpeech: result.partOfSpeech,
    meaningVi,
    definitions: result.definitions,
    examples: result.examples,
    sourceLanguage: source,
    targetLanguage: target,
    fromCache: false,
    translationSkipped,
  };

  // 4) Ghi cache (best-effort, không chặn nếu lỗi)
  if (!translationSkipped) {
    await writeCache(service, draft);
  }

  return draft;
}

/** Ghi DraftCard vào dictionary_cache (best-effort, nuốt lỗi). */
async function writeCache(
  service: ReturnType<typeof createServiceClient> | null,
  draft: DraftCard
): Promise<void> {
  if (!service) return;
  await service
    .from("dictionary_cache")
    .upsert(
      {
        term: draft.term,
        source_language: draft.sourceLanguage,
        target_language: draft.targetLanguage,
        payload: draft,
      },
      { onConflict: "term,source_language,target_language" }
    )
    .then(
      () => undefined,
      () => undefined
    );
}

function safeServiceClient() {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
    return createServiceClient();
  } catch {
    return null;
  }
}
