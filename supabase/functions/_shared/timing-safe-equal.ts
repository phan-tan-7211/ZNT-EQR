/**
 * Constant-time string comparison for secrets (bearer tokens, API keys).
 *
 * Both inputs are hashed with SHA-256 first so the comparison always runs
 * over two 32-byte digests: timing reveals neither the position of the first
 * mismatching character nor the length of the expected secret.
 */
export async function timingSafeEqualStrings(a: string, b: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const [digestA, digestB] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(a)),
    crypto.subtle.digest("SHA-256", encoder.encode(b)),
  ]);
  const bytesA = new Uint8Array(digestA);
  const bytesB = new Uint8Array(digestB);
  let diff = 0;
  for (let i = 0; i < bytesA.length; i += 1) {
    diff |= bytesA[i] ^ bytesB[i];
  }
  return diff === 0;
}
