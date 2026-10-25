import { useEffect, useRef, useState } from "react";
import { Upload } from "lucide-react";
import TagPicker from "./TagPicker";
import ImageCropper from "./ImageCropper";
import "./ImageForm.css";

const NEW = "__new__";

// Formulaire d'ajout / édition d'une image.
// `image` absent = création. Le parent gère l'enregistrement (upload, prénom, base).
export default function ImageForm({ image, prenoms, tags, saving, error, onSubmit, onCancel }) {
  const [source, setSource] = useState(null); // { blob, url, name, fromHosted? }
  const [cropped, setCropped] = useState(null); // { blob, previewUrl, recadrage }
  const [prenomId, setPrenomId] = useState(image?.prenom_id ?? "");
  const [newNom, setNewNom] = useState("");
  const [tagIds, setTagIds] = useState(image?.tag_ids ?? []);
  const [pinterest, setPinterest] = useState(image?.url_pinterest_source ?? "");
  const [showCropper, setShowCropper] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [localError, setLocalError] = useState("");
  const fileRef = useRef(null);
  const urlsRef = useRef(new Set());

  useEffect(() => {
    const urls = urlsRef.current;
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, []);

  function makeUrl(blob) {
    const url = URL.createObjectURL(blob);
    urlsRef.current.add(url);
    return url;
  }

  function handleFile(file) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setLocalError("Ce fichier n'est pas une image.");
      return;
    }
    setLocalError("");
    setSource({ blob: file, url: makeUrl(file), name: file.name });
    setCropped(null);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files?.[0]);
  }

  async function loadFromLink() {
    const url = pinterest.trim();
    if (!url) return;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error("http");
      const blob = await res.blob();
      if (!blob.type.startsWith("image/")) throw new Error("not-image");
      const name = url.split("?")[0].split("/").pop() || "image";
      handleFile(new File([blob], name, { type: blob.type }));
    } catch {
      setLocalError(
        "Ce lien n'a pas pu être chargé comme image (une page de pin n'est pas une image, " +
          "et certains sites bloquent la lecture). Le lien est conservé : dépose ou parcours le fichier."
      );
    }
  }

  async function openCropper() {
    setLocalError("");
    if (source) {
      setShowCropper(true);
      return;
    }
    if (!image?.url_hebergee) return;
    try {
      const res = await fetch(image.url_hebergee);
      if (!res.ok) throw new Error("http");
      const blob = await res.blob();
      setSource({ blob, url: makeUrl(blob), name: "image.jpg", fromHosted: true });
      setShowCropper(true);
    } catch {
      setLocalError(
        "Impossible de relire l'image hébergée pour la recadrer. Dépose le fichier d'origine à la place."
      );
    }
  }

  function handleApply(result) {
    urlsRef.current.add(result.previewUrl);
    setCropped(result);
    setShowCropper(false);
  }

  function handleSubmit(e) {
    e.preventDefault();
    setLocalError("");
    const file = cropped?.blob ?? (source && !source.fromHosted ? source.blob : null);
    const pin = pinterest.trim();
    if (!file && !image?.url_hebergee && !pin) {
      return setLocalError("Ajoute une image (dépôt ou parcourir) ou un lien Pinterest.");
    }
    let newPrenomNom = null;
    if (prenomId === NEW) {
      newPrenomNom = newNom.trim();
      if (!newPrenomNom) return setLocalError("Saisis le nouveau prénom.");
    }
    onSubmit({
      file,
      filename: source?.name || "image.jpg",
      recadrage: cropped?.recadrage ?? null,
      prenomId: prenomId === NEW ? null : prenomId || null,
      newPrenomNom,
      tagIds,
      pinterest: pin || null,
    });
  }

  const beforeUrl = source?.url ?? image?.url_hebergee ?? null;
  const displayUrl = cropped?.previewUrl ?? beforeUrl;
  const sortedPrenoms = [...prenoms].sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
  const canCrop = Boolean(source || image?.url_hebergee);

  return (
    <form className="image-form ps-card" onSubmit={handleSubmit}>
      <h2 className="image-form__title">{image ? "Modifier l'image" : "Nouvelle image"}</h2>

      <div
        className={`image-form__drop${dragOver ? " is-over" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        <Upload size={22} strokeWidth={1.5} />
        <p className="image-form__drop-text">Glisse une image ici</p>
        <button type="button" className="ps-button-secondary" onClick={() => fileRef.current?.click()}>
          Parcourir
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="image-form__file-input"
          onChange={(e) => {
            handleFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>

      {displayUrl && (
        <div className="image-form__preview">
          {cropped && beforeUrl && (
            <figure className="image-form__figure">
              <img src={beforeUrl} alt="Avant recadrage" />
              <figcaption>Avant</figcaption>
            </figure>
          )}
          <figure className="image-form__figure">
            <img src={displayUrl} alt="Aperçu" />
            <figcaption>{cropped ? "Après" : "Aperçu"}</figcaption>
          </figure>
          <div className="image-form__preview-actions">
            {canCrop && (
              <button type="button" className="ps-button-secondary" onClick={openCropper}>
                Recadrer
              </button>
            )}
            {cropped && (
              <button type="button" className="image-form__link-btn" onClick={() => setCropped(null)}>
                Annuler le recadrage
              </button>
            )}
          </div>
        </div>
      )}

      <label className="image-form__field">
        <span>Lien Pinterest source (optionnel)</span>
        <div className="image-form__row">
          <input
            type="text"
            value={pinterest}
            onChange={(e) => setPinterest(e.target.value)}
            placeholder="https://…"
          />
          {pinterest.trim() && (
            <button type="button" className="ps-button-secondary" onClick={loadFromLink}>
              Charger l'image du lien
            </button>
          )}
        </div>
      </label>

      <label className="image-form__field">
        <span>Prénom associé</span>
        <select value={prenomId} onChange={(e) => setPrenomId(e.target.value)}>
          <option value="">Aucun</option>
          {sortedPrenoms.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nom}
            </option>
          ))}
          <option value={NEW}>+ Nouveau prénom…</option>
        </select>
      </label>

      {prenomId === NEW && (
        <label className="image-form__field">
          <span>Nouveau prénom</span>
          <input type="text" value={newNom} onChange={(e) => setNewNom(e.target.value)} autoFocus />
        </label>
      )}

      <div className="image-form__field">
        <span>Tags</span>
        <TagPicker tags={tags} value={tagIds} onChange={setTagIds} />
      </div>

      {(localError || error) && <p className="image-form__error">{localError || error}</p>}

      <div className="image-form__actions">
        <button type="button" className="ps-button-secondary" onClick={onCancel} disabled={saving}>
          Annuler
        </button>
        <button type="submit" className="ps-button-primary" disabled={saving}>
          {saving ? "Enregistrement…" : image ? "Enregistrer" : "Ajouter"}
        </button>
      </div>

      {showCropper && source && (
        <ImageCropper
          src={source.url}
          initial={cropped?.recadrage ?? image?.recadrage ?? null}
          onApply={handleApply}
          onCancel={() => setShowCropper(false)}
        />
      )}
    </form>
  );
}