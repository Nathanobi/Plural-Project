import { Wrench } from "lucide-react";
import "./PagePlaceholder.css";

// Contenu affiché par toutes les pages tant qu'elles n'ont pas été
// construites. Chaque page future n'aura qu'à remplacer l'appel à ce
// composant par son vrai contenu.
export default function PagePlaceholder({ eyebrow, title }) {
  return (
    <div className="ps-card ps-placeholder">
      <Wrench size={28} strokeWidth={1.5} />
      <p className="ps-eyebrow">{eyebrow}</p>
      <h1 className="ps-page-title">{title}</h1>
      <p className="ps-muted">À construire.</p>
    </div>
  );
}
