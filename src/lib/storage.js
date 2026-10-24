import { supabase } from "./supabaseClient";
import { TABLES } from "./tables";

function resolveTable(name) {
  const table = TABLES[name];
  if (!table) {
    console.error(`storage: collection inconnue "${name}"`);
    return null;
  }
  return table;
}

/**
 * Récupère toutes les lignes d'une collection.
 * Renvoie un tableau vide en cas d'erreur (jamais null/undefined),
 * pour que les pages puissent toujours faire un .map() dessus sans vérif.
 */
export async function getCollection(name) {
  const table = resolveTable(name);
  if (!table) return [];
  try {
    const { data, error } = await supabase.from(table).select("*");
    if (error) {
      console.error(`getCollection("${name}") a échoué :`, error.message);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error(`getCollection("${name}") a échoué :`, err);
    return [];
  }
}

/**
 * Récupère une seule ligne par id. Renvoie null si absente ou en erreur.
 */
export async function getRow(name, id) {
  const table = resolveTable(name);
  if (!table) return null;
  try {
    const { data, error } = await supabase.from(table).select("*").eq("id", id).maybeSingle();
    if (error) {
      console.error(`getRow("${name}", "${id}") a échoué :`, error.message);
      return null;
    }
    return data;
  } catch (err) {
    console.error(`getRow("${name}", "${id}") a échoué :`, err);
    return null;
  }
}

/**
 * Insère une nouvelle ligne. Renvoie la ligne créée, ou null en cas d'échec.
 */
export async function insertRow(name, row) {
  const table = resolveTable(name);
  if (!table) return null;
  try {
    const { data, error } = await supabase.from(table).insert(row).select().single();
    if (error) {
      console.error(`insertRow("${name}") a échoué :`, error.message);
      return null;
    }
    return data;
  } catch (err) {
    console.error(`insertRow("${name}") a échoué :`, err);
    return null;
  }
}

/**
 * Met à jour une ligne existante par id. Renvoie la ligne mise à jour,
 * ou null en cas d'échec.
 */
export async function updateRow(name, id, changes) {
  const table = resolveTable(name);
  if (!table) return null;
  try {
    const { data, error } = await supabase
      .from(table)
      .update(changes)
      .eq("id", id)
      .select()
      .single();
    if (error) {
      console.error(`updateRow("${name}", "${id}") a échoué :`, error.message);
      return null;
    }
    return data;
  } catch (err) {
    console.error(`updateRow("${name}", "${id}") a échoué :`, err);
    return null;
  }
}

/**
 * Supprime une ligne par id. Renvoie true/false selon le succès.
 */
export async function deleteRow(name, id) {
  const table = resolveTable(name);
  if (!table) return false;
  try {
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) {
      console.error(`deleteRow("${name}", "${id}") a échoué :`, error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error(`deleteRow("${name}", "${id}") a échoué :`, err);
    return false;
  }
}

/**
 * Ajoute une entrée au journal d'actions (config_journal).
 * À appeler depuis les pages futures après une création/modif/suppression
 * significative (voir data-model.md §1 "Journal").
 */
export async function addJournalEntry({ action, entityType, entityId, details }) {
  return insertRow("journal", {
    action,
    entity_type: entityType || null,
    entity_id: entityId || null,
    details: details || null,
  });
}
