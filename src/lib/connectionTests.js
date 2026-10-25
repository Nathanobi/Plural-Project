// Tests de connexion vers les services externes (Pluralkit, imgbb).
// Ce n'est pas de l'accès aux données de l'app : aucun appel Supabase ici.
// Retour : { status: "valid" | "invalid" | "unreachable", detail: string }

export async function testPluralkit(token) {
  try {
    const res = await fetch("https://api.pluralkit.me/v2/systems/@me", {
      headers: { Authorization: token },
    });
    if (res.ok) {
      const system = await res.json();
      return {
        status: "valid",
        detail: `Système « ${system.name || system.id} » (${system.id}).`,
      };
    }
    if (res.status === 401 || res.status === 403) {
      return { status: "invalid", detail: "Token refusé par Pluralkit." };
    }
    if (res.status === 404) {
      return { status: "valid", detail: "Token accepté, mais aucun système n'y est associé." };
    }
    if (res.status === 429) {
      return { status: "unreachable", detail: "Trop de requêtes, réessaie dans un instant." };
    }
    return { status: "unreachable", detail: `Réponse inattendue (${res.status}).` };
  } catch {
    return { status: "unreachable", detail: "Impossible de joindre l'API Pluralkit (réseau ?)." };
  }
}

// imgbb n'a pas d'endpoint de vérification : on appelle l'upload sans image.
// Clé invalide -> erreur "Invalid API v1 key" (code 100).
// Clé valide -> l'API refuse seulement l'absence d'image.
export async function testImgbb(key) {
  try {
    const body = new FormData();
    body.append("key", key);
    const res = await fetch("https://api.imgbb.com/1/upload", { method: "POST", body });
    let json = null;
    try {
      json = await res.json();
    } catch {
      json = null;
    }
    const code = json?.error?.code;
    const message = json?.error?.message || "";
    if (code === 100 || /invalid api/i.test(message)) {
      return { status: "invalid", detail: "Clé refusée par imgbb." };
    }
    if (res.ok || json?.error) {
      return {
        status: "valid",
        detail: "Clé acceptée (imgbb n'a refusé que l'absence d'image dans le test).",
      };
    }
    return { status: "unreachable", detail: `Réponse inattendue (${res.status}).` };
  } catch {
    return { status: "unreachable", detail: "Impossible de joindre imgbb (réseau ?)." };
  }
}