import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getCollection,
  insertRow,
  updateRow,
  deleteRow,
  addJournalEntry,
} from "../../lib/storage";
import ProfilForm from "./components/ProfilForm";
import ProfilRow from "./components/ProfilRow";
import TagFilter from "./components/TagFilter";
import {
  EMPTY_TAG_FILTER,
  isTagFilterActive,
  matchesTagFilter,
} from "./components/tagFilterUtils";
import { buildEntry } from "./components/profilUtils";
import "./ProfilsPage.css";

// storage.js ne lève jamais d'exception : il renvoie null/false et logue la cause.
const SAVE_ERROR = "L'opération a échoué. Ouvre la console (F12) pour voir la cause exacte.";

const SORTS = [
  { value: "az", label: "Prénom (A → Z)" },
  { value: "za", label: "Prénom (Z → A)" },
  { value: "recent", label: "Plus récents d'abord" },
  { value: "old", label: "Plus anciens d'abord" },
];

const STATUSES = [
  { value: "", label: "Tous les statuts" },
  { value: "complete", label: "Complets" },
  { value: "incomplete", label: "Incomplets" },
];

// Chips de filtre : on garde les profils qui correspondent au critère.
const CHIPS = [
  { key: "avatar", label: "sans avatar", test: (e) => e.missing.includes("avatar") },
  { key: "proxy", label: "sans proxy", test: (e) => e.missing.includes("proxy") },
  { key: "sync", label: "jamais synchronisés", test: (e) => e.sync === "never" },
];
const EMPTY_CHIPS = { avatar: false, proxy: false, sync: false };

const EMPTY_DATA = {
  profils: [],
  prenoms: [],
  images: [],
  proxys: [],
  tags: [],
  syncMeta: [],
  fiches: [],
  liens: [],
  notes: [],
};

const collator = new Intl.Collator("fr", { sensitivity: "base", numeric: true });

