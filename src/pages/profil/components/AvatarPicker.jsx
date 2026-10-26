import { useMemo, useState } from "react";
import "./AvatarPicker.css";

// Choix de l'avatar parmi les images hébergées (Pluralkit exige un lien direct).
// Par défaut : images du prénom choisi ; bouton pour afficher toutes les images.
export default function AvatarPicker({ images, prenomId, value, onChange }) {
  const [showAll, setShowAll] = useState(false);
  const all = showAll || !prenomId;

  const candidates = useMemo(
    () =>
      images.filter(
        (img) => img.url_hebergee && (all || img.prenom_id === prenomId || img.id === value)
      ),
    [images, prenomId, value, all]
  );

  return (
    <div className="avatar-picker">
      <div className="avatar-picker__grid" role="group" aria-label="Avatar">
        <button
          type="button"
          className={`avatar-picker__none${!value ? " is-on" : ""}`}
          aria-pressed={!value}
          onClick={() => onChange("")}
        >
          Aucun
        </button>
        {candidates.map((img, i) => (
          <button
            key={img.id}
            type="button"
            className={`avatar-picker__item${value === img.id ? " is-on" : ""}`}
            aria-pressed={value === img.id}
            aria-label={`Image ${i + 1}`}
            onClick={() => onChange(img.id)}
          >
            <img src={img.url_hebergee} alt="" loading="lazy" />
          </button>
        ))}
      </div>

      {candidates.length === 0 && (
        <p className="avatar-picker__hint">
          {all
            ? "Aucune image hébergée pour l'instant (Profil > Images)."
            : "Ce prénom n'a pas d'image hébergée."}
        </p>
      )}

      {prenomId && (
        <button type="button" className="avatar-picker__link" onClick={() => setShowAll((v) => !v)}>
          {showAll ? "Afficher seulement les images de ce prénom" : "Afficher toutes les images"}
        </button>
      )}
    </div>
  );
}