import { useState } from "react";
import TagPicker from "./TagPicker";
import "./PrenomForm.css";

const norm = (s) => s.trim().toLowerCase();

// Un prénom par ligne, ou séparés par des virgules / points-virgules.
function parseNames(text) {
  return text
    .split(/[\n,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

// Formulaire de création (un ou plusieurs prénoms) / édition (un seul).
// `prenom` absent = création. onSubmit reçoit { noms, tag_ids, note, skipped }.
export default function PrenomForm({ prenom, prenoms, tags, saving, onSubmit, onCancel }) {
  const isEdit = Boolean(prenom);
  const [text, setText] = useState(prenom?.nom ?? "");
  const [tagIds, setTagIds] = useState(prenom?.tag_ids ?? []);
  const [note, setNote] = useState(prenom?.note ?? "");
  const [error, setError] = useState("");

  const batchCount = isEdit ? 1 : parseNames(text).length;

  function handleSubmit(e) {
    e.preventDefault();
    const existing = new Set(
      prenoms.filter((p) => p.id !== prenom?.id).map((p) => norm(p.nom))
    );
    const cleanNote = note.trim() || null;

    if (isEdit) {
      const nom = text.trim();
      if (!nom) return setError("Le prénom est obligatoire.");
      if (existing.has(norm(nom))) return setError("Un prénom porte déjà ce nom.");
      return onSubmit({ noms: [nom], tag_ids: tagIds, note: cleanNote, skipped: [] });
    }

    const names = parseNames(text);
    if (names.length === 0) return setError("Saisis au moins un prénom.");

    const seen = new Set(existing);
    const noms = [];
    const skipped = [];
    for (const n of names) {
      if (seen.has(norm(n))) {
        skipped.push(n);
      } else {
        seen.add(norm(n));
        noms.push(n);
      }
    }
    if (noms.length === 0) return setError("Ces prénoms existent déjà.");
    onSubmit({ noms, tag_ids: tagIds, note: cleanNote, skipped });
  }

  return (
    <form className="prenom-form ps-card" onSubmit={handleSubmit}>
      <h2 className="prenom-form__title">{isEdit ? "Modifier le prénom" : "Nouveaux prénoms"}</h2>

      <label className="prenom-form__field">
        <span>{isEdit ? "Prénom" : "Prénoms (un par ligne, ou séparés par des virgules)"}</span>
        {isEdit ? (
          <input type="text" value={text} onChange={(e) => setText(e.target.value)} autoFocus />
        ) : (
          <textarea rows={4} value={text} onChange={(e) => setText(e.target.value)} autoFocus />
        )}
      </label>

      <div className="prenom-form__field">
        <span>Tags (optionnel{isEdit ? "" : ", appliqués à chaque prénom"})</span>
        <TagPicker tags={tags} selected={tagIds} onChange={setTagIds} />
      </div>

      <label className="prenom-form__field">
        <span>Note (optionnel{isEdit ? "" : ", appliquée à chaque prénom"})</span>
        <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
      </label>

      {error && <p className="prenom-form__error">{error}</p>}

      <div className="prenom-form__actions">
        <button type="button" className="ps-button-secondary" onClick={onCancel} disabled={saving}>
          Annuler
        </button>
        <button type="submit" className="ps-button-primary" disabled={saving}>
          {saving
            ? "Enregistrement…"
            : isEdit
              ? "Enregistrer"
              : batchCount > 1
                ? `Ajouter ${batchCount} prénoms`
                : "Ajouter"}
        </button>
      </div>
    </form>
  );
}