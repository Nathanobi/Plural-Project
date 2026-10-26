import { User } from "lucide-react";
import TagColorDot from "./TagColorDot";
import ProfilPkPanel from "./ProfilPkPanel";
import { MISSING_LABEL, SYNC_LABEL, SYNC_CLASS, proxyExample } from "./profilUtils";
import "./ProfilRow.css";

// Une ligne de la liste des profils (+ panneau PK et confirmation de suppression).
export default function ProfilRow({
  entry,
  tags,
  pkOpen,
  confirming,
  impactLines,
  onTogglePk,
  onEdit,
  onAskDelete,
  onCancelDelete,
  onDelete,
}) {
  const { profil, prenom, image, proxys, missing, complete, sync } = entry;
  const name = prenom?.nom || "Prénom introuvable";
  const showDisplay = profil.display_name && profil.display_name !== prenom?.nom;

  return (
    <li className="profil-row">
      <div className="profil-row__main">
        <div className="profil-row__avatar">
          {image?.url_hebergee ? (
            <img src={image.url_hebergee} alt={name} loading="lazy" />
          ) : (
            <User size={22} strokeWidth={1.5} />
          )}
        </div>

        <div className="profil-row__info">
          <div className="profil-row__name">
            {profil.color && <TagColorDot color={profil.color} />}
            <strong>{name}</strong>
            {showDisplay && <span className="profil-row__meta">· {profil.display_name}</span>}
            {profil.pronouns && <span className="profil-row__meta">· {profil.pronouns}</span>}
            {profil.birthday && <span className="profil-row__meta">· 🎂 {profil.birthday}</span>}
          </div>

          {profil.description && <p className="profil-row__desc">{profil.description}</p>}

          {proxys.length > 0 && (
            <div className="profil-row__proxys">
              {proxys.map((p) => (
                <code key={p.id} className="profil-row__proxy">
                  {proxyExample(p)}
                </code>
              ))}
            </div>
          )}

          <div className="profil-row__badges">
            {tags.map((tag) => (
              <span key={tag.id} className="profil-row__tag">
                <TagColorDot color={tag.couleur} />
                {tag.nom}
              </span>
            ))}
            {complete ? (
              <span className="ps-badge ps-badge-success">Complet</span>
            ) : (
              missing.map((m) => (
                <span key={m} className="ps-badge ps-badge-warning">
                  {MISSING_LABEL[m]}
                </span>
              ))
            )}
            <span className={`ps-badge ${SYNC_CLASS[sync]}`}>{SYNC_LABEL[sync]}</span>
          </div>
        </div>

        {!confirming && (
          <div className="profil-row__actions">
            <button type="button" className="ps-button-secondary profil-row__btn" onClick={onTogglePk}>
              {pkOpen ? "Masquer infos PK" : "Infos PK"}
            </button>
            <button type="button" className="ps-button-secondary profil-row__btn" onClick={onEdit}>
              Modifier
            </button>
            <button type="button" className="ps-button-secondary profil-row__btn" onClick={onAskDelete}>
              Supprimer
            </button>
          </div>
        )}
      </div>

      {pkOpen && !confirming && <ProfilPkPanel entry={entry} />}

      {confirming && (
        <div className="profil-row__confirm">
          <p className="profil-row__confirm-title">Supprimer le profil « {name} » ?</p>
          {impactLines.length > 0 && (
            <ul className="profil-row__confirm-list">
              {impactLines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          )}
          <div className="profil-row__confirm-actions">
            <button type="button" className="profil-row__btn-danger profil-row__btn" onClick={onDelete}>
              Oui, supprimer
            </button>
            <button type="button" className="ps-button-secondary profil-row__btn" onClick={onCancelDelete}>
              Non
            </button>
          </div>
        </div>
      )}
    </li>
  );
}