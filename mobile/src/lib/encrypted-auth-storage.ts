import { gcm } from "@noble/ciphers/aes";
import { bytesToHex, hexToBytes } from "@noble/ciphers/utils";

interface Storage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

// Hermes on older Expo SDKs may not provide TextEncoder/TextDecoder.
function encode(value: string): Uint8Array {
  const encoded = encodeURIComponent(value).replace(/%([0-9A-F]{2})/g,
    (_match, hex: string) => String.fromCharCode(parseInt(hex, 16)));
  return Uint8Array.from(encoded, (character) => character.charCodeAt(0));
}

function decode(value: Uint8Array): string {
  return decodeURIComponent(Array.from(value, (byte) => `%${byte.toString(16).padStart(2, "0")}`).join(""));
}

/** Large sessions stay encrypted in ordinary storage; only a 256-bit key enters the OS vault. */
export function createEncryptedAuthStorage(
  storage: Storage,
  vault: Storage,
  randomBytes: (length: number) => Uint8Array,
): Storage {
  // Serialize migration, refresh writes and sign-out, including after a rejected operation.
  let pending: Promise<unknown> = Promise.resolve();
  function serialized<T>(operation: () => Promise<T>): Promise<T> {
    const result = pending.then(operation);
    pending = result.catch(() => undefined);
    return result;
  }

  const cipherKey = (key: string) => `linguacards.auth.v1.${key}`;
  const vaultKey = (key: string) => `linguacards.auth.${bytesToHex(encode(key))}`;

  async function write(key: string, value: string) {
    let secret = await vault.getItem(vaultKey(key));
    if (secret === null) {
      secret = bytesToHex(randomBytes(32));
      await vault.setItem(vaultKey(key), secret);
    }
    // Fresh nonce on EVERY write, even when rewriting identical session data.
    const nonce = randomBytes(12);
    const ciphertext = gcm(hexToBytes(secret), nonce, encode(key)).encrypt(encode(value));
    await storage.setItem(cipherKey(key), `v1:${bytesToHex(nonce)}:${bytesToHex(ciphertext)}`);
  }

  return {
    getItem: (key) => serialized(async () => {
      const encrypted = await storage.getItem(cipherKey(key));
      if (encrypted !== null) {
        // Never resurrect an old plaintext session when encrypted data exists.
        await storage.removeItem(key);
        // Native vault failures propagate; they are not treated as a missing key.
        const secret = await vault.getItem(vaultKey(key));
        if (secret !== null) {
          try {
            const [version, nonce, ciphertext, extra] = encrypted.split(":");
            if (version !== "v1" || !nonce || !ciphertext || extra !== undefined) throw new Error();
            return decode(gcm(hexToBytes(secret), hexToBytes(nonce), encode(key)).decrypt(hexToBytes(ciphertext)));
          } catch {
            // Corrupted, tampered, or restored without its original key: require login.
          }
        }
        await vault.removeItem(vaultKey(key));
        await storage.removeItem(cipherKey(key));
        return null;
      }

      const legacy = await storage.getItem(key);
      if (legacy === null) return null;
      try {
        await write(key, legacy);
      } finally {
        // Even a failed migration must not leave a usable plaintext refresh token.
        await storage.removeItem(key);
      }
      return legacy;
    }),
    setItem: (key, value) => serialized(async () => {
      await storage.removeItem(key);
      await write(key, value);
    }),
    removeItem: (key) => serialized(async () => {
      await storage.removeItem(key);
      // Destroy the key first: ciphertext left by a failed disk delete is unusable.
      await vault.removeItem(vaultKey(key));
      await storage.removeItem(cipherKey(key));
    }),
  };
}
