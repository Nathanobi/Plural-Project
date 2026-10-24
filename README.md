# Plural Space

Application de gestion de profils Pluralkit — voir `spec.md`, `design.md`
et `data-model.md` dans les sources du Projet Claude pour le détail
fonctionnel.

## Démarrage

1. `npm install`
2. Copier `.env.example` en `.env` et renseigner `VITE_SUPABASE_URL` et
   `VITE_SUPABASE_ANON_KEY` (trouvables dans Supabase : Project Settings).
3. Dans Supabase, exécuter `supabase/schema.sql` (SQL Editor > New query)
   pour créer les tables.
4. `npm run dev` puis ouvrir l'adresse affichée (`localhost:5173`).

## Structure

- `src/pages/` — une page par fichier, regroupées par section (reflète
  `spec.md` §5). Toutes vides pour l'instant ("à construire").
- `src/components/layout/` — coquille de navigation (Sidebar, Topbar,
  AppShell) partagée par toutes les pages.
- `src/components/common/` — composants réutilisables (ex.
  `PagePlaceholder`).
- `src/lib/` — accès aux données : `supabaseClient.js` (connexion),
  `storage.js` (`getCollection`/`insertRow`/`updateRow`/`deleteRow`/
  `addJournalEntry`), `backup.js` (export/import JSON), `tables.js`
  (table des correspondances collection → table Postgres).
- `src/config/navigation.js` — arbre de navigation.
- `src/styles/` — `theme.css` (variables de couleurs, clair/sombre) et
  `global.css` (reset + classes utilitaires communes).
- `supabase/schema.sql` — schéma des tables à exécuter dans Supabase.

## Convention

Un composant = un fichier `.jsx` + son `.css` du même nom à côté. Pas de
style inline, pas de CSS en template literal.
