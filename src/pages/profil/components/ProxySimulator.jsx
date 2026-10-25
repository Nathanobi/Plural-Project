import { useMemo, useState } from "react";
import { formatProxy, simulate } from "./proxyUtils";
import "./ProxySimulator.css";

// Simulateur : on tape un message, l'app dit quel prénom serait déclenché.
export default function ProxySimulator({ proxys, nameOf }) {
  const [message, setMessage] = useState("");
  const hasMessage = message.trim() !== "";

  const result = useMemo(
    () => (hasMessage ? simulate(proxys, message) : null),
    [proxys, message, hasMessage]
  );

  return (
    <div className="proxy-sim ps-card">
      <h2 className="ps-section-title">Simulateur</h2>
      <p className="ps-muted">
        Écris un message comme tu le taperais sur Discord : l'app indique quel prénom serait
        déclenché.
      </p>

      <textarea
        className="proxy-sim__input"
        rows={3}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="ex. Alex:Salut tout le monde !"
        aria-label="Message à tester"
        spellCheck={false}
      />

      {proxys.length === 0 && <p className="ps-muted">Aucun proxy à tester pour l'instant.</p>}

      {result && proxys.length > 0 && (
        <div className="proxy-sim__result" aria-live="polite">
          {!result.winner && (
            <p className="proxy-sim__line">
              <span className="ps-badge ps-badge-warning">Aucun proxy</span> Le message serait
              envoyé tel quel, sans proxy.
            </p>
          )}

          {result.winner && result.tied.length > 0 && (
            <p className="proxy-sim__line">
              <span className="ps-badge ps-badge-error">Ambigu</span> Égalité entre{" "}
              {result.tied.map((m) => nameOf(m.proxy.prenom_id)).join(", ")} : le résultat est
              imprévisible.
            </p>
          )}

          {result.winner && result.tied.length === 0 && (
            <>
              <p className="proxy-sim__line">
                <span className="ps-badge ps-badge-success">Déclenché</span> Serait envoyé par{" "}
                <strong>{nameOf(result.winner.proxy.prenom_id)}</strong> avec{" "}
                <code>{formatProxy(result.winner.proxy)}</code>.
              </p>
              <p className="proxy-sim__sent">
                Message affiché : « {result.winner.content} »
              </p>
            </>
          )}

          {result.matches.length > 1 && (
            <div className="proxy-sim__others">
              <span className="ps-muted">
                {result.tied.length > 0 ? "Proxys qui correspondent :" : "Autres proxys qui correspondent aussi :"}
              </span>
              <ul>
                {(result.tied.length > 0 ? result.matches : result.matches.slice(1)).map((m) => (
                  <li key={m.proxy.id}>
                    {nameOf(m.proxy.prenom_id)} <code>{formatProxy(m.proxy)}</code>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <p className="ps-muted">
        Simulation locale : insensible à la casse, le proxy le plus long l'emporte.
      </p>
    </div>
  );
}