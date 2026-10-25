import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getCollection,
  insertRow,
  updateRow,
  deleteRow,
  addJournalEntry,
} from "../../lib/storage";
import ProxyForm from "./components/ProxyForm";
import ProxyRow from "./components/ProxyRow";
import ProxyAlerts from "./components/ProxyAlerts";
import ProxyTable from "./components/ProxyTable";
import ProxySimulator from "./components/ProxySimulator";
import TagFilter from "./components/TagFilter";
import {
  EMPTY_TAG_FILTER,
  isTagFilterActive,
  matchesTagFilter,
} from "./components/tagFilterUtils";
import {
  CONFLICT_LABEL,
  buildListText,
  findConflicts,
  fold,
  formatProxy,
  indexConflicts,
} from "./components/proxyUtils";
import "./ProxysPage.css";

// storage.js ne lève jamais d'exception : il renvoie null/false et logue la cause.
const SAVE_ERROR = "L'opération a échoué. Ouvre la console (F12) pour voir la cause exacte.";

const SORTS = [
  { value: "az", label: "Prénom (A → Z)" },
  { value: "za", label: "Prénom (Z → A)" },
  { value: "recent", label: "Plus récents d'abord" },
  { value: "old", label: "Plus anciens d'abord" },
];

const VIEWS = [
  { value: "liste", label: "Liste" },
  { value: "tableau", label: "Tableau prénom ↔ proxys" },
  { value: "simulateur", label: "Simulateur" },
];

const collator = new Intl.Collator("fr", { sensitivity: "base", numeric: true });

const plural = (n, one, many) => `${n} ${n > 1 ? many : one}`;

