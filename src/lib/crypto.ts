import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

// Chiffrement des accès transmis par les clients (AES-256-GCM).
// La clé vient de CREDENTIALS_ENCRYPTION_KEY (32 octets en base64) :
// générez-la avec `openssl rand -base64 32` et ne la perdez pas,
// sinon les accès déjà enregistrés ne pourront plus être déchiffrés.

function key() {
  const raw = process.env.CREDENTIALS_ENCRYPTION_KEY;
  const buf = raw ? Buffer.from(raw, "base64") : null;
  if (!buf || buf.length !== 32) {
    throw new Error("CREDENTIALS_ENCRYPTION_KEY manquante ou invalide (32 octets en base64 attendus).");
  }
  return buf;
}

export function encrypt(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64"), cipher.getAuthTag().toString("base64"), data.toString("base64")].join(":");
}

export function decrypt(payload: string): string {
  const [version, iv, tag, data] = payload.split(":");
  if (version !== "v1" || !iv || !tag || !data) throw new Error("Format chiffré inconnu");
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(data, "base64")), decipher.final()]).toString("utf8");
}
