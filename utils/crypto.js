import crypto from "crypto";

const ENC_KEY = process.env.ENCRYPTION_KEY;

function ensureEncKey() {
  if (!ENC_KEY) throw new Error('ENCRYPTION_KEY is not set in environment');
  if (!Buffer.from(ENC_KEY).length || Buffer.from(ENC_KEY).length < 32) {
    throw new Error('ENCRYPTION_KEY must be at least 32 bytes long (256-bit key)');
  }
}

export function encrypt(text) {
  ensureEncKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", ENC_KEY, iv);

  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");

  const tag = cipher.getAuthTag().toString("hex");
  return `${iv.toString("hex")}:${tag}:${encrypted}`;
}

export function decrypt(enc) {
  ensureEncKey();
  const [ivHex, tagHex, data] = enc.split(":");
  if (!ivHex || !tagHex || !data) throw new Error('Encrypted key is malformed');
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    ENC_KEY,
    Buffer.from(ivHex, "hex")
  );

  decipher.setAuthTag(Buffer.from(tagHex, "hex"));

  let decrypted = decipher.update(data, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}