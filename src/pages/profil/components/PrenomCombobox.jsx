import { useEffect, useMemo, useRef, useState } from "react";
import "./PrenomCombobox.css";

// Comparaison sans accents ni casse.
const norm = (s) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

// Champ de saisie avec liste de suggestions : chaque prénom indique s'il a déjà
// des images. `imageCounts` = { [prenomId]: nombre d'images }.
export default function PrenomCombobox({ prenoms, imageCounts, value, onChange, placeholder }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const listRef = useRef(null);
  const q = norm(value);

  const options = useMemo(() => {
    const list = prenoms.filter((p) => !q || norm(p.nom).includes(q));
    return list.sort((a, b) => {
      const sa = q && norm(a.nom).startsWith(q) ? 0 : 1;
      const sb = q && norm(b.nom).startsWith(q) ? 0 : 1;
      return sa - sb || a.nom.localeCompare(b.nom, "fr");
    });
  }, [prenoms, q]);

  useEffect(() => {
    if (active >= 0) listRef.current?.children[active]?.scrollIntoView({ block: "nearest" });
  }, [active]);

  function choose(prenom) {
    onChange(prenom.nom);
    setOpen(false);
    setActive(-1);
  }

  function handleKeyDown(e) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(options.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter" && open && active >= 0 && options[active]) {
      e.preventDefault(); // ne soumet pas le formulaire
      choose(options[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className="prenom-combobox">
      <input
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        aria-controls="prenom-combobox-list"
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={handleKeyDown}
      />

      {open && options.length > 0 && (
        <ul
          id="prenom-combobox-list"
          className="prenom-combobox__list"
          role="listbox"
          ref={listRef}
          onMouseDown={(e) => e.preventDefault()} // garde le focus sur le champ
        >
          {options.map((p, i) => {
            const n = imageCounts[p.id] || 0;
            return (
              <li
                key={p.id}
                role="option"
                aria-selected={i === active}
                className={`prenom-combobox__option${i === active ? " is-active" : ""}`}
                onClick={() => choose(p)}
              >
                <span className="prenom-combobox__name">{p.nom}</span>
                {n > 0 ? (
                  <span className="ps-badge ps-badge-success">
                    {n} image{n > 1 ? "s" : ""}
                  </span>
                ) : (
                  <span className="ps-badge ps-badge-warning">Sans image</span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}