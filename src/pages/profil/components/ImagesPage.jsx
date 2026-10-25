import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getCollection,
  insertRow,
  updateRow,
  deleteRow,
  addJournalEntry,
} from "../../lib/storage";
import { uploadToImgbb } from "../../lib/imgbb";
import ImageForm from "./components/ImageForm";
import ImageRow from "./components/ImageRow";
import "./ImagesPage.css";

// storage.js ne lève jamais d'exception : il renvoie null/false et logue la cause.
const SAVE_ERROR = "L'opération a échoué. Ouvre la console (F12) pour voir la cause exacte.";

// Filtres à trois états : neutre → avec → sans.
const NEXT_STATE = { off: "include", include: "exclude", exclude: "off" };

const CRITERIA = [
  { key: "prenom", off: "prénom", include: "avec prénom", exclude: "sans prénom", test: (i) => !!i.prenom_id },
  { key: "recadree", off: "recadrage", include: "recadrées", exclude: "non recadrées", test: (i) => !!i.recadrage },
  { key: "hebergee", off: "hébergement", include: "hébergées", exclude: "non hébergées", test: (i) => !!i.url_hebergee },
];

const INITIAL_FILTERS = { prenom: "off", recadree: "off", hebergee: "off" };
const NO_TAG = "__none__";

const SORTS = [
  { key: "recent", label: "Plus récentes" },
  { key: "old", label: "Plus anciennes" },
  { key: "az", label: "Prénom A → Z" },
  { key: "za", label: "Prénom Z → A" },
];

