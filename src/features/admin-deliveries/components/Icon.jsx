export default function Icon({ name, className = "" }) {
  // Material Icons ligature font (loaded in index.html); decorative, the text next to it carries the meaning
  return (
    <span className={`material-icons align-middle leading-none ${className}`} style={{ fontSize: "1.1em" }} aria-hidden="true">
      {name}
    </span>
  );
}
