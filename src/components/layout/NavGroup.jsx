import { NavLink, useLocation } from "react-router-dom";
import { ChevronDown, ChevronRight } from "lucide-react";
import "./NavGroup.css";

export default function NavGroup({ item, isOpen, onToggle, onNavigate }) {
  const Icon = item.icon;
  const location = useLocation();
  const groupIsActive = item.pages.some((page) => location.pathname === page.path);

  return (
    <div className="ps-nav-group">
      <button
        type="button"
        className={`ps-nav-item ps-nav-group-header${groupIsActive ? " is-active" : ""}`}
        onClick={onToggle}
        aria-expanded={isOpen}
      >
        <Icon size={18} strokeWidth={1.75} />
        <span>{item.label}</span>
        {isOpen ? (
          <ChevronDown size={16} strokeWidth={1.75} className="ps-chevron" />
        ) : (
          <ChevronRight size={16} strokeWidth={1.75} className="ps-chevron" />
        )}
      </button>
      {isOpen && (
        <div className="ps-nav-subpages">
          {item.pages.map((page) => (
            <NavLink
              key={page.id}
              to={page.path}
              onClick={onNavigate}
              className={({ isActive }) =>
                `ps-nav-item ps-nav-subitem${isActive ? " is-active" : ""}`
              }
            >
              {page.label}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}
