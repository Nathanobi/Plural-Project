import TagColorDot from "./TagColorDot";
import "./TagPicker.css";

// Sélecteur multiple de tags (pastilles cliquables).
export default function TagPicker({ tags, value, onChange }) {
  if (tags.length === 0) {
    return <p className="tag-picker__empty">Aucun tag disponible (crée-en dans Profil &gt; Tags).</p>;
  }

  function toggle(id) {
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  }

  return (
    <div className="tag-picker" role="group" aria-label="Tags">
      {tags.map((tag) => {
        const on = value.includes(tag.id);
        return (
          <button
            key={tag.id}
            type="button"
            className={`tag-picker__chip${on ? " is-on" : ""}`}
            aria-pressed={on}
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