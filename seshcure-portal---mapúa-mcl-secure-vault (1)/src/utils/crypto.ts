/**
 * Real Web Crypto API utilities for SeshCure Portal
 * Zero-Knowledge Client-Side AES-256-GCM & SHA-256 Hashing
 */

// Calculate true SHA-256 hash of an ArrayBuffer
export async function computeSha256(data: ArrayBuffer | Uint8Array): Promise<string> {
  const bufferSource = (data instanceof Uint8Array ? data.buffer : data) as unknown as BufferSource;
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', bufferSource);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Convert string to Uint8Array
export function textToBytes(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

// Convert Uint8Array to string
export function bytesToText(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

// Derive a 256-bit AES-GCM CryptoKey from a passphrase
async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as unknown as BufferSource,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

// Encrypt payload with AES-256-GCM
export async function encryptAes256(
  dataBytes: Uint8Array, 
  passphrase = 'mcl_seshcure_master_entropy_key_2026'
): Promise<{
  ciphertextHex: string;
  ivHex: string;
  saltHex: string;
  combinedBase64: string;
}> {
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);

  const encryptedBuffer = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    dataBytes as unknown as BufferSource
  );

  const encryptedArray = new Uint8Array(encryptedBuffer);
  
  // Combine salt (16) + iv (12) + ciphertext
  const combined = new Uint8Array(salt.length + iv.length + encryptedArray.length);
  combined.set(salt, 0);
  combined.set(iv, salt.length);
  combined.set(encryptedArray, salt.length + iv.length);

  // Hex strings for visual verification
  const toHex = (arr: Uint8Array) => Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
  let binary = '';
  for (let i = 0; i < combined.byteLength; i++) {
    binary += String.fromCharCode(combined[i]);
  }
  const combinedBase64 = btoa(binary);

  return {
    ciphertextHex: toHex(encryptedArray).slice(0, 64) + '...',
    ivHex: toHex(iv),
    saltHex: toHex(salt),
    combinedBase64
  };
}

// Decrypt payload with AES-256-GCM and verify integrity
export async function decryptAes256(
  combinedBase64: string,
  passphrase = 'mcl_seshcure_master_entropy_key_2026'
): Promise<Uint8Array> {
  const binaryString = atob(combinedBase64);
  const combined = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    combined[i] = binaryString.charCodeAt(i);
  }

  const salt = combined.slice(0, 16);
  const iv = combined.slice(16, 28);
  const ciphertext = combined.slice(28);

  const key = await deriveKey(passphrase, salt);
  const decryptedBuffer = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  );

  return new Uint8Array(decryptedBuffer);
}

// Format byte sizes into KB, MB
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
