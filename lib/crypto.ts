import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";

// AES-256-GCM con una llave derivada de AUTH_SECRET (HKDF).
// Formato: v1:<iv>:<tag>:<ciphertext> (base64url). Si se rota AUTH_SECRET, los
// valores ya cifrados dejan de poder leerse y el usuario tiene que volver a guardarlos.
function key() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET no está definido");
  return Buffer.from(hkdfSync("sha256", secret, "calendario-tamizado", "api-key-encryption", 32));
}

export function encrypt(plain: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return ["v1", iv, cipher.getAuthTag(), data].map((p) => (typeof p === "string" ? p : p.toString("base64url"))).join(":");
}

export function decrypt(payload: string) {
  const [version, iv, tag, data] = payload.split(":");
  if (version !== "v1" || !iv || !tag || !data) throw new Error("Formato cifrado no válido");
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(data, "base64url")), decipher.final()]).toString("utf8");
}

/** sk-ant-...XXXX */
export function maskApiKey(key: string) {
  return `sk-ant-...${key.slice(-4)}`;
}
