import { useAuth } from "@/lib/auth";

const bellModules = import.meta.glob(
  "/src/features/notifications/NotificationBell.jsx",
  { eager: true }
);

const bellModule = Object.values(bellModules)[0];
const NotificationBell =
  bellModule?.NotificationBell || bellModule?.default || null;

export function OptionalNotificationBell() {
  const { user } = useAuth();

  // Never mount NotificationBell while forced password change is active
  if (!NotificationBell || !user || user.mustChangePassword) {
    return null;
  }

  return <NotificationBell />;
}
