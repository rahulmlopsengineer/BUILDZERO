import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const KEY = crypto.scryptSync(process.env.AUTH_SECRET || "default-salt", "salt", 32);

/**
 * Encrypts a sensitive string (e.g. Vercel Token) using AES-256-GCM.
 * Output format: iv:authTag:encryptedContent
 */
export function encryptToken(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  
  const authTag = cipher.getAuthTag().toString("hex");
  
  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

/**
 * Decrypts a string encrypted by encryptToken.
 */
export function decryptToken(encryptedData: string): string {
  const [ivHex, authTagHex, encryptedText] = encryptedData.split(":");
  
  if (!ivHex || !authTagHex || !encryptedText) {
    throw new Error("Invalid encrypted data format");
  }
  
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
  
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encryptedText, "hex", "utf8");
  decrypted += decipher.final("utf8");
  
  return decrypted;
}
