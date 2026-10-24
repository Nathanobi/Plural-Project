import { Routes, Route } from "react-router-dom";
import AppShell from "./components/layout/AppShell";

import AccueilPage from "./pages/accueil/AccueilPage";

import ApparencePage from "./pages/configuration/ApparencePage";
import ConnexionsPage from "./pages/configuration/ConnexionsPage";
import DonneesPage from "./pages/configuration/DonneesPage";
import SystemeDebugPage from "./pages/configuration/SystemeDebugPage";

import PrenomsPage from "./pages/profil/PrenomsPage";
import ImagesPage from "./pages/profil/ImagesPage";
import ProxysPage from "./pages/profil/ProxysPage";
import TagsPage from "./pages/profil/TagsPage";
import ProfilsPage from "./pages/profil/ProfilsPage";

import SystemePage from "./pages/systeme/SystemePage";
import FichesPage from "./pages/systeme/FichesPage";
import LiensPage from "./pages/systeme/LiensPage";
import GroupesPage from "./pages/systeme/GroupesPage";
import InnerworldPage from "./pages/systeme/InnerworldPage";

import NotesPage from "./pages/ressources/NotesPage";
import RappelsPage from "./pages/ressources/RappelsPage";
import ContactsPage from "./pages/ressources/ContactsPage";

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<AccueilPage />} />

        <Route path="/configuration/apparence" element={<ApparencePage />} />
        <Route path="/configuration/connexions" element={<ConnexionsPage />} />
        <Route path="/configuration/donnees" element={<DonneesPage />} />
        <Route path="/configuration/systeme-debug" element={<SystemeDebugPage />} />

        <Route path="/profil/prenoms" element={<PrenomsPage />} />
        <Route path="/profil/images" element={<ImagesPage />} />
        <Route path="/profil/proxys" element={<ProxysPage />} />
        <Route path="/profil/tags" element={<TagsPage />} />
        <Route path="/profil/profils" element={<ProfilsPage />} />

        <Route path="/systeme/info" element={<SystemePage />} />
        <Route path="/systeme/fiches" element={<FichesPage />} />
        <Route path="/systeme/liens" element={<LiensPage />} />
        <Route path="/systeme/groupes" element={<GroupesPage />} />
        <Route path="/systeme/innerworld" element={<InnerworldPage />} />

        <Route path="/ressources/notes" element={<NotesPage />} />
        <Route path="/ressources/rappels" element={<RappelsPage />} />
        <Route path="/ressources/contacts" element={<ContactsPage />} />
      </Route>
    </Routes>
  );
}
