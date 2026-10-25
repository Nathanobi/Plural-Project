import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getCollection,
  insertRow,
  updateRow,
  deleteRow,
  addJournalEntry,
} from "../../lib/storage";
import PrenomForm from "./components/PrenomForm";
import TagFilter from "./components/TagFilter";
import TagColorDot from "./components/TagColorDot";
import {
  EMPTY_TAG_FILTER,
  isTagFilterActive,
  matchesTagFilter,
} from "./components/tagFilterUtils";
import "./PrenomsPage.css";

// storage.js ne lève jamais d'exception : il renvoie null/false et logue la
// cause dans la console. On teste donc les retours.
const SAVE_ERROR = "L'opération a échoué. Ouvre la console (F12) pour voir la cause exacte.";

const SORTS = [
  { value: "az", label: "Alphabétique (A → Z)" },
  { value: "za", label: "Alphabétique (Z → A)" },
  { value: "recent", label: "Plus récents d'abord" },
  { value: "old", label: "Plus anciens d'abord" },
];

// Filtres "manquant" : on ne garde que les prénoms qui n'ont aucun élément lié.
const MISSING = [
  { key: "image", field: "images", label: "Sans image" },
  { key: "proxy", field: "proxys", label: "Sans proxy" },
  { key: "profil", field: "profils", label: "Sans profil" },
];
const EMPTY_MISSING = { image: false, proxy: false, profil: false };

const collator = new Intl.Collator("fr", { sensitivity: "base", numeric: true });

