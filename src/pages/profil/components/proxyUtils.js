// Logique pure des proxys : formatage, correspondance, conflits, suggestions.
// Règle appliquée (simulation locale) : insensible à la casse, contenu non vide
// entre préfixe et suffixe, le proxy le plus long (préfixe + suffixe) l'emporte.

export const SAMPLE = "text";

export const CONFLICT_LABEL = {
  identique: "Identique",
  ambigu: "Ambigu",
  chevauchement: "Chevauchement",
  doublon: "Doublon",
};

export const CONFLICT_HINT = {
  identique: "Même proxy sur deux prénoms différents : impossible de savoir qui parle.",
  ambigu: "Un même message peut déclencher les deux prénoms à égalité.",
  chevauchement:
    "Un même message peut correspondre aux deux ; le plus long l'emporte, l'autre ne se déclenche que si le premier ne correspond pas.",
  doublon: "Ce prénom a deux fois le même proxy.",
};

const low = (s) => (s || "").toLowerCase();

// Minuscules + sans accents (pour les suggestions et la recherche).
export const fold = (s) =>
  (s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

export const proxyKey = (p) => `${low(p.prefix)}\u0000${low(p.suffix)}`;

export const formatProxy = (p, text = SAMPLE) => `${p.prefix || ""}${text}${p.suffix || ""}`;

const specificity = (p) => (p.prefix || "").length + (p.suffix || "").length;

// Renvoie { content } si le message déclenche ce proxy, sinon null.
export function matchProxy(p, message) {
  const prefix = low(p.prefix);
  const suffix = low(p.suffix);
  if (!prefix && !suffix) return null;
  const msg = message.trim();
  const lower = low(msg);
  if (lower.length < prefix.length + suffix.length) return null;
  if (!lower.startsWith(prefix) || !lower.endsWith(suffix)) return null;
  const content = msg.slice(prefix.length, msg.length - suffix.length).trim();
  return content ? { content } : null;
}

// Simulation : tous les proxys qui correspondent, le gagnant, et les égalités.
export function simulate(proxys, message) {
  const matches = proxys
    .map((p) => {
      const m = matchProxy(p, message);
      return m ? { proxy: p, content: m.content, spec: specificity(p) } : null;
    })
    .filter(Boolean)
    .sort((a, b) => b.spec - a.spec);
  if (matches.length === 0) return { matches, winner: null, tied: [] };
  const top = matches[0].spec;
  const tied = matches.filter((m) => m.spec === top);
  const distinctPrenoms = new Set(tied.map((m) => m.proxy.prenom_id));
  return {
    matches,
    winner: matches[0],
    tied: distinctPrenoms.size > 1 ? tied : [],
  };
}

// Paires de proxys en conflit. Deux proxys se chevauchent si un même message
// peut correspondre aux deux (préfixes compatibles ET suffixes compatibles).
export function findConflicts(proxys) {
  const out = [];
  for (let i = 0; i < proxys.length; i += 1) {
    for (let j = i + 1; j < proxys.length; j += 1) {
      const a = proxys[i];
      const b = proxys[j];
      const pa = low(a.prefix);
      const sa = low(a.suffix);
      const pb = low(b.prefix);
      const sb = low(b.suffix);
      if ((!pa && !sa) || (!pb && !sb)) continue;
      const overlap =
        (pa.startsWith(pb) || pb.startsWith(pa)) && (sa.endsWith(sb) || sb.endsWith(sa));
      if (!overlap) continue;

      const same = a.prenom_id === b.prenom_id;
      const identical = pa === pb && sa === sb;
      let type;
      let severity;
      if (identical) {
        type = same ? "doublon" : "identique";
        severity = same ? "warning" : "error";
      } else if (same) {
        continue; // deux proxys d'un même prénom qui se recouvrent : sans gravité
      } else if (pa.length + sa.length === pb.length + sb.length) {
        type = "ambigu";
        severity = "error";
      } else {
        type = "chevauchement";
        severity = "warning";
      }
      out.push({ type, severity, a, b });
    }
  }
  return out;
}

// { [proxyId]: { severity, items: [{ type, severity, other }] } }
export function indexConflicts(conflicts) {
  const idx = {};
  function add(id, item) {
    if (!idx[id]) idx[id] = { severity: "warning", items: [] };
    idx[id].items.push(item);
    if (item.severity === "error") idx[id].severity = "error";
  }
  for (const c of conflicts) {
    add(c.a.id, { type: c.type, severity: c.severity, other: c.b });
    add(c.b.id, { type: c.type, severity: c.severity, other: c.a });
  }
  return idx;
}

// Suggestions de proxys à partir du prénom et des tags choisis.
export function suggestProxies(prenomNom, tagNoms, existing) {
  const first = (prenomNom || "").trim().split(/\s+/)[0];
  if (!first) return [];
  const ini = fold(first).charAt(0) || first.charAt(0).toLowerCase();

  const list = [
    { prefix: `${first}:`, suffix: "" },
    { prefix: `${first};`, suffix: "" },
    { prefix: `${ini}:`, suffix: "" },
    { prefix: `${ini}[`, suffix: "]" },
  ];
  for (const tag of (tagNoms || []).slice(0, 2)) {
    const slug = fold(tag).replace(/[^a-z0-9]/g, "");
    if (!slug) continue;
    list.push({ prefix: `${slug.charAt(0)}${ini}:`, suffix: "" });
    list.push({ prefix: `${slug}.${first}:`, suffix: "" });
  }

  const taken = new Set(existing.map(proxyKey));
  const seen = new Set();
  return list.filter((s) => {
    const key = proxyKey(s);
    if (taken.has(key) || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// Texte de la liste complète : une ligne par proxy, triée par prénom.
export function buildListText(proxys, nameOf) {
  const collator = new Intl.Collator("fr", { sensitivity: "base", numeric: true });
  return [...proxys]
    .sort(
      (a, b) =>
        collator.compare(nameOf(a.prenom_id), nameOf(b.prenom_id)) ||
        collator.compare(formatProxy(a), formatProxy(b))
    )
    .map((p) => `${nameOf(p.prenom_id)} — ${formatProxy(p)}`)
    .join("\n");
}