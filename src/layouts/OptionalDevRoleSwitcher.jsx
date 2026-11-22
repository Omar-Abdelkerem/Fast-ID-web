import { useEffect, useState } from "react";

const isMockMode =
  (import.meta.env.DEV && import.meta.env.VITE_USE_MOCKS === "true") ||
  import.meta.env.MODE === "demo";

// Lazy glob ensures mock switcher code is excluded from production bundles
const switcherLoaders = isMockMode
  ? import.meta.glob("/src/mocks/DevRoleSwitcher.jsx")
  : {};

export function OptionalDevRoleSwitcher() {
  const [Switcher, setSwitcher] = useState(null);

  useEffect(() => {
    if (!isMockMode) return undefined;
    const loader = Object.values(switcherLoaders)[0];
    if (!loader) return undefined;

    let active = true;
    loader()
      .then((mod) => {
        if (!active) return;
        const Component = mod.DevRoleSwitcher || mod.default || null;
        if (Component) {
          setSwitcher(() => Component);
        }
      })
      .catch(() => {
        // Ignore if mock switcher is not yet present
      });

    return () => {
      active = false;
    };
  }, []);

  if (!isMockMode || !Switcher) {
    return null;
  }

  return <Switcher />;
}
