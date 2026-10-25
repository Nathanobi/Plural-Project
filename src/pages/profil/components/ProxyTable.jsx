import { useMemo, useState } from "react";
import { formatProxy } from "./proxyUtils";
import "./ProxyTable.css";

const collator = new Intl.Collator("fr", { sensitivity: "base", numeric: true });

// Tableau prénom ↔ proxy(s) : une ligne par prénom.
export default function ProxyTable({ prenoms, proxys, conflictIdx, onAdd }) {
  const [onlyMissing, setOnlyMissing] = useState(false);

  const rows = useMemo(() => {
    const byPrenom = {};
    for (const p of proxys) (byPrenom[p.prenom_id] ||= []).push(p);
    return [...prenoms]
      .sort((a, b) => collator.compare(a.nom, b.nom))
      .map((prenom) => ({
        prenom,
        proxys: (byPrenom[prenom.id] || []).sort((a, b) =>
          collator.compare(formatProxy(a), formatProxy(b))
        ),
      }))
      .filter((r) => !onlyMissing || r.proxys.length === 0);
  }, [prenoms, proxys, onlyMissing]);

  return (
    <div className="proxy-table">
      <div className="proxy-table__bar">
        <button
          type="button"
          className={`proxy-table__chip${onlyMissing ? " is-active" : ""}`}
          aria-pressed={onlyMissing}
          onClick={() => setOnlyMissing((v) => !v)}
        >
          sans proxy
        </button>
      </div>

      {rows.length === 0 ? (
        <p className="proxy-table__empty">
          {prenoms.length === 0 ? "Aucun prénom pour l'instant." : "Aucun prénom à afficher."}
        </p>
      ) : (
        <table className="proxy-table__table">
          <thead>
            <tr>
              <th scope="col">Prénom</th>
              <th scope="col">Proxy(s)</th>
              <th scope="col" aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {rows.map(({ prenom, proxys: list }) => (
              <tr key={prenom.id}>
                <td className="proxy-table__name">{prenom.nom}</td>
                <td>
                  {list.length === 0 ? (
                    <span className="ps-badge ps-badge-warning">Sans proxy</span>
                  ) : (
                    <div className="proxy-table__codes">
                      {list.map((p) => {
                        const sev = conflictIdx[p.id]?.severity;
                        return (
                          <code
                            key={p.id}
                            className={`proxy-table__code${sev ? ` proxy-table__code--${sev}` : ""}`}
                          >
                            {formatProxy(p)}
                          </code>
                        );
                      })}
                    </div>
                  )}
                </td>
                <td className="proxy-table__cell-actions">
                  <button type="button" className="proxy-table__add" onClick={() => onAdd(prenom.id)}>
                    + Proxy
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}