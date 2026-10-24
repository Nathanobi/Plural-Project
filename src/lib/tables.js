// Fait le lien entre un nom de collection "métier" (utilisé par les pages)
// et le nom réel de la table Postgres (voir supabase/schema.sql).
// Les pages futures ne doivent jamais écrire un nom de table en dur :
// elles passent toujours par un nom de collection ci-dessous.

export const TABLES = {
  system: "system_info",
  tags: "tags",
  prenoms: "prenoms",
  images: "images",
  proxys: "proxys",
  profils: "profils",
  syncMeta: "sync_meta",
  fiches: "fiches",
  liens: "liens",
  innerworldZones: "innerworld_zones",
  notes: "notes",
  contacts: "contacts",
  rappels: "rappels",
  settings: "config_settings",
  journal: "config_journal",
};
