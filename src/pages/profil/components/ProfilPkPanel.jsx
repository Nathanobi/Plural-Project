import CopyButton from "./CopyButton";
import { pkValues, pkCommands } from "./profilUtils";
import "./ProfilPkPanel.css";

// Mode "infos à copier-coller" : aucun appel à l'API Pluralkit.
export default function ProfilPkPanel({ entry }) {
  const values = pkValues(entry);
  const commands = pkCommands(entry);

  return (
    <div className="profil-pk">
      <section className="profil-pk__section">
        <h3 className="ps-section-title">Valeurs à copier</h3>
        <ul className="profil-pk__list">
          {values.map((row) => (
            <li key={row.label} className="profil-pk__row">
              <span className="profil-pk__label ps-muted">{row.label}</span>
              <span className="profil-pk__value">{row.value}</span>
              <CopyButton text={row.value} />
            </li>
          ))}
        </ul>
      </section>

      <section className="profil-pk__section">
        <div className="profil-pk__head">
          <h3 className="ps-section-title">Commandes Pluralkit</h3>
          <CopyButton text={commands.join("\n")} label="Tout copier" />
        </div>
        <p className="ps-muted">
          Envoie chaque commande dans un message séparé au bot. Si l'ID PK du profil est renseigné,
          la création du membre est sautée.
        </p>
        <ul className="profil-pk__list">
          {commands.map((cmd) => (
            <li key={cmd} className="profil-pk__row">
              <code className="profil-pk__cmd">{cmd}</code>
              <CopyButton text={cmd} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}