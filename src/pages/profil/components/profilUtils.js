// Logique pure des profils : validation, complétude, statut de synchro,
// valeurs et commandes Pluralkit à copier. Aucun accès aux données ici.

export const HEX_RE = /^#[0-9A-Fa-f]{6}$/;
export const PK_ID_RE = /^[a-z]{5,6}$/;
export const LIMITS = { displayName: 100, pronouns: 100, description: 1000 };

export const MISSING_LABEL = { avatar: "Sans avatar", proxy: "Sans proxy" };

export const SYNC_LABEL = {
  never: "Jamais synchronisé",
  modified: "Modifié localement",
  ok: "À jour",
};

export const SYNC_CLASS = {
  never: "profil-row__badge-neutral",
  modified: "ps-badge-warning",
  ok: "ps-badge-success",
};

export function proxyExample(proxy) {
  return `${proxy.prefix || ""}text${proxy.suffix || ""}`;
}

// Calculé à partir de sync_meta + updated_at (data-model.md §4).
// Le statut "conflit" viendra avec la conversation dédiée à la synchro.
export function syncStatus(profil, meta) {
  if (!meta?.last_sync_at) return "never";
  if (Date.parse(profil.updated_at) > Date.parse(meta.last_sync_at)) return "modified";
  return "ok";
}

// ctx = { prenomById, imageById, proxyById, metaByProfil }
// Les ids orphelins (proxy supprimé, etc.) sont ignorés à l'affichage.
export function buildEntry(profil, ctx) {
  const prenom = ctx.prenomById[profil.prenom_id] || null;
  const image = profil.image_id ? ctx.imageById[profil.image_id] || null : null;
  const proxys = (profil.proxy_ids || []).map((id) => ctx.proxyById[id]).filter(Boolean);
  const missing = [];
  if (!image) missing.push("avatar");
  if (proxys.length === 0) missing.push("proxy");
  return {
    profil,
    prenom,
    image,
    proxys,
    missing,
    complete: missing.length === 0,
    sync: syncStatus(profil, ctx.metaByProfil[profil.id]),
  };
}

// Valeurs prêtes à coller (Pluralkit attend la couleur sans "#").
export function pkValues(entry) {
  const { profil, prenom, image, proxys } = entry;
  const rows = [];
  if (prenom) rows.push({ label: "Nom", value: prenom.nom });
  if (profil.display_name) rows.push({ label: "Nom d'affichage", value: profil.display_name });
  if (profil.pronouns) rows.push({ label: "Pronoms", value: profil.pronouns });
  if (profil.color) rows.push({ label: "Couleur", value: profil.color.replace("#", "") });
  if (profil.birthday) rows.push({ label: "Anniversaire", value: profil.birthday });
  if (profil.description) rows.push({ label: "Description", value: profil.description });
  if (image?.url_hebergee) rows.push({ label: "Avatar (lien)", value: image.url_hebergee });
  proxys.forEach((p, i) => rows.push({ label: `Proxy ${i + 1}`, value: proxyExample(p) }));
  return rows;
}

// Commandes à envoyer au bot, une par message.
// Si l'ID PK est connu, on cible le membre par cet ID et on ne le recrée pas.
export function pkCommands(entry) {
  const { profil, prenom, image, proxys } = entry;
  if (!prenom) return [];
  const ref = profil.pk_id || `"${prenom.nom}"`;
  const base = `pk;member ${ref}`;
  const cmds = [];
  if (!profil.pk_id) cmds.push(`pk;member new "${prenom.nom}"`);
  if (profil.display_name) cmds.push(`${base} displayname ${profil.display_name}`);
  if (profil.pronouns) cmds.push(`${base} pronouns ${profil.pronouns}`);
  if (profil.color) cmds.push(`${base} color ${profil.color.replace("#", "")}`);
  if (profil.birthday) cmds.push(`${base} birthdate ${profil.birthday}`);
  if (profil.description) cmds.push(`${base} description ${profil.description}`);
  if (image?.url_hebergee) cmds.push(`${base} avatar ${image.url_hebergee}`);
  for (const p of proxys) cmds.push(`${base} proxy add ${proxyExample(p)}`);
  return cmds;
}