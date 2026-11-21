// The notifications package provides src/features/notifications/NotificationBell.jsx.
// The layouts show it here when that file exists, so the layouts do not depend on that package.
const modules = import.meta.glob("../features/notifications/NotificationBell.jsx", { eager: true });
const NotificationBell = Object.values(modules)[0]?.default;

export default function NotificationSlot() {
  return NotificationBell ? <NotificationBell /> : null;
}
