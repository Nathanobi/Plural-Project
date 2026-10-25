import { AlertTriangle } from "lucide-react";
import { CONFLICT_HINT, CONFLICT_LABEL, formatProxy } from "./proxyUtils";
import "./ProxyAlerts.css";

// Alertes en tête de page : prénoms sans proxy + conflits détectés.
export default function ProxyAlerts({ withoutProxy, conflicts, nameOf, onCreateFor }) {
  if (withoutProxy.length === 0 && conflicts.length === 0) return null;

  const errors = conflicts.filter((c) => c.severity === "error").length;

  return (
    <div className="proxy-alerts">
      {conflicts.length > 0 && (
        <details
          className={`ps-card proxy-alerts__card proxy-alerts__card--${errors ? "error" : "warning"}`}
          open={errors > 0}
        >
          <summary className="proxy-alerts__summary">
            <AlertTriangle size={18} strokeWidth={1.75} />
            <span>
              {conflicts.length} conflit{conflicts.length > 1 ? "s" : ""} de proxys
            </span>
          </summary>
          <ul className="proxy-alerts__list">
            {conflicts.map((c) => (
              <li key={`${c.a.id}-${c.b.id}`} className="proxy-alerts__item">
                <span
                  className={`ps-badge ${c.severity === "error" ? "ps-badge-error" : "ps-badge-warning"}`}
                >
                  {CONFLICT_LABEL[c.type]}
                </span>
                <div>
                  <p className="ps-body">
                    <strong>{nameOf(c.a.prenom_id)}</strong> <code>{formatProxy(c.a)}</code> ↔{" "}
                    <strong>{nameOf(c.b.prenom_id)}</strong> <code>{formatProxy(c.b)}</code>
                  </p>
                  <p className="ps-muted">{CONFLICT_HINT[c.type]}</p>
                </div>
              </li>
            ))}
          </ul>
        </details>
      )}

      {withoutProxy.length > 0 && (
        <details className="ps-card proxy-alerts__card proxy-alerts__card--warning">
          <summary className="proxy-alerts__summary">
            <AlertTriangle size={18} strokeWidth={1.75} />
            <span>
              {withoutProxy.length} prénom{withoutProxy.length > 1 ? "s" : ""} sans proxy
            </span>
          </summary>
          <ul className="proxy-alerts__chips">
            {withoutProxy.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  className="proxy-alerts__chip"
                  onClick={() => onCreateFor(p.id)}
                  title="Créer un proxy pour ce prénom"
                >
                  {p.nom} <span aria-hidden="true">+</span>
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}