import { useMemo, useState } from "react";
import TagPicker from "./TagPicker";
import AvatarPicker from "./AvatarPicker";
import ProxyPicker from "./ProxyPicker";
import { HEX_RE, PK_ID_RE, LIMITS } from "./profilUtils";
import "./ProfilForm.css";

const DEFAULT_COLOR = "#4F6BED";
const collator = new Intl.Collator("fr", { sensitivity: "base", numeric: true });

// Formulaire de création / édition d'un profil.
// `profil` absent = création. onSubmit reçoit les colonnes de `profils` prêtes à écrire.
export default function ProfilForm({
  profil,
  profils,
  prenoms,
  images,
  proxys,
  tags,
  saving,
  onSubmit,
  onCancel,
}) {
  const isEdit = Boolean(profil);
  const [prenomId, setPrenomId] = useState(profil?.prenom_id ?? "");
  const [imageId, setImageId] = useState(profil?.image_id ?? "");
  const [proxyIds, setProxyIds] = useState(() =>
    (profil?.proxy_ids ?? []).filter((id) => proxys.some((p) => p.id === id))
  );
  const [tagIds, setTagIds] = useState(profil?.tag_ids ?? []);
  const [displayName, setDisplayName] = useState(profil?.display_name ?? "");
  const [pronouns, setPronouns] = useState(profil?.pronouns ?? "");
  const [color, setColor] = useState(profil?.color ?? "");
  const [birthday, setBirthday] = useState(profil?.birthday ?? "");
  const [description, setDescription] = useState(profil?.description ?? "");
  const [pkId, setPkId] = useState(profil?.pk_id ?? "");
  const [error, setError] = useState("");

  const sortedPrenoms = useMemo(
    () => [...prenoms].sort((a, b) => collator.compare(a.nom, b.nom)),
    [prenoms]
  );
  const prenomProxys = useMemo(
    () => proxys.filter((p) => p.prenom_id === prenomId),
    [proxys, prenomId]
  );
  const selectedPrenom = prenoms.find((p) => p.id === prenomId);
  const hasOtherProfil =
    prenomId && profils.some((p) => p.prenom_id === prenomId && p.id !== profil?.id);

  // Un proxy appartient à un prénom : on retire ceux qui ne correspondent plus.
  function changePrenom(id) {
    setPrenomId(id);
    setProxyIds((ids) => ids.filter((pid) => proxys.find((p) => p.id === pid)?.prenom_id === id));
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!prenomId) return setError("Choisis un prénom.");

    let hex = color.trim();
    if (/^[0-9A-Fa-f]{6}$/.test(hex)) hex = `#${hex}`; // accepte la forme Pluralkit
    if (hex && !HEX_RE.test(hex)) return setError("Couleur invalide (format #RRGGBB).");

    const pk = pkId.trim().toLowerCase();
    if (pk && !PK_ID_RE.test(pk)) {
      return setError("L'ID Pluralkit compte 5 ou 6 lettres minuscules.");
    }

    onSubmit({
      prenom_id: prenomId,
      image_id: imageId || null,
      proxy_ids: proxyIds,
      tag_ids: tagIds,
      display_name: displayName.trim() || null,
      pronouns: pronouns.trim() || null,
      color: hex ? hex.toUpperCase() : null,
      birthday: birthday || null,
      description: description.trim() || null,
      pk_id: pk || null,
    });
  }

  return (
    <form className="profil-form ps-card" onSubmit={handleSubmit}>
      <h2 className="profil-form__title">{isEdit ? "Modifier le profil" : "Nouveau profil"}</h2>

      <h3 className="profil-form__section">Identité</h3>

      <label className="profil-form__field">
        <span>Prénom</span>
        <select value={prenomId} onChange={(e) => changePrenom(e.target.value)} autoFocus>
          <option value="">— Choisir —</option>
          {sortedPrenoms.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nom}
            </option>
          ))}
        </select>
        {hasOtherProfil && (
          <span className="profil-form__hint">Ce prénom a déjà un profil.</span>
        )}
      </label>

      <div className="profil-form__field">
        <span>Avatar</span>
        <AvatarPicker images={images} prenomId={prenomId} value={imageId} onChange={setImageId} />
      </div>

      <div className="profil-form__field">
        <span>Proxys</span>
        <ProxyPicker
          proxys={prenomProxys}
          hasPrenom={Boolean(prenomId)}
          value={proxyIds}
          onChange={setProxyIds}
        />
      </div>

      <div className="profil-form__field">
        <span>Tags</span>
        <TagPicker tags={tags} value={tagIds} onChange={setTagIds} />
      </div>

      <h3 className="profil-form__section">Informations Pluralkit</h3>

      <label className="profil-form__field">
        <span>Nom d'affichage (optionnel)</span>
        <input
          type="text"
          value={displayName}
          maxLength={LIMITS.displayName}
          placeholder={selectedPrenom?.nom ?? ""}
          onChange={(e) => setDisplayName(e.target.value)}
        />
      </label>

      <label className="profil-form__field">
        <span>Pronoms (optionnel)</span>
        <input
          type="text"
          value={pronouns}
          maxLength={LIMITS.pronouns}
          onChange={(e) => setPronouns(e.target.value)}
        />
      </label>

      <div className="profil-form__field">
        <span>Couleur (optionnel)</span>
        <div className="profil-form__color">
          <input
            type="color"
            aria-label="Choisir une couleur"
            value={HEX_RE.test(color) ? color : DEFAULT_COLOR}
            onChange={(e) => setColor(e.target.value)}
          />
          <input
            type="text"
            aria-label="Code HEX"
            value={color}
            placeholder="#RRGGBB"
            maxLength={7}
            onChange={(e) => setColor(e.target.value)}
          />
          {color && (
            <button type="button" className="profil-form__link-btn" onClick={() => setColor("")}>
              Effacer
            </button>
          )}
        </div>
      </div>

      <label className="profil-form__field">
        <span>Anniversaire (optionnel)</span>
        <input type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)} />
      </label>

      <label className="profil-form__field">
        <span>Description (optionnel)</span>
        <textarea
          rows={4}
          value={description}
          maxLength={LIMITS.description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </label>

      <label className="profil-form__field">
        <span>ID Pluralkit (optionnel, rempli par la synchro)</span>
        <input
          type="text"
          value={pkId}
          maxLength={6}
          placeholder="abcde"
          onChange={(e) => setPkId(e.target.value)}
        />
      </label>

      {error && <p className="profil-form__error">{error}</p>}

      <div className="profil-form__actions">
        <button type="button" className="ps-button-secondary" onClick={onCancel} disabled={saving}>
          Annuler
        </button>
        <button type="submit" className="ps-button-primary" disabled={saving}>
          {saving ? "Enregistrement…" : isEdit ? "Enregistrer" : "Créer le profil"}
        </button>
      </div>
    </form>
  );
}