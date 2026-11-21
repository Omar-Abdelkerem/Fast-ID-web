// Loads the Material Icons font once, so the icons work without editing index.html.
const MATERIAL_ICONS_URL = "https://fonts.googleapis.com/icon?family=Material+Icons";
if (typeof document !== "undefined" && !document.querySelector(`link[href="${MATERIAL_ICONS_URL}"]`)) {
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = MATERIAL_ICONS_URL;
  document.head.appendChild(link);
}

export default function Icon({ name, className = "" }) {
  // Material Icons ligature font (loaded above); decorative, the text next to it carries the meaning
  return (
    <span className={`material-icons align-middle leading-none ${className}`} style={{ fontSize: "1.1em" }} aria-hidden="true">
      {name}
    </span>
  );
}
