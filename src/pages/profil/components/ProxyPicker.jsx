import { proxyExample } from "./profilUtils";
import "./ProxyPicker.css";

// Sélecteur multiple des proxys d'un prénom (pastilles avec aperçu).
// `proxys` = uniquement ceux du prénom choisi.
export default function ProxyPicker({ proxys, hasPrenom, value, onChange }) {
  if (!hasPrenom) {
    return <p className="proxy-picker__hint">Choisis d'abord un prénom.</p>;
  }
  if (proxys.length === 0) {
    return (
      <p className="proxy-picker__hint">
        Ce prénom n'a pas encore de proxy (crée-en dans Profil &gt; Proxys).
      </p>
    );
  }

  function toggle(id) {
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  }

  return (
    <div className="proxy-picker" role="group" aria-label="Proxys">
      {proxys.map((proxy) => {
        const on = value.includes(proxy.id);
        return (
          <button
            key={proxy.id}
            type="button"
            className={`proxy-picker__chip${on ? " is-on" : ""}`}
            aria-pressed={on}
            onClick={() => toggle(proxy.id)}
          >
            {proxyExample(proxy)}
          </button>
        );
      })}
    </div>
  );
}