import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import "./ConnexionCard.css";

function getBadge(hasSaved, status) {
  if (!hasSaved) return { label: "Non configuré", className: "connexion-badge--neutral" };
  if (status === "valid") return { label: "Valide", className: "ps-badge-success" };
  if (status === "invalid") return { label: "Invalide", className: "ps-badge-error" };
  if (status === "unreachable") return { label: "Test impossible", className: "ps-badge-warning" };
  return { label: "Configuré · non testé", className: "ps-badge-warning" };
}

function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleString("fr-FR");
}

// Carte de saisie d'une clé : champ masqué, enregistrer, tester, effacer.
export default function ConnexionCard({
  id,
  title,
  description,
  placeholder,
  savedValue,
  status,
  detail,
  checkedAt,
  busy,
  onSave,
  onTest,
  onClear,
}) {
  const [draft, setDraft] = useState(savedValue);
  const [visible, setVisible] = useState(false);

  const clean = draft.trim();
  const dirty = clean !== savedValue;
  const badge = getBadge(Boolean(savedValue), status);
  const inputId = `connexion-${id}`;

  async function handleClear() {
    await onClear();
    setDraft("");
  }

  return (
    <section className="ps-card connexion-card">
      <header className="connexion-card__header">
        <h2 className="ps-section-title">{title}</h2>
        <span className={`ps-badge ${badge.className}`}>{badge.label}</span>
      </header>

      <p className="ps-muted">{description}</p>

      <label className="connexion-card__field" htmlFor={inputId}>
        <span className="ps-muted">Clé</span>
        <div className="connexion-card__input-row">
          <input
            id={inputId}
            className="connexion-card__input"
            type={visible ? "text" : "password"}
            value={draft}
            placeholder={placeholder}
            onChange={(e) => setDraft(e.target.value)}
            autoComplete="off"
            spellCheck={false}
          />
          <button
            type="button"
            className="connexion-card__eye"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? "Cacher la clé" : "Afficher la clé"}
          >
            {visible ? <EyeOff size={18} strokeWidth={1.75} /> : <Eye size={18} strokeWidth={1.75} />}
          </button>
        </div>
      </label>

      {dirty && <p className="ps-muted">Modifications non enregistrées.</p>}

      {detail && <p className="connexion-card__detail ps-body">{detail}</p>}
      {!dirty && savedValue && checkedAt && (
        <p className="ps-muted">Dernier test : {formatDate(checkedAt)}</p>
      )}

      <div className="connexion-card__actions">
        <button
          type="button"
          className="ps-button-primary connexion-card__btn"
          disabled={!dirty || !clean || Boolean(busy)}
          onClick={() => onSave(clean)}
        >
          {busy === "save" ? "Enregistrement…" : "Enregistrer"}
        </button>
        <button
          type="button"
          className="ps-button-secondary connexion-card__btn"
          disabled={!clean || Boolean(busy)}
          onClick={() => onTest(clean)}
        >
          {busy === "test" ? "Test en cours…" : "Tester la connexion"}
        </button>
        {savedValue && (
          <button
            type="button"
            className="ps-button-secondary connexion-card__btn"
            disabled={Boolean(busy)}
            onClick={handleClear}
          >
            Effacer
          </button>
        )}
      </div>
    </section>
  );
}