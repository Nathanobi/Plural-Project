import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Home } from "lucide-react";
import { NAV } from "../../config/navigation";
import NavGroup from "./NavGroup";
import "./Sidebar.css";

export default function Sidebar({ isOpen, onNavigate }) {
  const location = useLocation();

  const initialExpanded = {};
  for (const item of NAV) {
    if (item.type === "group") {
      initialExpanded[item.id] = item.pages.some((page) => location.pathname === page.path);
    }
  }
  const [expanded, setExpanded] = useState(initialExpanded);

  function toggleGroup(id) {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  const accueil = NAV.find((item) => item.type === "single");

  return (
    <nav className={`ps-sidebar${isOpen ? " is-open" : ""}`}>
      <div className="ps-sidebar-title">Plural Space</div>

      <NavLink
        to={accueil.path}
        end
        onClick={onNavigate}
        className={({ isActive }) => `ps-nav-item${isActive ? " is-active" : ""}`}
      >
        <Home size={18} strokeWidth={1.75} />
        <span>{accueil.label}</span>
      </NavLink>

      {NAV.filter((item) => item.type === "group").map((item) => (
        <NavGroup
          key={item.id}
          item={item}
          isOpen={!!expanded[item.id]}
          onToggle={() => toggleGroup(item.id)}
          onNavigate={onNavigate}
        />
      ))}
    </nav>
  );
}
