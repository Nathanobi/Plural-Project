import { useEffect, useRef } from "react";
import "./TagColorDot.css";

// La couleur est dynamique (choisie par l'utilisateur) : on la pose via
// setProperty plutôt qu'en style inline JSX, pour respecter la convention.
export default function TagColorDot({ color }) {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current) ref.current.style.setProperty("--tag-color", color || "#999999");
  }, [color]);

  return <span ref={ref} className="tag-color-dot" aria-hidden="true" />;
}
