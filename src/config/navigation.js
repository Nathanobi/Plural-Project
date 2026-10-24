// Arbre de navigation — reflète spec.md §5. Chaque entrée "page" porte
// son chemin (path) utilisé à la fois par le Sidebar et par App.jsx
// pour déclarer les routes React Router.

import { Home, Settings, User, Users, StickyNote } from "lucide-react";

export const NAV = [
  {
    id: "accueil",
    label: "Accueil",
    icon: Home,
    type: "single",
    path: "/",
  },
  {
    id: "configuration",
    label: "Configuration",
    icon: Settings,
    type: "group",
    pages: [
      { id: "apparence", label: "Apparence", path: "/configuration/apparence" },
      { id: "connexions", label: "Connexions", path: "/configuration/connexions" },
      { id: "donnees", label: "Données", path: "/configuration/donnees" },
      { id: "systeme-debug", label: "Système / Debug", path: "/configuration/systeme-debug" },
    ],
  },
  {
    id: "profil",
    label: "Profil",
    icon: User,
    type: "group",
    pages: [
      { id: "prenoms", label: "Prénoms", path: "/profil/prenoms" },
      { id: "images", label: "Images", path: "/profil/images" },
      { id: "proxys", label: "Proxys", path: "/profil/proxys" },
      { id: "tags", label: "Tags", path: "/profil/tags" },
      { id: "profils", label: "Profils", path: "/profil/profils" },
    ],
  },
  {
    id: "systeme",
    label: "Système",
    icon: Users,
    type: "group",
    pages: [
      { id: "systeme-info", label: "Système", path: "/systeme/info" },
      { id: "fiches", label: "Fiches", path: "/systeme/fiches" },
      { id: "liens", label: "Liens", path: "/systeme/liens" },
      { id: "groupes", label: "Groupes", path: "/systeme/groupes" },
      { id: "innerworld", label: "Innerworld", path: "/systeme/innerworld" },
    ],
  },
  {
    id: "ressources",
    label: "Ressources",
    icon: StickyNote,
    type: "group",
    pages: [
      { id: "notes", label: "Notes", path: "/ressources/notes" },
      { id: "rappels", label: "Rappels", path: "/ressources/rappels" },
      { id: "contacts", label: "Contacts", path: "/ressources/contacts" },
    ],
  },
];
