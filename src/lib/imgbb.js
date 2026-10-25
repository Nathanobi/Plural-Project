import { getCollection } from "./storage";

// Noms possibles de la clé dans config_settings.connexions (jsonb).
// Ajuste cette liste si ta page Connexions utilise un autre nom.
const KEY_NAMES = ["imgbbKey", "imgbb_key", "imgbbApiKey", "imgbb_api_key", "imgbb"];

export async function getImgbbKey() {
  const rows = await getCollection("settings");
  const connexions = rows[0]?.connexions || {};
  for (const name of KEY_NAMES) {
    const value = connexions[name];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

// Envoie un fichier/blob à imgbb et renvoie le lien direct.
// La clé n'est jamais loguée ni écrite dans le journal.
export async function uploadToImgbb(blob, name) {
  const key = await getImgbbKey();
  if (!key) {
    throw new Error("Clé imgbb introuvable. Renseigne-la dans Configuration > Connexions.");
  }
  const form = new FormData();
  form.append("image", blob, name || "image.jpg");
  const res = await fetch(`https://api.imgbb.com/1/upload?key=${encodeURIComponent(key)}`, {
    method: "POST",
    body: form,
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }
  if (!res.ok || !json?.success) {
    const reason = json?.error?.message;
    throw new Error(reason ? `imgbb : ${reason}` : `Échec de l'envoi à imgbb (HTTP ${res.status}).`);
  }
  return json.data.url;
}