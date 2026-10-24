import { useState } from "react";
import "./TagForm.css";

const DEFAULT_COLOR = "#4F6BED";
const HEX_RE = /^#[0-9A-Fa-f]{6}$/;

// Formulaire de création / édition d'un tag.
// `tag` absent = création. `tags` sert à proposer un parent (hiérarchie).
export default function TagForm({ tag, tags, onSubmit, onCancel }) {
  const [nom, setNom] = useState(tag?.nom ?? "");
  const [couleur, setCouleur] = useState(tag?.couleur ?? DEFAULT_COLOR);
  const [description, setDescription] = useState(tag?.description ?? "");
  const [parentId, setParentId] = useState(tag?.parent_id ?? "");
  const [error, setError] = useState("");

  const parentOptions = tags.filter((t) => t.id !== tag?.id);

  function handleSubmit(e) {
    e.preventDefault();
    const cleanNom = nom.trim();
    if (!cleanNom) return setError("Le nom est obligatoire.");
    if (!HEX_RE.test(couleur)) return setError("Couleur invalide (format #RRGGBB).");
    const duplicate = tags.some(
      (t) => t.id !== tag?.id && t.nom.trim().toLowerCase() === cleanNom.toLowerCase()
    );
    if (duplicate) return setError("Un tag porte déjà ce nom.");
    onSubmit({
      nom: cleanNom,
      couleur: couleur.toUpperCase(),
      description: description.trim() || null,
      parent_id: parentId || null,
    });
  }

  return (
    <form className="tag-form ps-card" onSubmit={handleSubmit}>
      <h2 className="tag-form__title">{tag ? "Modifier le tag" : "Nouveau tag"}</h2>

      <label className="tag-form__field">
        <span>Nom</span>
        <input
          type="text"
          value={nom}
          onChange={(e) => setNom(e.target.value)}
          autoFocus
        />
      </label>

      <div className="tag-form__field">
        <span>Couleur</span>
        <div className="tag-form__color">
          <input
            type="color"
            aria-label="Choisir une couleur"
            value={HEX_RE.test(couleur) ? couleur : DEFAULT_COLOR}
            onChange={(e) => setCouleur(e.target.value)}
          />
          <input
            type="text"
            aria-label="Code HEX"
            value={couleur}
            onChange={(e) => setCouleur(e.target.value)}
            maxLength={7}
          />
        </div>
      </div>

      <label className="tag-form__field">
        <span>Description (optionnel)</span>
        <textarea
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </label>

      <label className="tag-form__field">
        <span>Groupe parent (optionnel)</span>
        <select value={parentId} onChange={(e) => setParentId(e.target.value)}>
          <option value="">Aucun</option>
          {parentOptions.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nom}
            </option>
          ))}
        </select>
      </label>

      {error && <p className="tag-form__error">{error}</p>}

      <div className="tag-form__actions">
        <button type="button" className="tag-btn tag-btn--secondary" onClick={onCancel}>
          Annuler
        </button>
        <button type="submit" className="tag-btn tag-btn--primary">
          {tag ? "Enregistrer" : "Créer"}
        </button>
      </div>
    </form>
  );
}
