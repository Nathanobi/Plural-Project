import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getCollection,
  insertRow,
  updateRow,
  deleteRow,
  addJournalEntry,
} from "../../lib/storage";
import TagForm from "./components/TagForm";
import TagColorDot from "./components/TagColorDot";
import "./TagsPage.css";

// Entités qui portent des tag_ids (voir data-model.md §1).
const TAGGED = [
  { key: "prenoms", label: "Prénoms" },
  { key: "images", label: "Images" },
  { key: "proxys", label: "Proxys" },
  { key: "profils", label: "Profils" },
];

// storage.js ne lève jamais d'exception : il renvoie null/false et logue la
// cause dans la console. On teste donc les retours et on renvoie vers la console.
const SAVE_ERROR = "L'opération a échoué. Ouvre la console (F12) pour voir la cause exacte.";

// Filtre à trois états par type d'élément : neutre → inclure → exclure.
const NEXT_STATE = { off: "include", include: "exclude", exclude: "off" };
const STATE_LABEL = { off: "", include: "avec", exclude: "sans" };

export default function TagsPage() {
  const [tags, setTags] = useState([]);
  const [rows, setRows] = useState({ prenoms: [], images: [], proxys: [], profils: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ prenoms: "off", images: "off", proxys: "off", profils: "off" });
  const [emptyOnly, setEmptyOnly] = useState(false);
  const [editing, setEditing] = useState(null); // null | "new" | tag
  const [confirmId, setConfirmId] = useState(null);

  const load = useCallback(async () => {
    try {
      setError("");
      const [tagList, ...lists] = await Promise.all([
        getCollection("tags"),
        ...TAGGED.map((t) => getCollection(t.key)),
      ]);
      setTags([...tagList].sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0)));
      setRows(Object.fromEntries(TAGGED.map((t, i) => [t.key, lists[i]])));
    } catch (e) {
      setError(e.message || "Impossible de charger les tags.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Compteurs calculés à l'affichage (jamais stockés, cf. data-model.md).
  const counts = useMemo(() => {
    const result = {};
    for (const tag of tags) {
      result[tag.id] = { total: 0 };
      for (const { key } of TAGGED) {
        const n = rows[key].filter((r) => (r.tag_ids || []).includes(tag.id)).length;
        result[tag.id][key] = n;
        result[tag.id].total += n;
      }
    }
    return result;
  }, [tags, rows]);

  const parentName = useMemo(
    () => Object.fromEntries(tags.map((t) => [t.id, t.nom])),
    [tags]
  );

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tags.filter((tag) => {
      if (q && !tag.nom.toLowerCase().includes(q)) return false;
      if (emptyOnly && counts[tag.id].total > 0) return false;
      for (const { key } of TAGGED) {
        const used = counts[tag.id][key] > 0;
        if (filters[key] === "include" && !used) return false;
        if (filters[key] === "exclude" && used) return false;
      }
      return true;
    });
  }, [tags, counts, search, filters, emptyOnly]);

  // Réorganiser n'a de sens que sur la liste complète, non filtrée.
  const canReorder = !search.trim() && !emptyOnly && Object.values(filters).every((s) => s === "off");

  async function handleSubmit(values) {
    try {
      if (editing === "new") {
        const created = await insertRow("tags", { ...values, ordre: tags.length });
        if (!created) throw new Error(SAVE_ERROR);
        await addJournalEntry({
          action: "create",
          entityType: "tag",
          entityId: created?.id ?? null,
          details: values.nom,
        });
      } else {
        const updated = await updateRow("tags", editing.id, values);
        if (!updated) throw new Error(SAVE_ERROR);
        await addJournalEntry({
          action: "update",
          entityType: "tag",
          entityId: editing.id,
          details: values.nom,
        });
      }
      setEditing(null);
      await load();
    } catch (e) {
      setError(e.message || "Échec de l'enregistrement.");
    }
  }

  async function handleDelete(tag) {
    try {
      // Nettoie les références pour ne laisser aucun tag_id orphelin.
      const updates = [];
      for (const { key } of TAGGED) {
        for (const r of rows[key]) {
          if ((r.tag_ids || []).includes(tag.id)) {
            updates.push(
              updateRow(key, r.id, { tag_ids: r.tag_ids.filter((id) => id !== tag.id) })
            );
          }
        }
      }
      for (const child of tags.filter((t) => t.parent_id === tag.id)) {
        updates.push(updateRow("tags", child.id, { parent_id: null }));
      }
      const results = await Promise.all(updates);
      if (results.some((r) => !r)) throw new Error(SAVE_ERROR);
      if (!(await deleteRow("tags", tag.id))) throw new Error(SAVE_ERROR);
      await addJournalEntry({
        action: "delete",
        entityType: "tag",
        entityId: tag.id,
        details: tag.nom,
      });
      setConfirmId(null);
      await load();
    } catch (e) {
      setError(e.message || "Échec de la suppression.");
    }
  }

  async function move(tag, direction) {
    const index = tags.findIndex((t) => t.id === tag.id);
    const other = tags[index + direction];
    if (!other) return;
    try {
      // On réécrit l'ordre de toute la liste pour éviter les doublons de `ordre`.
      const reordered = [...tags];
      reordered[index] = other;
      reordered[index + direction] = tag;
      const results = await Promise.all(
        reordered.map((t, i) => (t.ordre === i ? true : updateRow("tags", t.id, { ordre: i })))
      );
      if (results.some((r) => !r)) throw new Error(SAVE_ERROR);
      await load();
    } catch (e) {
      setError(e.message || "Échec de la réorganisation.");
    }
  }

  function cycleFilter(key) {
    setFilters((f) => ({ ...f, [key]: NEXT_STATE[f[key]] }));
  }

  function resetFilters() {
    setSearch("");
    setEmptyOnly(false);
    setFilters({ prenoms: "off", images: "off", proxys: "off", profils: "off" });
  }

  const hasFilter = search || emptyOnly || Object.values(filters).some((s) => s !== "off");

  return (
    <section className="tags-page">
      <header className="tags-page__header">
        <div>
          <p className="tags-page__eyebrow">Profil</p>
          <h1 className="tags-page__title">
            Tags <span className="tags-page__count">({tags.length})</span>
          </h1>
        </div>
        {!editing && (
          <button className="tag-btn tag-btn--primary" onClick={() => setEditing("new")}>
            + Nouveau tag
          </button>
        )}
      </header>

      {error && <p className="tags-page__error">{error}</p>}

      {editing && (
        <TagForm
          key={editing === "new" ? "new" : editing.id}
          tag={editing === "new" ? null : editing}
          tags={tags}
          onSubmit={handleSubmit}
          onCancel={() => setEditing(null)}
        />
      )}

      <div className="tags-page__toolbar">
        <input
          type="search"
          className="tags-page__search"
          placeholder="Rechercher un tag…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="tags-page__filters" role="group" aria-label="Filtrer par usage">
          {TAGGED.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              className={`tags-page__chip tags-page__chip--${filters[key]}`}
              onClick={() => cycleFilter(key)}
              title="Clic : avec → sans → désactivé"
            >
              {STATE_LABEL[filters[key]] && `${STATE_LABEL[filters[key]]} `}
              {label.toLowerCase()}
            </button>
          ))}
          <button
            type="button"
            className={`tags-page__chip tags-page__chip--${emptyOnly ? "include" : "off"}`}
            onClick={() => setEmptyOnly((v) => !v)}
          >
            sans élément
          </button>
          {hasFilter && (
            <button type="button" className="tags-page__reset" onClick={resetFilters}>
              Réinitialiser
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <p className="tags-page__empty">Chargement…</p>
      ) : tags.length === 0 ? (
        <p className="tags-page__empty">Aucun tag pour l'instant. Crée le premier !</p>
      ) : visible.length === 0 ? (
        <p className="tags-page__empty">Aucun tag ne correspond aux filtres.</p>
      ) : (
        <ul className="tags-page__list">
          {visible.map((tag) => {
            const c = counts[tag.id];
            const index = tags.findIndex((t) => t.id === tag.id);
            return (
              <li key={tag.id} className="tags-page__row">
                <div className="tags-page__main">
                  <div className="tags-page__name">
                    <TagColorDot color={tag.couleur} />
                    <strong>{tag.nom}</strong>
                    {tag.parent_id && parentName[tag.parent_id] && (
                      <span className="tags-page__parent">↳ {parentName[tag.parent_id]}</span>
                    )}
                  </div>
                  {tag.description && <p className="tags-page__desc">{tag.description}</p>}
                  <div className="tags-page__badges">
                    {c.total === 0 ? (
                      <span className="ps-badge ps-badge--warning">Aucun élément</span>
                    ) : (
                      TAGGED.filter(({ key }) => c[key] > 0).map(({ key, label }) => (
                        <span key={key} className="ps-badge ps-badge--neutral">
                          {c[key]} {label.toLowerCase()}
                        </span>
                      ))
                    )}
                  </div>
                </div>

                <div className="tags-page__actions">
                  {confirmId === tag.id ? (
                    <>
                      <span className="tags-page__confirm">
                        Supprimer
                        {c.total > 0 ? ` (retiré de ${c.total} élément${c.total > 1 ? "s" : ""})` : ""} ?
                      </span>
                      <button className="tag-btn tag-btn--danger" onClick={() => handleDelete(tag)}>
                        Oui
                      </button>
                      <button className="tag-btn tag-btn--secondary" onClick={() => setConfirmId(null)}>
                        Non
                      </button>
                    </>
                  ) : (
                    <>
                      {canReorder && (
                        <>
                          <button
                            className="tag-btn tag-btn--icon"
                            aria-label="Monter"
                            disabled={index === 0}
                            onClick={() => move(tag, -1)}
                          >
                            ↑
                          </button>
                          <button
                            className="tag-btn tag-btn--icon"
                            aria-label="Descendre"
                            disabled={index === tags.length - 1}
                            onClick={() => move(tag, 1)}
                          >
                            ↓
                          </button>
                        </>
                      )}
                      <button className="tag-btn tag-btn--secondary" onClick={() => setEditing(tag)}>
                        Modifier
                      </button>
                      <button className="tag-btn tag-btn--secondary" onClick={() => setConfirmId(tag.id)}>
                        Supprimer
                      </button>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
