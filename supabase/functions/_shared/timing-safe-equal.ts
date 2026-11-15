/**
 * Constant-time string comparison for secrets (bearer tokens, API keys).
 *
 * Both inputs are hashed with SHA-256 first so the comparison always runs
 * over two 32-byte digests: timing reveals neither the position of the first
 * mismatching character nor the length of the expected secret.
 *
 * The strings are hashed as UTF-16 code units. That encoding is injective,
 * unlike TextEncoder's UTF-8, which maps every lone surrogate to U+FFFD and
 * would make some different strings compare equal.
 */
function utf16Bytes(value: string) {
  const bytes = new Uint8Array(value.length * 2);
  for (let i = 0; i < value.length; i += 1) {
    const unit = value.charCodeAt(i);
    bytes[2 * i] = unit >>> 8;
    bytes[2 * i + 1] = unit & 0xff;
  }
  return bytes;
}

export async function timingSafeEqualStrings(a: string, b: string): Promise<boolean> {
  const [digestA, digestB] = await Promise.all([
    crypto.subtle.digest("SHA-256", utf16Bytes(a)),
    crypto.subtle.digest("SHA-256", utf16Bytes(b)),
  ]);
  const bytesA = new Uint8Array(digestA);
  const bytesB = new Uint8Array(digestB);
  let diff = 0;
  for (let i = 0; i < bytesA.length; i += 1) {
    diff |= bytesA[i] ^ bytesB[i];
  }
  return diff === 0;
}