export default function ImagesPage() {
  const [images, setImages] = useState([]);
  const [prenoms, setPrenoms] = useState([]);
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [tagFilter, setTagFilter] = useState("");
  const [sort, setSort] = useState("recent");
  const [editing, setEditing] = useState(null); // null | "new" | image
  const [confirmId, setConfirmId] = useState(null);

  const load = useCallback(async () => {
    try {
      setError("");
      const [imageList, prenomList, tagList] = await Promise.all([
        getCollection("images"),
        getCollection("prenoms"),
        getCollection("tags"),
      ]);
      setImages(imageList);
      setPrenoms(prenomList);
      setTags([...tagList].sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0)));
    } catch (e) {
      setError(e.message || "Impossible de charger les images.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const prenomName = useMemo(() => Object.fromEntries(prenoms.map((p) => [p.id, p.nom])), [prenoms]);
  const tagById = useMemo(() => Object.fromEntries(tags.map((t) => [t.id, t])), [tags]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = images.filter((img) => {
      if (q && !(prenomName[img.prenom_id] || "").toLowerCase().includes(q)) return false;
      for (const c of CRITERIA) {
        const ok = c.test(img);
        if (filters[c.key] === "include" && !ok) return false;
        if (filters[c.key] === "exclude" && ok) return false;
      }
      const ids = img.tag_ids || [];
      if (tagFilter === NO_TAG && ids.length > 0) return false;
      if (tagFilter && tagFilter !== NO_TAG && !ids.includes(tagFilter)) return false;
      return true;
    });

    const byDate = (a, b) => new Date(b.created_at) - new Date(a.created_at);
    const nameOf = (img) => prenomName[img.prenom_id] || "";
    const byName = (a, b) => {
      const na = nameOf(a);
      const nb = nameOf(b);
      if (!na && !nb) return byDate(a, b);
      if (!na) return 1; // sans prénom en dernier
      if (!nb) return -1;
      return na.localeCompare(nb, "fr");
    };
    if (sort === "recent") list.sort(byDate);
    if (sort === "old") list.sort((a, b) => -byDate(a, b));
    if (sort === "az") list.sort(byName);
    if (sort === "za") list.sort((a, b) => -byName(a, b) || byDate(a, b));
    return list;
  }, [images, prenomName, search, filters, tagFilter, sort]);

  const hasFilter =
    search || tagFilter || Object.values(filters).some((s) => s !== "off");

  function resetFilters() {
    setSearch("");
    setTagFilter("");
    setFilters(INITIAL_FILTERS);
  }

  function closeForm() {
    setEditing(null);
    setFormError("");
  }

  async function handleSubmit(v) {
    setSaving(true);
    setFormError("");
    try {
      const isNew = editing === "new";

      // 1. Upload d'abord (étape la plus susceptible d'échouer).
      let urlHebergee = isNew ? null : editing.url_hebergee;
      if (v.file) urlHebergee = await uploadToImgbb(v.file, v.filename);

      // 2. Prénom : réutilise un prénom du même nom, sinon le crée.
      let prenomId = v.prenomId;
      if (v.newPrenomNom) {
        const existing = prenoms.find(
          (p) => p.nom.trim().toLowerCase() === v.newPrenomNom.toLowerCase()
        );
        if (existing) {
          prenomId = existing.id;
        } else {
          const created = await insertRow("prenoms", { nom: v.newPrenomNom, tag_ids: [] });
          if (!created) throw new Error(SAVE_ERROR);
          await addJournalEntry({
            action: "create",
            entityType: "prenom",
            entityId: created.id,
            details: v.newPrenomNom,
          });
          prenomId = created.id;
        }
      }

      const label =
        v.newPrenomNom || prenoms.find((p) => p.id === prenomId)?.nom || "image sans prénom";
      const values = {
        prenom_id: prenomId,
        tag_ids: v.tagIds,
        url_pinterest_source: v.pinterest,
        url_hebergee: urlHebergee,
      };

      // 3. Image.
      if (isNew) {
        const created = await insertRow("images", { ...values, recadrage: v.recadrage });
        if (!created) throw new Error(SAVE_ERROR);
        await addJournalEntry({
          action: "create",
          entityType: "image",
          entityId: created.id,
          details: label,
        });
      } else {
        const changes = { ...values, updated_at: new Date().toISOString() };
        if (v.file) changes.recadrage = v.recadrage; // nouvelle image : le recadrage suit
        const updated = await updateRow("images", editing.id, changes);
        if (!updated) throw new Error(SAVE_ERROR);
        await addJournalEntry({
          action: "update",
          entityType: "image",
          entityId: editing.id,
          details: label,
        });
      }

      closeForm();
      await load();
    } catch (e) {
      setFormError(e.message || "Échec de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(image) {
    try {
      if (!(await deleteRow("images", image.id))) throw new Error(SAVE_ERROR);
      await addJournalEntry({
        action: "delete",
        entityType: "image",
        entityId: image.id,
        details: prenomName[image.prenom_id] || "image sans prénom",
      });
      setConfirmId(null);
      await load();
    } catch (e) {
      setError(e.message || "Échec de la suppression.");
    }
  }

  return (
    <section className="images-page">
      <header className="images-page__header">
        <div>
          <p className="images-page__eyebrow">Profil</p>
          <h1 className="images-page__title">
            Images <span className="images-page__count">({images.length})</span>
          </h1>
        </div>
        {!editing && (
          <button className="ps-button-primary" onClick={() => setEditing("new")}>
            + Nouvelle image
          </button>
        )}
      </header>

      {error && <p className="images-page__error">{error}</p>}

      {editing && (
        <ImageForm
          key={editing === "new" ? "new" : editing.id}
          image={editing === "new" ? null : editing}
          prenoms={prenoms}
          tags={tags}
          saving={saving}
          error={formError}
          onSubmit={handleSubmit}
          onCancel={closeForm}
        />
      )}

      <div className="images-page__toolbar">
        <input
          type="search"
          className="images-page__search"
          placeholder="Rechercher par prénom associé…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="images-page__filters" role="group" aria-label="Filtres">
          {CRITERIA.map((c) => (
            <button
              key={c.key}
              type="button"
              className={`images-page__chip images-page__chip--${filters[c.key]}`}
              onClick={() => setFilters((f) => ({ ...f, [c.key]: NEXT_STATE[f[c.key]] }))}
              title="Clic : avec → sans → désactivé"
            >
              {c[filters[c.key]]}
            </button>
          ))}
          <select
            className="images-page__select"
            aria-label="Filtrer par tag"
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
          >
            <option value="">Tous les tags</option>
            <option value={NO_TAG}>Sans tag</option>
            {tags.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nom}
              </option>
            ))}
          </select>
          <select
            className="images-page__select"
            aria-label="Trier"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            {SORTS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
          {hasFilter && (
            <button type="button" className="images-page__reset" onClick={resetFilters}>
              Réinitialiser
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <p className="images-page__empty">Chargement…</p>
      ) : images.length === 0 ? (
        <p className="images-page__empty">Aucune image pour l'instant. Ajoute la première !</p>
      ) : visible.length === 0 ? (
        <p className="images-page__empty">Aucune image ne correspond aux filtres.</p>
      ) : (
        <ul className="images-page__list">
          {visible.map((image) => (
            <ImageRow
              key={image.id}
              image={image}
              prenomName={prenomName[image.prenom_id]}
              tags={(image.tag_ids || []).map((id) => tagById[id]).filter(Boolean)}
              confirming={confirmId === image.id}
              onEdit={() => {
                setFormError("");
                setEditing(image);
              }}
              onAskDelete={() => setConfirmId(image.id)}
              onCancelDelete={() => setConfirmId(null)}
              onDelete={() => handleDelete(image)}
            />
          ))}
        </ul>
      )}
    </section>
  );
}