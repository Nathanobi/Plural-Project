import TagColorDot from "./TagColorDot";
import { CONFLICT_LABEL } from "./proxyUtils";
import "./ProxyRow.css";

// Une ligne de la liste des proxys.
// `conflictLines` : phrases déjà formatées par la page.
export default function ProxyRow({
  example,
  prenomName,
  tags,
  conflict,
  conflictLines,
  profilCount,
  confirming,
  onEdit,
  onAskDelete,
  onCancelDelete,
  onDelete,
}) {
  const types = conflict ? [...new Set(conflict.items.map((i) => i.type))] : [];

  return (
    <li className="proxy-row">
      <div className="proxy-row__main">
        <div className="proxy-row__name">
          <strong>{prenomName || "Prénom introuvable"}</strong>
          <code className="proxy-row__code">{example}</code>
        </div>

        <div className="proxy-row__badges">
          {types.map((type) => (
            <span
              key={type}
              className={`ps-badge ${
                conflict.items.some((i) => i.type === type && i.severity === "error")
                  ? "ps-badge-error"
                  : "ps-badge-warning"
              }`}
            >
              {CONFLICT_LABEL[type]}
            </span>
          ))}
          {tags.map((tag) => (
            <span key={tag.id} className="proxy-row__tag">
              <TagColorDot color={tag.couleur} />
              {tag.nom}
            </span>
          ))}
        </div>

        {conflictLines.length > 0 && (
          <ul className="proxy-row__conflicts">
            {conflictLines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        )}

        {confirming && (
          <p className="proxy-row__confirm-text">
            Supprimer ce proxy
            {profilCount > 0
              ? ` (retiré de ${profilCount} profil${profilCount > 1 ? "s" : ""})`
              : ""}{" "}
            ?
          </p>
        )}
      </div>

      <div className="proxy-row__actions">
        {confirming ? (
          <>
            <button type="button" className="proxy-row__btn proxy-row__btn--danger" onClick={onDelete}>
              Oui
            </button>
            <button type="button" className="proxy-row__btn" onClick={onCancelDelete}>
              Non
            </button>
          </>
        ) : (
          <>
            <button type="button" className="proxy-row__btn" onClick={onEdit}>
              Modifier
            </button>
            <button type="button" className="proxy-row__btn" onClick={onAskDelete}>
              Supprimer
            </button>
          </>
        )}
      </div>
    </li>
  );
}