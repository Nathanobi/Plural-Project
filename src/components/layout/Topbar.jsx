import { Menu, X } from "lucide-react";
import "./Topbar.css";

export default function Topbar({ sidebarOpen, onToggleSidebar }) {
  return (
    <div className="ps-topbar">
      <button type="button" className="ps-icon-btn" onClick={onToggleSidebar}>
        {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
      </button>
      <span className="ps-topbar-title">Plural Space</span>
    </div>
  );
}
