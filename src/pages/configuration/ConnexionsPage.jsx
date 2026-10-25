import { useCallback, useEffect, useState } from "react";
import { ShieldAlert } from "lucide-react";
import { getCollection, insertRow, updateRow, addJournalEntry } from "../../lib/storage";
import { testPluralkit, testImgbb } from "../../lib/connectionTests";
import ConnexionCard from "./components/ConnexionCard";
import "./ConnexionsPage.css";

// storage.js ne lève jamais d'exception : il renvoie null/false et logue la cause.
const SAVE_ERROR = "L'opération a échoué. Ouvre la console (F12) pour voir la cause exacte.";

// Les clés sont stockées dans config_settings.connexions (jsonb).
const FIELDS = [
  {
    key: "pluralkit",
    title: "Token Pluralkit",
    description:
      "Permet de lire et d'envoyer les profils vers Pluralkit. À récupérer avec la commande pk;token sur Discord.",
    placeholder: "Colle ton token Pluralkit",
    valueKey: "pk_token",
    statusKey: "pk_status",
    checkedKey: "pk_checked_at",
    journalLabel: "Token Pluralkit",
    test: testPluralkit,
  },
  {
    key: "imgbb",
    title: "Clé API imgbb",
    description:
      "Sert à héberger les images recadrées et à obtenir un lien direct. À créer sur imgbb (page API de ton compte).",
    placeholder: "Colle ta clé API imgbb",
    valueKey: "imgbb_key",
    statusKey: "imgbb_status",
    checkedKey: "imgbb_checked_at",
    journalLabel: "Clé imgbb",
    test: testImgbb,
  },
];

export default function ConnexionsPage() {
  const [row, setRow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState({});
  const [live, setLive] = useState({}); // résultat du dernier test (non persisté si "unreachable")

  const load = useCallback(async () => {
    try {
      const rows = await getCollection("settings");
      setRow(rows[0] || null);
    } catch (e) {
      setError(e.message || "Impossible de charger les connexions.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const connexions = row?.connexions || {};

  // Écrit un patch dans `connexions` en conservant les autres clés.
  // Une valeur null supprime la clé.
  async function persist(patch) {
    const merged = { ...connexions, ...patch };
    for (const k of Object.keys(merged)) {
      if (merged[k] === null) delete merged[k];
    }
    const saved = row
      ? await updateRow("settings", row.id, {
          connexions: merged,
          updated_at: new Date().toISOString(),
        })
      : await insertRow("settings", { id: true, connexions: merged });
    if (!saved) throw new Error(SAVE_ERROR);
    setRow(saved);
  }

  function setFieldBusy(key, value) {
    setBusy((b) => ({ ...b, [key]: value }));
  }

  async function handleSave(field, value) {
    setFieldBusy(field.key, "save");
    setError("");
    try {
      await persist({ [field.valueKey]: value, [field.statusKey]: null, [field.checkedKey]: null });
      setLive((l) => ({ ...l, [field.key]: null }));
      // Jamais la valeur de la clé dans le journal.
      await addJournalEntry({
        action: "update",
        entityType: "connexion",
        entityId: null,
        details: `${field.journalLabel} enregistré`,
      });
    } catch (e) {
      setError(e.message || "Échec de l'enregistrement.");
    } finally {
      setFieldBusy(field.key, null);
    }
  }

  async function handleTest(field, value) {
    setFieldBusy(field.key, "test");
    setError("");
    try {
      const result = await field.test(value);
      setLive((l) => ({ ...l, [field.key]: result }));
      // On ne mémorise le résultat que si on a testé la valeur enregistrée.
      if (value === connexions[field.valueKey] && result.status !== "unreachable") {
        await persist({
          [field.statusKey]: result.status,
          [field.checkedKey]: new Date().toISOString(),
        });
      }
    } catch (e) {
      setError(e.message || "Échec du test.");
    } finally {
      setFieldBusy(field.key, null);
    }
  }

  async function handleClear(field) {
    setFieldBusy(field.key, "save");
    setError("");
    try {
      await persist({ [field.valueKey]: null, [field.statusKey]: null, [field.checkedKey]: null });
      setLive((l) => ({ ...l, [field.key]: null }));
      await addJournalEntry({
        action: "delete",
        entityType: "connexion",
        entityId: null,
        details: `${field.journalLabel} effacé`,
      });
    } catch (e) {
      setError(e.message || "Échec de la suppression.");
    } finally {
      setFieldBusy(field.key, null);
    }
  }

  return (
    <section className="connexions-page">
      <header className="connexions-page__header">
        <p className="ps-eyebrow">CONFIGURATION</p>
        <h1 className="ps-page-title">Connexions</h1>
      </header>

      <div className="ps-card connexions-page__warning" role="note">
        <ShieldAlert size={20} strokeWidth={1.75} />
        <div>
          <p className="ps-section-title">Clés stockées sans protection pour l'instant</p>
          <p className="ps-body">
            La base n'a pas encore de RLS ni d'authentification : quiconque possède l'URL et la clé
            anon de ton projet Supabase peut lire ces clés. Tant que ce n'est pas réglé, ne déploie
            pas l'app publiquement et ne partage pas ton <code>.env</code>. Si tu as un doute, régénère
            les clés (pk;token refresh sur Discord, nouvelle clé sur imgbb).
          </p>
        </div>
      </div>

      {error && <p className="connexions-page__error">{error}</p>}

      {loading ? (
        <p className="ps-muted">Chargement…</p>
      ) : (
        <div className="connexions-page__list">
          {FIELDS.map((field) => {
            const result = live[field.key];
            return (
              <ConnexionCard
                key={field.key}
                id={field.key}
                title={field.title}
                description={field.description}
                placeholder={field.placeholder}
                savedValue={connexions[field.valueKey] || ""}
                status={result?.status ?? connexions[field.statusKey]}
                detail={result?.detail}
                checkedAt={connexions[field.checkedKey]}
                busy={busy[field.key]}
                onSave={(value) => handleSave(field, value)}
                onTest={(value) => handleTest(field, value)}
                onClear={() => handleClear(field)}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}