export default function ProxysPage() {
  const [proxys, setProxys] = useState([]);
  const [prenoms, setPrenoms] = useState([]);
  const [tags, setTags] = useState([]);
  const [profils, setProfils] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");

  const [view, setView] = useState("liste");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("az");
  const [tagFilter, setTagFilter] = useState(EMPTY_TAG_FILTER);
  const [onlyConflicts, setOnlyConflicts] = useState(false);

  const [editing, setEditing] = useState(null); // null | "new" | proxy
  const [presetPrenomId, setPresetPrenomId] = useState("");
  const [confirmId, setConfirmId] = useState(null);

  const load = useCallback(async () => {
    try {
      setError("");
      const [proxyList, prenomList, tagList, profilList] = await Promise.all([
        getCollection("proxys"),
        getCollection("prenoms"),
        getCollection("tags"),
        getCollection("profils"),
      ]);
      setProxys(proxyList);
      setPrenoms(prenomList);
      setTags([...tagList].sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0)));
      setProfils(profilList);
    } catch (e) {
      setError(e.message || "Impossible de charger les proxys.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const prenomName = useMemo(() => Object.fromEntries(prenoms.map((p) => [p.id, p.nom])), [prenoms]);
  const nameOf = useCallback((id) => prenomName[id] || "Prénom introuvable", [prenomName]);
  const tagById = useMemo(() => Object.fromEntries(tags.map((t) => [t.id, t])), [tags]);

  // Statuts et conflits calculés à l'affichage (jamais stockés).
  const conflicts = useMemo(() => findConflicts(proxys), [proxys]);
  const conflictIdx = useMemo(() => indexConflicts(conflicts), [conflicts]);

  const withoutProxy = useMemo(() => {
    const has = new Set(proxys.map((p) => p.prenom_id));
    return prenoms.filter((p) => !has.has(p.id)).sort((a, b) => collator.compare(a.nom, b.nom));
  }, [prenoms, proxys]);

  const visible = useMemo(() => {
    const q = fold(search.trim());
    const list = proxys.filter((p) => {
      if (q && !fold(nameOf(p.prenom_id)).includes(q) && !fold(formatProxy(p)).includes(q)) {
        return false;
      }
      if (!matchesTagFilter(p.tag_ids, tagFilter)) return false;
      if (onlyConflicts && !conflictIdx[p.id]) return false;
      return true;
    });
    list.sort((a, b) => {
      switch (sort) {
        case "za":
          return (
            collator.compare(nameOf(b.prenom_id), nameOf(a.prenom_id)) ||
            collator.compare(formatProxy(a), formatProxy(b))
          );
        case "recent":
          return Date.parse(b.created_at) - Date.parse(a.created_at);
        case "old":
          return Date.parse(a.created_at) - Date.parse(b.created_at);
        default:
          return (
            collator.compare(nameOf(a.prenom_id), nameOf(b.prenom_id)) ||
            collator.compare(formatProxy(a), formatProxy(b))
          );
      }
    });
    return list;
  }, [proxys, search, tagFilter, onlyConflicts, conflictIdx, sort, nameOf]);

  const hasFilter = search.trim() !== "" || isTagFilterActive(tagFilter) || onlyConflicts;

  function resetFilters() {
    setSearch("");
    setTagFilter(EMPTY_TAG_FILTER);
    setOnlyConflicts(false);
  }

  function openForm(target, prenomId = "") {
    setNotice("");
    setFormError("");
    setConfirmId(null);
    setPresetPrenomId(prenomId);
    setEditing(target);
    setView((v) => (v === "simulateur" ? "liste" : v));
  }

  function closeForm() {
    setEditing(null);
    setPresetPrenomId("");
    setFormError("");
  }

  async function handleSubmit(values) {
    setSaving(true);
    setFormError("");
    setNotice("");
    try {
      const label = `${nameOf(values.prenom_id)} — ${formatProxy(values)}`;
      if (editing === "new") {
        const created = await insertRow("proxys", values);
        if (!created) throw new Error(SAVE_ERROR);
        await addJournalEntry({
          action: "create",
          entityType: "proxy",
          entityId: created.id,
          details: label,
        });
        setNotice(`Proxy ajouté : ${formatProxy(values)}`);
      } else {
        const updated = await updateRow("proxys", editing.id, {
          ...values,
          updated_at: new Date().toISOString(),
        });
        if (!updated) throw new Error(SAVE_ERROR);
        await addJournalEntry({
          action: "update",
          entityType: "proxy",
          entityId: editing.id,
          details: label,
        });
        setNotice(`Proxy modifié : ${formatProxy(values)}`);
      }
      closeForm();
      await load();
    } catch (e) {
      setFormError(e.message || "Échec de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  }

  const profilsUsing = useCallback(
    (proxy) => profils.filter((pr) => (pr.proxy_ids || []).includes(proxy.id)),
    [profils]
  );

  async function handleDelete(proxy) {
    setNotice("");
    try {
      // Retire d'abord le proxy des profils pour ne laisser aucun id orphelin.
      const cleanup = profilsUsing(proxy).map((pr) =>
        updateRow("profils", pr.id, {
          proxy_ids: pr.proxy_ids.filter((id) => id !== proxy.id),
          updated_at: new Date().toISOString(),
        })
      );
      const results = await Promise.all(cleanup);
      if (results.some((r) => !r)) throw new Error(SAVE_ERROR);

      if (!(await deleteRow("proxys", proxy.id))) throw new Error(SAVE_ERROR);
      await addJournalEntry({
        action: "delete",
        entityType: "proxy",
        entityId: proxy.id,
        details: `${nameOf(proxy.prenom_id)} — ${formatProxy(proxy)}`,
      });
      setConfirmId(null);
      await load();
    } catch (e) {
      setError(e.message || "Échec de la suppression.");
    }
  }

  async function copyList() {
    setNotice("");
    setError("");
    if (proxys.length === 0) return setError("Aucun proxy à copier.");
    try {
      await navigator.clipboard.writeText(buildListText(proxys, nameOf));
      setNotice(`Liste copiée (${plural(proxys.length, "proxy", "proxys")}).`);
    } catch {
      setError("Impossible d'accéder au presse-papiers (autorisation du navigateur ?).");
    }
  }

  return (
    <section className="proxys-page">
      <header className="proxys-page__header">
        <div>
          <p className="proxys-page__eyebrow">Profil</p>
          <h1 className="proxys-page__title">
            Proxys <span className="proxys-page__count">({proxys.length})</span>
            {hasFilter && view === "liste" && (
              <span className="proxys-page__count">
                {" "}
                — {visible.length} affiché{visible.length > 1 ? "s" : ""}
              </span>
            )}
          </h1>
        </div>
        <div className="proxys-page__header-actions">
          <button type="button" className="ps-button-secondary" onClick={copyList}>
            Copier la liste
          </button>
          {!editing && (
            <button type="button" className="ps-button-primary" onClick={() => openForm("new")}>
              + Nouveau proxy
            </button>
          )}
        </div>
      </header>

      {error && <p className="proxys-page__error">{error}</p>}
      {notice && (
        <p className="proxys-page__notice" role="status">
          {notice}
        </p>
      )}

      {editing && (
        <ProxyForm
          key={editing === "new" ? `new-${presetPrenomId}` : editing.id}
          proxy={editing === "new" ? null : editing}
          presetPrenomId={presetPrenomId}
          proxys={proxys}
          prenoms={prenoms}
          tags={tags}
          saving={saving}
          error={formError}
          onSubmit={handleSubmit}
          onCancel={closeForm}
        />
      )}

      {!loading && (
        <ProxyAlerts
          withoutProxy={withoutProxy}
          conflicts={conflicts}
          nameOf={nameOf}
          onCreateFor={(id) => openForm("new", id)}
        />
      )}

      <div className="proxys-page__tabs" role="tablist" aria-label="Vue">
        {VIEWS.map((v) => (
          <button
            key={v.value}
            type="button"
            role="tab"
            aria-selected={view === v.value}
            className={`proxys-page__tab${view === v.value ? " is-active" : ""}`}
            onClick={() => setView(v.value)}
          >
            {v.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="proxys-page__empty">Chargement…</p>
      ) : (
        <>
          {view === "liste" && (
            <>
              <div className="proxys-page__toolbar">
                <div className="proxys-page__toolbar-row">
                  <input
                    type="search"
                    className="proxys-page__search"
                    placeholder="Rechercher un prénom ou un proxy…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  <select
                    className="proxys-page__sort"
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

                <TagFilter tags={tags} value={tagFilter} onChange={setTagFilter} />

                <div className="proxys-page__filters" role="group" aria-label="Filtres">
                  <button
                    type="button"
                    className={`proxys-page__chip${onlyConflicts ? " is-active" : ""}`}
                    aria-pressed={onlyConflicts}
                    onClick={() => setOnlyConflicts((v) => !v)}
                  >
                    en conflit
                  </button>
                  {hasFilter && (
                    <button type="button" className="proxys-page__reset" onClick={resetFilters}>
                      Réinitialiser
                    </button>
                  )}
                </div>
              </div>

              {proxys.length === 0 ? (
                <p className="proxys-page__empty">Aucun proxy pour l'instant. Crée le premier !</p>
              ) : visible.length === 0 ? (
                <p className="proxys-page__empty">Aucun proxy ne correspond aux filtres.</p>
              ) : (
                <ul className="proxys-page__list">
                  {visible.map((proxy) => {
                    const conflict = conflictIdx[proxy.id];
                    return (
                      <ProxyRow
                        key={proxy.id}
                        example={formatProxy(proxy)}
                        prenomName={prenomName[proxy.prenom_id]}
                        tags={(proxy.tag_ids || []).map((id) => tagById[id]).filter(Boolean)}
                        conflict={conflict}
                        conflictLines={(conflict?.items || []).map(
                          (i) =>
                            `${CONFLICT_LABEL[i.type]} avec ${nameOf(i.other.prenom_id)} (${formatProxy(i.other)})`
                        )}
                        profilCount={profilsUsing(proxy).length}
                        confirming={confirmId === proxy.id}
                        onEdit={() => openForm(proxy)}
                        onAskDelete={() => setConfirmId(proxy.id)}
                        onCancelDelete={() => setConfirmId(null)}
                        onDelete={() => handleDelete(proxy)}
                      />
                    );
                  })}
                </ul>
              )}
            </>
          )}

          {view === "tableau" && (
            <ProxyTable
              prenoms={prenoms}
              proxys={proxys}
              conflictIdx={conflictIdx}
              onAdd={(id) => openForm("new", id)}
            />
          )}

          {view === "simulateur" && <ProxySimulator proxys={proxys} nameOf={nameOf} />}
        </>
      )}
    </section>
  );
}