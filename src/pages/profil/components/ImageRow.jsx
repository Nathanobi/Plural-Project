import { useState } from "react";
import { Check, Copy, ExternalLink, ImageOff } from "lucide-react";
import TagColorDot from "./TagColorDot";
import "./ImageRow.css";

// Une ligne de la liste des images.
export default function ImageRow({
  image,
  prenomName,
  tags,
  confirming,
  onEdit,
  onAskDelete,
  onCancelDelete,
  onDelete,
}) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(image.url_hebergee);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <li className="image-row">
      <div className="image-row__thumb">
        {image.url_hebergee ? (
          <img src={image.url_hebergee} alt={prenomName || "Image"} loading="lazy" />
        ) : (
          <ImageOff size={22} strokeWidth={1.5} />
        )}
      </div>

      <div className="image-row__main">
        <div className="image-row__name">
          <strong>{prenomName || "Sans prénom"}</strong>
          <span className="image-row__date">
            {new Date(image.created_at).toLocaleDateString("fr-FR")}
          </span>
        </div>

        <div className="image-row__badges">
          {!image.prenom_id && <span className="ps-badge ps-badge-warning">Sans prénom</span>}
          {image.url_hebergee ? (
            <span className="ps-badge ps-badge-success">Hébergée</span>
          ) : (
            <span className="ps-badge ps-badge-warning">Non hébergée</span>
          )}
          {image.recadrage && <span className="ps-badge ps-badge-success">Recadrée</span>}
          {tags.map((tag) => (
            <span key={tag.id} className="image-row__tag">
              <TagColorDot color={tag.couleur} />
              {tag.nom}
            </span>
          ))}
        </div>
      </div>

      <div className="image-row__actions">
        {confirming ? (
          <>
            <span className="image-row__confirm">Supprimer ?</span>
            <button type="button" className="image-row__btn image-row__btn--danger" onClick={onDelete}>
              Oui
            </button>
            <button type="button" className="image-row__btn" onClick={onCancelDelete}>
              Non
            </button>
          </>
        ) : (
          <>
            {image.url_hebergee && (
              <button type="button" className="image-row__btn" onClick={copyLink}>
                {copied ? <Check size={14} strokeWidth={1.75} /> : <Copy size={14} strokeWidth={1.75} />}
                {copied ? "Copié" : "Copier le lien"}
              </button>
            )}
            {image.url_pinterest_source && (
              <a
                className="image-row__btn"
                href={image.url_pinterest_source}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink size={14} strokeWidth={1.75} /> Source
              </a>
            )}
            <button type="button" className="image-row__btn" onClick={onEdit}>
              Modifier
            </button>
            <button type="button" className="image-row__btn" onClick={onAskDelete}>
              Supprimer
            </button>
          </>
        )}
      </div>
    </li>
  );
}