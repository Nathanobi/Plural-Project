import TagColorDot from "./TagColorDot";
import "./TagFilter.css";

const NEXT_STATE = { off: "include", include: "exclude", exclude: "off" };
const STATE_LABEL = { off: "", include: "avec", exclude: "sans" };

// Filtre de tags à 3 états. `value` = { states, untagged, mode } (voir tagFilterUtils.js).
// Clic sur un tag : neutre → inclure → exclure → neutre.
export default function TagFilter({ tags, value, onChange }) {
  if (tags.length === 0) return null;

  const includedCount = Object.values(value.states).filter((s) => s === "include").length;
  const showMode = includedCount >= 2 && !value.untagged;

  function cycle(id) {
    const next = NEXT_STATE[value.states[id] || "off"];
    const states = { ...value.states };
    if (next === "off") delete states[id];
    else states[id] = next;
    onChange({ ...value, states });
  }

  function toggleUntagged() {
    onChange({ ...value, states: {}, untagged: !value.untagged });
  }

  function setMode(mode) {
    onChange({ ...value, mode });
  }

  return (
    <div className="tag-filter" role="group" aria-label="Filtrer par tag">
      {tags.map((tag) => {
        const state = value.states[tag.id] || "off";
        return (
          <button
            key={tag.id}
            type="button"
            className={`tag-filter__chip tag-filter__chip--${state}`}
            disabled={value.untagged}
            onClick={() => cycle(tag.id)}
            title="Clic : avec → sans → désactivé"
          >
            <TagColorDot color={tag.couleur} />
            {STATE_LABEL[state] && <span className="tag-filter__state">{STATE_LABEL[state]}</span>}
            {tag.nom}
          </button>
        );
      })}
      <button
        type="button"
        className={`tag-filter__chip tag-filter__chip--${value.untagged ? "include" : "off"}`}
        onClick={toggleUntagged}
      >
        sans tag
      </button>

      {showMode && (
        <div className="tag-filter__mode" role="group" aria-label="Combinaison des tags inclus">
          <span className="tag-filter__mode-label">Tags inclus :</span>
          <button
            type="button"
            className={`tag-filter__mode-btn${value.mode !== "and" ? " is-active" : ""}`}
            aria-pressed={value.mode !== "and"}
            onClick={() => setMode("or")}
            title="Au moins un des tags inclus"
          >
            OU
          </button>
          <button
            type="button"
            className={`tag-filter__mode-btn${value.mode === "and" ? " is-active" : ""}`}
            aria-pressed={value.mode === "and"}
            onClick={() => setMode("and")}
            title="Tous les tags inclus"
          >
            ET
          </button>
        </div>
      )}
    </div>
  );
}