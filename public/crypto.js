const encoder = new TextEncoder();
const decoder = new TextDecoder();
const iterations = 600_000;

async function deriveKey(passphrase, salt) {
  const passwordKey = await crypto.subtle.importKey(
    'raw', encoder.encode(passphrase), 'PBKDF2', false, ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

function toBase64(bytes) {
  return btoa(String.fromCharCode(...bytes));
}

function fromBase64(value) {
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
}

export async function encryptNote(text, passphrase) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoder.encode(text));
  return {
    version: 1,
    salt: toBase64(salt),
    iv: toBase64(iv),
    ciphertext: toBase64(new Uint8Array(encrypted)),
  };
}

export async function decryptNote(record, passphrase) {
  if (record.version !== 1) throw new Error('Unsupported note format');
  const iv = fromBase64(record.iv);
  const key = await deriveKey(passphrase, fromBase64(record.salt));
  const result = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv }, key, fromBase64(record.ciphertext),
  );
  return decoder.decode(result);
}
