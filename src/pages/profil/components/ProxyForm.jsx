import { useMemo, useState } from "react";
import TagPicker from "./TagPicker";
import { findConflicts, formatProxy, suggestProxies, CONFLICT_LABEL, CONFLICT_HINT } from "./proxyUtils";
import "./ProxyForm.css";

const collator = new Intl.Collator("fr", { sensitivity: "base", numeric: true });
const DRAFT_ID = "__draft";

// Formulaire de création / édition d'un proxy.
// `proxy` absent = création ; `presetPrenomId` pré-sélectionne le prénom.
export default function ProxyForm({
  proxy,
  presetPrenomId,
  proxys,
  prenoms,
  tags,
  saving,
  error,
  onSubmit,
  onCancel,
}) {
  const [prenomId, setPrenomId] = useState(proxy?.prenom_id ?? presetPrenomId ?? "");
  const [prefix, setPrefix] = useState(proxy?.prefix ?? "");
  const [suffix, setSuffix] = useState(proxy?.suffix ?? "");
  const [tagIds, setTagIds] = useState(proxy?.tag_ids ?? []);
  const [localError, setLocalError] = useState("");

  const others = useMemo(() => proxys.filter((p) => p.id !== proxy?.id), [proxys, proxy]);

  const sortedPrenoms = useMemo(
    () => [...prenoms].sort((a, b) => collator.compare(a.nom, b.nom)),
    [prenoms]
  );
  const countByPrenom = useMemo(() => {
    const counts = {};
    for (const p of others) counts[p.prenom_id] = (counts[p.prenom_id] || 0) + 1;
    return counts;
  }, [others]);

  const prenom = prenoms.find((p) => p.id === prenomId);
  const cleanPrefix = prefix.trim();
  const cleanSuffix = suffix.trim();
  const hasTag = Boolean(cleanPrefix || cleanSuffix);

  const suggestions = useMemo(() => {
    const tagNoms = tags.filter((t) => tagIds.includes(t.id)).map((t) => t.nom);
    return suggestProxies(prenom?.nom, tagNoms, others);
  }, [prenom, tags, tagIds, others]);

  // Conflits que provoquerait le proxy en cours de saisie.
  const liveConflicts = useMemo(() => {
    if (!hasTag) return [];
    const draft = { id: DRAFT_ID, prenom_id: prenomId, prefix: cleanPrefix, suffix: cleanSuffix };
    return findConflicts([...others, draft]).filter(
      (c) => c.a.id === DRAFT_ID || c.b.id === DRAFT_ID
    );
  }, [others, prenomId, cleanPrefix, cleanSuffix, hasTag]);

  const nameOf = (id) => prenoms.find((p) => p.id === id)?.nom || "?";
  const exact = liveConflicts.find((c) => c.type === "identique" || c.type === "doublon");

  function applySuggestion(s) {
    setPrefix(s.prefix);
    setSuffix(s.suffix);
    setLocalError("");
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!prenomId) return setLocalError("Choisis un prénom.");
    if (!hasTag) return setLocalError("Renseigne au moins un préfixe ou un suffixe.");
    if (exact) return setLocalError("Ce proxy existe déjà.");
    setLocalError("");
    onSubmit({
      prenom_id: prenomId,
      prefix: cleanPrefix,
      suffix: cleanSuffix,
      tag_ids: tagIds,
    });
  }

  return (
    <form className="proxy-form ps-card" onSubmit={handleSubmit}>
      <h2 className="proxy-form__title">{proxy ? "Modifier le proxy" : "Nouveau proxy"}</h2>

      <label className="proxy-form__field">
        <span>Prénom</span>
        <select value={prenomId} onChange={(e) => setPrenomId(e.target.value)} autoFocus>
          <option value="">Choisir un prénom…</option>
          {sortedPrenoms.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nom}
              {countByPrenom[p.id] ? "" : " — sans proxy"}
            </option>
          ))}
        </select>
        {prenoms.length === 0 && (
          <span className="proxy-form__hint">Crée d'abord un prénom (Profil &gt; Prénoms).</span>
        )}
      </label>

      <div className="proxy-form__row">
        <label className="proxy-form__field">
          <span>Préfixe</span>
          <input
            type="text"
            value={prefix}
            onChange={(e) => setPrefix(e.target.value)}
            placeholder="ex. Alex:"
            autoComplete="off"
            spellCheck={false}
          />
        </label>
        <label className="proxy-form__field">
          <span>Suffixe</span>
          <input
            type="text"
            value={suffix}
            onChange={(e) => setSuffix(e.target.value)}
            placeholder="ex. ]"
            autoComplete="off"
            spellCheck={false}
          />
        </label>
      </div>

      <div className="proxy-form__preview" aria-live="polite">
        <span className="proxy-form__label">Aperçu</span>
        {hasTag ? (
          <>
            <code className="proxy-form__code">
              {formatProxy({ prefix: cleanPrefix, suffix: cleanSuffix })}
            </code>
            <span className="proxy-form__sent">
              Tu écris <code>{formatProxy({ prefix: cleanPrefix, suffix: cleanSuffix }, "Bonjour !")}</code>
              {prenom ? (
                <>
                  {" "}
                  → envoyé par <strong>{prenom.nom}</strong> : « Bonjour ! »
                </>
              ) : null}
            </span>
          </>
        ) : (
          <span className="proxy-form__hint">Saisis un préfixe et/ou un suffixe.</span>
        )}
      </div>

      {suggestions.length > 0 && (
        <div className="proxy-form__field">
          <span>Suggestions{prenom ? ` pour ${prenom.nom}` : ""}</span>
          <div className="proxy-form__suggestions">
            {suggestions.map((s) => (
              <button
                key={`${s.prefix}|${s.suffix}`}
                type="button"
                className="proxy-form__suggestion"
                onClick={() => applySuggestion(s)}
              >
                {formatProxy(s)}
              </button>
            ))}
          </div>
        </div>
      )}

      {liveConflicts.length > 0 && (
        <ul className="proxy-form__conflicts">
          {liveConflicts.map((c) => {
            const other = c.a.id === DRAFT_ID ? c.b : c.a;
            return (
              <li
                key={`${c.type}-${other.id}`}
                className={`proxy-form__conflict proxy-form__conflict--${c.severity}`}
              >
                <strong>{CONFLICT_LABEL[c.type]}</strong> avec {nameOf(other.prenom_id)} (
                {formatProxy(other)}). {CONFLICT_HINT[c.type]}
              </li>
            );
          })}
        </ul>
      )}

      <div className="proxy-form__field">
        <span>Tags (optionnel)</span>
        <TagPicker tags={tags} value={tagIds} onChange={setTagIds} />
      </div>

      {(localError || error) && <p className="proxy-form__error">{localError || error}</p>}

      <div className="proxy-form__actions">
        <button type="button" className="ps-button-secondary" onClick={onCancel} disabled={saving}>
          Annuler
        </button>
        <button type="submit" className="ps-button-primary" disabled={saving}>
          {saving ? "Enregistrement…" : proxy ? "Enregistrer" : "Ajouter"}
        </button>
      </div>
    </form>
  );
}