import { TABLES } from "./tables";
import { getCollection } from "./storage";
import { supabase } from "./supabaseClient";

/**
 * Exporte toutes les collections dans un seul objet JSON
 * (une clé par collection, même nommage que TABLES).
 * Utilisé par Configuration > Données pour le bouton "Exporter".
 */
export async function exportAllData() {
  const names = Object.keys(TABLES);
  const result = {};
  for (const name of names) {
    result[name] = await getCollection(name);
  }
  return {
    exportedAt: new Date().toISOString(),
    data: result,
  };
}

/**
 * Réimporte un objet JSON produit par exportAllData() (ou adapté depuis
 * l'ancienne app). Écrase le contenu des tables listées dans `payload.data`
 * en remplaçant toutes leurs lignes par celles fournies.
 *
 * Volontairement "tout ou rien" par collection plutôt que ligne par ligne :
 * plus simple à raisonner pour une restauration/migration ponctuelle.
 * À affiner (vérification de schéma, étape de confirmation dans l'UI...)
 * au moment de construire la page Configuration > Données.
 */
export async function importAllData(payload) {
  const names = Object.keys(payload?.data || {});
  const results = {};
  for (const name of names) {
    const table = TABLES[name];
    if (!table) {
      results[name] = { ok: false, reason: "collection inconnue" };
      continue;
    }
    const rows = payload.data[name];
    if (!Array.isArray(rows) || rows.length === 0) {
      results[name] = { ok: true, inserted: 0 };
      continue;
    }
    try {
      const { error } = await supabase.from(table).upsert(rows);
      results[name] = error
        ? { ok: false, reason: error.message }
        : { ok: true, inserted: rows.length };
    } catch (err) {
      results[name] = { ok: false, reason: String(err) };
    }
  }
  return results;
}