// Minuscules + sans accents, pour la recherche et la lettre initiale.
const fold = (s) =>
  (s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

function letterOf(nom) {
  const c = fold(nom).charAt(0).toUpperCase();
  return /[A-Z]/.test(c) ? c : "#";
}

const plural = (n, one, many) => `${n} ${n > 1 ? many : one}`;

export default function PrenomsPage() {
  const [prenoms, setPrenoms] = useState([]);
  const [tags, setTags] = useState([]);
  const [linked, setLinked] = useState({
    images: [],
    proxys: [],
    profils: [],
    fiches: [],
    liens: [],
    notes: [],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("az");
  const [letter, setLetter] = useState("");
  const [tagFilter, setTagFilter] = useState(EMPTY_TAG_FILTER);
  const [missing, setMissing] = useState(EMPTY_MISSING);

  const [editing, setEditing] = useState(null); // null | "new" | prénom
  const [confirmId, setConfirmId] = useState(null);

  const load = useCallback(async () => {
    try {
      setError("");
      const [prenomList, tagList, images, proxys, profils, fiches, liens, notes] =
        await Promise.all([
          getCollection("prenoms"),
          getCollection("tags"),
          getCollection("images"),
          getCollection("proxys"),
          getCollection("profils"),
          getCollection("fiches"),
          getCollection("liens"),
          getCollection("notes"),
        ]);
      setPrenoms(prenomList);
      setTags([...tagList].sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0)));
      setLinked({ images, proxys, profils, fiches, liens, notes });
    } catch (e) {
      setError(e.message || "Impossible de charger les prénoms.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const tagById = useMemo(() => Object.fromEntries(tags.map((t) => [t.id, t])), [tags]);

  // Statuts calculés à l'affichage (jamais stockés, cf. data-model.md).
  const stats = useMemo(() => {
    const result = {};
    for (const p of prenoms) result[p.id] = { images: 0, proxys: 0, profils: 0 };
    for (const field of ["images", "proxys", "profils"]) {
      for (const row of linked[field]) {
        if (row.prenom_id && result[row.prenom_id]) result[row.prenom_id][field] += 1;
      }
    }
    return result;
  }, [prenoms, linked]);

  const letters = useMemo(() => {
    const set = new Set(prenoms.map((p) => letterOf(p.nom)));
    return [...set].sort((a, b) => {
      if (a === "#") return 1;
      if (b === "#") return -1;
      return a.localeCompare(b);
    });
  }, [prenoms]);

  const visible = useMemo(() => {
    const q = fold(search.trim());
    const list = prenoms.filter((p) => {
      if (q && !fold(p.nom).includes(q) && !fold(p.note).includes(q)) return false;
      if (letter && letterOf(p.nom) !== letter) return false;
      if (!matchesTagFilter(p.tag_ids, tagFilter)) return false;
      const s = stats[p.id];
      for (const m of MISSING) {
        if (missing[m.key] && s[m.field] > 0) return false;
      }
      return true;
    });
    list.sort((a, b) => {
      switch (sort) {
        case "za":
          return collator.compare(b.nom, a.nom);
        case "recent":
          return Date.parse(b.created_at) - Date.parse(a.created_at);
        case "old":
          return Date.parse(a.created_at) - Date.parse(b.created_at);
        default:
          return collator.compare(a.nom, b.nom);
      }
    });
    return list;
  }, [prenoms, stats, search, letter, tagFilter, missing, sort]);

  const hasFilter =
    search.trim() !== "" ||
    letter !== "" ||
    isTagFilterActive(tagFilter) ||
    Object.values(missing).some(Boolean);

  function resetFilters() {
    setSearch("");
    setLetter("");
    setTagFilter(EMPTY_TAG_FILTER);
    setMissing(EMPTY_MISSING);
  }

  // Ce qui sera touché si on supprime ce prénom (schema.sql) :
  // - proxys, profils (+ fiches) : supprimés en cascade par la base
  // - images : conservées, prenom_id mis à null par la base
  // - liens / notes : pas de clé étrangère, donc gérés ici
  function impactOf(prenom) {
    const profilList = linked.profils.filter((x) => x.prenom_id === prenom.id);
    const profilIds = new Set(profilList.map((x) => x.id));
    return {
      images: linked.images.filter((i) => i.prenom_id === prenom.id).length,
      proxys: linked.proxys.filter((x) => x.prenom_id === prenom.id).length,
      profils: profilList.length,
      fiches: linked.fiches.filter((f) => profilIds.has(f.profil_id)).length,
      liens: linked.liens.filter(
        (l) =>
          (l.cible_type === "prenom" && (l.source_id === prenom.id || l.target_id === prenom.id)) ||
          (l.cible_type === "profil" && (profilIds.has(l.source_id) || profilIds.has(l.target_id)))
      ),
      notes: linked.notes.filter(
        (n) =>
          (n.cible_type === "prenom" && n.cible_id === prenom.id) ||
          (n.cible_type === "profil" && profilIds.has(n.cible_id))
      ),
    };
  }

  function impactLines(impact) {
    const lines = [];
    if (impact.proxys) lines.push(`${plural(impact.proxys, "proxy supprimé", "proxys supprimés")}`);
    if (impact.profils) {
      const fiches = impact.fiches ? ` (et ${plural(impact.fiches, "fiche", "fiches")})` : "";
      lines.push(`${plural(impact.profils, "profil supprimé", "profils supprimés")}${fiches}`);
    }
    if (impact.liens.length)
      lines.push(`${plural(impact.liens.length, "lien supprimé", "liens supprimés")}`);
    if (impact.images)
      lines.push(
        `${plural(impact.images, "image conservée", "images conservées")}, désormais sans prénom`
      );
    if (impact.notes.length)
      lines.push(
        `${plural(impact.notes.length, "note conservée", "notes conservées")}, non rattachée${
          impact.notes.length > 1 ? "s" : ""
        }`
      );
    return lines;
  }

  async function handleSubmit({ noms, tag_ids, note, skipped }) {
    setNotice("");
    setError("");
    setSaving(true);
    let created = 0;
    try {
      if (editing === "new") {
        for (const nom of noms) {
          const row = await insertRow("prenoms", { nom, tag_ids, note });
          if (!row) {
            throw new Error(
              created > 0
                ? `${plural(created, "prénom créé", "prénoms créés")} avant l'échec. ${SAVE_ERROR}`
                : SAVE_ERROR
            );
          }
          created += 1;
          await addJournalEntry({
            action: "create",
            entityType: "prenom",
            entityId: row.id,
            details: nom,
          });
        }
        const ignored = skipped.length
          ? ` ${plural(skipped.length, "ignoré", "ignorés")} (déjà existant) : ${skipped.join(", ")}.`
          : "";
        setNotice(`${plural(created, "prénom ajouté", "prénoms ajoutés")}.${ignored}`);
      } else {
        const updated = await updateRow("prenoms", editing.id, {
          nom: noms[0],
          tag_ids,
          note,
          updated_at: new Date().toISOString(),
        });
        if (!updated) throw new Error(SAVE_ERROR);
        await addJournalEntry({
          action: "update",
          entityType: "prenom",
          entityId: editing.id,
          details: noms[0],
        });
      }
      setEditing(null);
      await load();
    } catch (e) {
      // On recharge d'abord (load efface l'erreur), puis on affiche l'erreur.
      await load();
      setError(e.message || "Échec de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(prenom) {
    setNotice("");
    const impact = impactOf(prenom);
    try {
      // La base supprime proxys/profils (cascade) et détache les images.
      if (!(await deleteRow("prenoms", prenom.id))) throw new Error(SAVE_ERROR);

      // Pas de clé étrangère sur liens/notes : on nettoie ici.
      const cleanup = [
        ...impact.liens.map((l) => deleteRow("liens", l.id)),
        ...impact.notes.map((n) =>
          updateRow("notes", n.id, {
            cible_type: null,
            cible_id: null,
            updated_at: new Date().toISOString(),
          })
        ),
      ];
      const results = await Promise.all(cleanup);

      const summary = impactLines(impact).join(", ");
      await addJournalEntry({
        action: "delete",
        entityType: "prenom",
        entityId: prenom.id,
        details: summary ? `${prenom.nom} — ${summary}` : prenom.nom,
      });
      setConfirmId(null);
      await load();
      if (results.some((r) => !r)) {
        setError(
          "Prénom supprimé, mais le nettoyage de certains liens ou notes a échoué (voir la console)."
        );
      }
    } catch (e) {
      setError(e.message || "Échec de la suppression.");
    }
  }

  function openForm(target) {
    setNotice("");
    setConfirmId(null);
    setEditing(target);
  }

  return (
    <section className="prenoms-page">
      <header className="prenoms-page__header">
        <div>
          <p className="prenoms-page__eyebrow">Profil</p>
          <h1 className="prenoms-page__title">
            Prénoms <span className="prenoms-page__count">({prenoms.length})</span>
            {hasFilter && (
              <span className="prenoms-page__count"> — {visible.length} affiché
                {visible.length > 1 ? "s" : ""}
              </span>
            )}
          </h1>
        </div>
        {!editing && (
          <button className="ps-button-primary" onClick={() => openForm("new")}>
            + Nouveaux prénoms
          </button>
        )}
      </header>

      {error && <p className="prenoms-page__error">{error}</p>}
      {notice && (
        <p className="prenoms-page__notice" role="status">
          {notice}
        </p>
      )}

      {editing && (
        <PrenomForm
          key={editing === "new" ? "new" : editing.id}
          prenom={editing === "new" ? null : editing}
          prenoms={prenoms}
          tags={tags}
          saving={saving}
          onSubmit={handleSubmit}
          onCancel={() => setEditing(null)}
        />
      )}

      <div className="prenoms-page__toolbar">
        <div className="prenoms-page__toolbar-row">
          <input
            type="search"
            className="prenoms-page__search"
            placeholder="Rechercher un prénom ou une note…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="prenoms-page__sort"
            aria-label="Trier"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        {letters.length > 1 && (
          <div className="prenoms-page__letters" role="group" aria-label="Filtrer par lettre">
            {letters.map((l) => (
              <button
                key={l}
                type="button"
                className={`prenoms-page__letter${letter === l ? " is-active" : ""}`}
                onClick={() => setLetter(letter === l ? "" : l)}
              >
                {l}
              </button>
            ))}
          </div>
        )}

        <TagFilter tags={tags} value={tagFilter} onChange={setTagFilter} />

        <div className="prenoms-page__filters" role="group" aria-label="Filtrer par élément manquant">
          {MISSING.map((m) => (
            <button
              key={m.key}
              type="button"
              className={`prenoms-page__chip${missing[m.key] ? " is-active" : ""}`}
              aria-pressed={missing[m.key]}
              onClick={() => setMissing((cur) => ({ ...cur, [m.key]: !cur[m.key] }))}
            >
              {m.label.toLowerCase()}
            </button>
          ))}
          {hasFilter && (
            <button type="button" className="prenoms-page__reset" onClick={resetFilters}>
              Réinitialiser
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <p className="prenoms-page__empty">Chargement…</p>
      ) : prenoms.length === 0 ? (
        <p className="prenoms-page__empty">Aucun prénom pour l'instant. Ajoute le premier !</p>
      ) : visible.length === 0 ? (
        <p className="prenoms-page__empty">Aucun prénom ne correspond aux filtres.</p>
      ) : (
        <ul className="prenoms-page__list">
          {visible.map((prenom) => {
            const s = stats[prenom.id];
            const complete = s.images > 0 && s.proxys > 0 && s.profils > 0;
            const isConfirming = confirmId === prenom.id;
            const lines = isConfirming ? impactLines(impactOf(prenom)) : [];
            return (
              <li key={prenom.id} className="prenoms-page__row">
                <div className="prenoms-page__row-main">
                  <div className="prenoms-page__info">
                    <strong className="prenoms-page__name">{prenom.nom}</strong>
                    {prenom.note && <p className="prenoms-page__note">{prenom.note}</p>}
                    <div className="prenoms-page__badges">
                      {(prenom.tag_ids || [])
                        .map((id) => tagById[id])
                        .filter(Boolean)
                        .map((tag) => (
                          <span key={tag.id} className="prenoms-page__tag">
                            <TagColorDot color={tag.couleur} />
                            {tag.nom}
                          </span>
                        ))}
                      {complete ? (
                        <span className="ps-badge ps-badge-success">Complet</span>
                      ) : (
                        MISSING.filter((m) => s[m.field] === 0).map((m) => (
                          <span key={m.key} className="ps-badge ps-badge-warning">
                            {m.label}
                          </span>
                        ))
                      )}
                    </div>
                  </div>

                  {!isConfirming && (
                    <div className="prenoms-page__actions">
                      <button
                        className="ps-button-secondary prenoms-page__btn-sm"
                        onClick={() => openForm(prenom)}
                      >
                        Modifier
                      </button>
                      <button
                        className="ps-button-secondary prenoms-page__btn-sm"
                        onClick={() => {
                          setEditing(null);
                          setConfirmId(prenom.id);
                        }}
                      >
                        Supprimer
                      </button>
                    </div>
                  )}
                </div>

                {isConfirming && (
                  <div className="prenoms-page__confirm">
                    <p className="prenoms-page__confirm-title">
                      Supprimer « {prenom.nom} » ?
                    </p>
                    {lines.length > 0 && (
                      <ul className="prenoms-page__confirm-list">
                        {lines.map((line) => (
                          <li key={line}>{line}</li>
                        ))}
                      </ul>
                    )}
                    <div className="prenoms-page__confirm-actions">
                      <button
                        className="prenoms-page__btn-danger prenoms-page__btn-sm"
                        onClick={() => handleDelete(prenom)}
                      >
                        Oui, supprimer
                      </button>
                      <button
                        className="ps-button-secondary prenoms-page__btn-sm"
                        onClick={() => setConfirmId(null)}
                      >
                        Non
                      </button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}