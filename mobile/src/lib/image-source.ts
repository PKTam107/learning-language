import type { ImageSource } from "expo-image";
import type { CardImage } from "./card-image";

/** Wikimedia rejects Android's default image user agent with HTTP 403. */
export function cardImageSource(photo: CardImage): ImageSource {
  return {
    uri: photo.url,
    ...(photo.source === "commons" ? {
      headers: {
        "User-Agent": "LinguaCards/0.1 (https://learning-language-iota.vercel.app; vocabulary flashcards)",
      },
    } : {}),
  };
}
