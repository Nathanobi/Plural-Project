// Logique du filtre de tags à 3 états (inclure / exclure / sans tag),
// partagée par les pages Prénoms, Images, Proxys et Profils.
// `states` ne contient que les tags actifs : { [tagId]: "include" | "exclude" }.
// `mode` : "or" = au moins un des tags inclus, "and" = tous les tags inclus.

export const EMPTY_TAG_FILTER = { states: {}, untagged: false, mode: "or" };

// Le mode seul ne compte pas comme un filtre actif.
export function isTagFilterActive(filter) {
  return filter.untagged || Object.keys(filter.states).length > 0;
}

// - "sans tag" : ne garde que les éléments sans aucun tag (exclusif)
// - tags exclus : éliminatoires
// - tags inclus : OU (au moins un) ou ET (tous), selon `mode`
export function matchesTagFilter(tagIds, filter) {
  const ids = tagIds || [];
  if (filter.untagged) return ids.length === 0;

  const entries = Object.entries(filter.states);
  const included = entries.filter(([, s]) => s === "include").map(([id]) => id);
  const excluded = entries.filter(([, s]) => s === "exclude").map(([id]) => id);

  if (excluded.some((id) => ids.includes(id))) return false;

  if (included.length > 0) {
    const ok =
      filter.mode === "and"
        ? included.every((id) => ids.includes(id))
        : included.some((id) => ids.includes(id));
    if (!ok) return false;
  }
  return true;
}