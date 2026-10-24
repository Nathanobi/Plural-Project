import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import "./AppShell.css";

// Coquille partagée par toutes les pages : sidebar + topbar mobile +
// zone de contenu (<Outlet /> affiche la page active selon la route).
export default function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  function closeSidebar() {
    setSidebarOpen(false);
  }

  return (
    <div className="ps-app-shell">
      {sidebarOpen && <div className="ps-overlay" onClick={closeSidebar} />}

      <Sidebar isOpen={sidebarOpen} onNavigate={closeSidebar} />

      <div className="ps-main">
        <Topbar sidebarOpen={sidebarOpen} onToggleSidebar={() => setSidebarOpen((v) => !v)} />
        <div className="ps-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
