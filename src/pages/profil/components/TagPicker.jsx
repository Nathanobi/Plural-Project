import TagColorDot from "./TagColorDot";
import "./TagPicker.css";

// Sélecteur multiple de tags (pastilles cliquables) pour les formulaires.
export default function TagPicker({ tags, selected, onChange }) {
  if (tags.length === 0) {
    return (
      <p className="tag-picker__empty">
        Aucun tag disponible. Tu peux en créer dans Profil &gt; Tags.
      </p>
    );
  }

  function toggle(id) {
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  }

  return (
    <div className="tag-picker" role="group" aria-label="Tags">
      {tags.map((tag) => {
        const isSelected = selected.includes(tag.id);
        return (
          <button
            key={tag.id}
            type="button"
            className={`tag-picker__chip${isSelected ? " is-selected" : ""}`}
            aria-pressed={isSelected}
            onClick={() => toggle(tag.id)}
          >
            <TagColorDot color={tag.couleur} />
            {tag.nom}
          </button>
        );
      })}
    </div>
  );
}