// Minuscules + sans accents, pour la recherche.
const fold = (s) =>
  (s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const plural = (n, one, many) => `${n} ${n > 1 ? many : one}`;

export default function ProfilsPage() {
  const [data, setData] = useState(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("az");
  const [status, setStatus] = useState("");
  const [chips, setChips] = useState(EMPTY_CHIPS);
  const [tagFilter, setTagFilter] = useState(EMPTY_TAG_FILTER);

  const [editing, setEditing] = useState(null); // null | "new" | profil
  const [confirmId, setConfirmId] = useState(null);
  const [pkOpenId, setPkOpenId] = useState(null);

  const load = useCallback(async () => {
    try {
      setError("");
      const [profils, prenoms, images, proxys, tags, syncMeta, fiches, liens, notes] =
        await Promise.all([
          getCollection("profils"),
          getCollection("prenoms"),
          getCollection("images"),
          getCollection("proxys"),
          getCollection("tags"),
          getCollection("syncMeta"),
          getCollection("fiches"),
          getCollection("liens"),
          getCollection("notes"),
        ]);
      setData({
        profils,
        prenoms,
        images,
        proxys,
        tags: [...tags].sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0)),
        syncMeta,
        fiches,
        liens,
        notes,
      });
    } catch (e) {
      setError(e.message || "Impossible de charger les profils.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const tagById = useMemo(() => Object.fromEntries(data.tags.map((t) => [t.id, t])), [data.tags]);

  // Statuts calculés à l'affichage (jamais stockés, cf. data-model.md).
  const entries = useMemo(() => {
    const ctx = {
      prenomById: Object.fromEntries(data.prenoms.map((p) => [p.id, p])),
      imageById: Object.fromEntries(data.images.map((i) => [i.id, i])),
      proxyById: Object.fromEntries(data.proxys.map((p) => [p.id, p])),
      metaByProfil: Object.fromEntries(data.syncMeta.map((m) => [m.profil_id, m])),
    };
    return data.profils.map((p) => buildEntry(p, ctx));
  }, [data]);

  const visible = useMemo(() => {
    const q = fold(search.trim());
    const list = entries.filter((e) => {
      const p = e.profil;
      if (q) {
        const haystack = [e.prenom?.nom, p.display_name, p.pronouns, p.description, p.pk_id]
          .map(fold)
          .join(" ");
        if (!haystack.includes(q)) return false;
      }
      if (status === "complete" && !e.complete) return false;
      if (status === "incomplete" && e.complete) return false;
      for (const c of CHIPS) {
        if (chips[c.key] && !c.test(e)) return false;
      }
      return matchesTagFilter(p.tag_ids, tagFilter);
    });
    const nameOf = (e) => e.prenom?.nom || "";
    list.sort((a, b) => {
      switch (sort) {
        case "za":
          return collator.compare(nameOf(b), nameOf(a));
        case "recent":
          return Date.parse(b.profil.created_at) - Date.parse(a.profil.created_at);
        case "old":
          return Date.parse(a.profil.created_at) - Date.parse(b.profil.created_at);
        default:
          return collator.compare(nameOf(a), nameOf(b));
      }
    });
    return list;
  }, [entries, search, status, chips, tagFilter, sort]);

  const hasFilter =
    search.trim() !== "" ||
    status !== "" ||
    isTagFilterActive(tagFilter) ||
    Object.values(chips).some(Boolean);

  function resetFilters() {
    setSearch("");
    setStatus("");
    setChips(EMPTY_CHIPS);
    setTagFilter(EMPTY_TAG_FILTER);
  }

  // Ce qui sera touché si on supprime ce profil (schema.sql) :
  // - fiches et sync_meta : supprimées en cascade par la base
  // - liens / notes : pas de clé étrangère, donc gérés ici
  function impactOf(profil) {
    return {
      fiches: data.fiches.filter((f) => f.profil_id === profil.id).length,
      liens: data.liens.filter(
        (l) =>
          l.cible_type === "profil" && (l.source_id === profil.id || l.target_id === profil.id)
      ),
      notes: data.notes.filter((n) => n.cible_type === "profil" && n.cible_id === profil.id),
    };
  }

  function impactLines(impact) {
    const lines = [];
    if (impact.fiches) lines.push(plural(impact.fiches, "fiche supprimée", "fiches supprimées"));
    if (impact.liens.length)
      lines.push(plural(impact.liens.length, "lien supprimé", "liens supprimés"));
    if (impact.notes.length)
      lines.push(
        `${plural(impact.notes.length, "note conservée", "notes conservées")}, non rattachée${
          impact.notes.length > 1 ? "s" : ""
        }`
      );
    return lines;
  }

  function labelOf(prenomId) {
    return data.prenoms.find((p) => p.id === prenomId)?.nom || "profil";
  }

  async function handleSubmit(values) {
    setNotice("");
    setError("");
    setSaving(true);
    try {
      if (editing === "new") {
        const created = await insertRow("profils", values);
        if (!created) throw new Error(SAVE_ERROR);
        await addJournalEntry({
          action: "create",
          entityType: "profil",
          entityId: created.id,
          details: labelOf(values.prenom_id),
        });
        setNotice("Profil créé.");
      } else {
        const updated = await updateRow("profils", editing.id, {
          ...values,
          updated_at: new Date().toISOString(),
        });
        if (!updated) throw new Error(SAVE_ERROR);
        await addJournalEntry({
          action: "update",
          entityType: "profil",
          entityId: editing.id,
          details: labelOf(values.prenom_id),
        });
      }
      setEditing(null);
      await load();
    } catch (e) {
      setError(e.message || "Échec de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(entry) {
    setNotice("");
    const profil = entry.profil;
    const impact = impactOf(profil);
    try {
      if (!(await deleteRow("profils", profil.id))) throw new Error(SAVE_ERROR);

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

      const name = entry.prenom?.nom || "profil";
      const summary = impactLines(impact).join(", ");
      await addJournalEntry({
        action: "delete",
        entityType: "profil",
        entityId: profil.id,
        details: summary ? `${name} — ${summary}` : name,
      });
      setConfirmId(null);
      if (pkOpenId === profil.id) setPkOpenId(null);
      await load();
      if (results.some((r) => !r)) {
        setError(
          "Profil supprimé, mais le nettoyage de certains liens ou notes a échoué (voir la console)."
        );
      }
    } catch (e) {
      setError(e.message || "Échec de la suppression.");
    }
  }

  function openForm(target) {
    setNotice("");
    setConfirmId(null);
    setPkOpenId(null);
    setEditing(target);
  }

  return (
    <section className="profils-page">
      <header className="profils-page__header">
        <div>
          <p className="profils-page__eyebrow">Profil</p>
          <h1 className="profils-page__title">
            Profils <span className="profils-page__count">({data.profils.length})</span>
            {hasFilter && (
              <span className="profils-page__count">
                {" "}
                — {visible.length} affiché{visible.length > 1 ? "s" : ""}
              </span>
            )}
          </h1>
        </div>
        {!editing && (
          <button className="ps-button-primary" onClick={() => openForm("new")}>
            + Nouveau profil
          </button>
        )}
      </header>

      {error && <p className="profils-page__error">{error}</p>}
      {notice && (
        <p className="profils-page__notice" role="status">
          {notice}
        </p>
      )}

      {editing && (
        <ProfilForm
          key={editing === "new" ? "new" : editing.id}
          profil={editing === "new" ? null : editing}
          profils={data.profils}
          prenoms={data.prenoms}
          images={data.images}
          proxys={data.proxys}
          tags={data.tags}
          saving={saving}
          onSubmit={handleSubmit}
          onCancel={() => setEditing(null)}
        />
      )}

      <div className="profils-page__toolbar">
        <div className="profils-page__toolbar-row">
          <input
            type="search"
            className="profils-page__search"
            placeholder="Rechercher un prénom, un nom d'affichage, des pronoms…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="profils-page__select"
            aria-label="Statut"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <select
            className="profils-page__select"
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

        <TagFilter tags={data.tags} value={tagFilter} onChange={setTagFilter} />

        <div className="profils-page__filters" role="group" aria-label="Filtres">
          {CHIPS.map((c) => (
            <button
              key={c.key}
              type="button"
              className={`profils-page__chip${chips[c.key] ? " is-active" : ""}`}
              aria-pressed={chips[c.key]}
              onClick={() => setChips((cur) => ({ ...cur, [c.key]: !cur[c.key] }))}
            >
              {c.label}
            </button>
          ))}
          {hasFilter && (
            <button type="button" className="profils-page__reset" onClick={resetFilters}>
              Réinitialiser
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <p className="profils-page__empty">Chargement…</p>
      ) : data.profils.length === 0 ? (
        <p className="profils-page__empty">Aucun profil pour l'instant. Crée le premier !</p>
      ) : visible.length === 0 ? (
        <p className="profils-page__empty">Aucun profil ne correspond aux filtres.</p>
      ) : (
        <ul className="profils-page__list">
          {visible.map((entry) => {
            const id = entry.profil.id;
            const confirming = confirmId === id;
            return (
              <ProfilRow
                key={id}
                entry={entry}
                tags={(entry.profil.tag_ids || []).map((t) => tagById[t]).filter(Boolean)}
                pkOpen={pkOpenId === id}
                confirming={confirming}
                impactLines={confirming ? impactLines(impactOf(entry.profil)) : []}
                onTogglePk={() => setPkOpenId(pkOpenId === id ? null : id)}
                onEdit={() => openForm(entry.profil)}
                onAskDelete={() => {
                  setEditing(null);
                  setPkOpenId(null);
                  setConfirmId(id);
                }}
                onCancelDelete={() => setConfirmId(null)}
                onDelete={() => handleDelete(entry)}
              />
            );
          })}
        </ul>
      )}
    </section>
  );
}