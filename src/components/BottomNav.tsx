import { useLocation, useNavigate } from "react-router-dom";

interface NavItem {
  path: string;
  icon: string;
  label: string;
}

const navItems: NavItem[] = [
  { path: "/home", icon: "dashboard", label: "Dashboard" },
  { path: "/paddle-pals", icon: "group", label: "Paddle Pals" },
  { path: "/game-history", icon: "history", label: "History" },
  { path: "/edit-profile", icon: "person", label: "Profile" },
];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + "/");
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-20 bg-white/80 dark:bg-background-dark/80 backdrop-blur-md border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-around z-50">
      {navItems.map((item) => {
        const active = isActive(item.path);
        return (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={`flex flex-col items-center justify-center gap-1 transition-colors ${
              active ? "text-primary" : "text-zinc-500 dark:text-zinc-400"
            }`}
          >
            <span className="material-symbols-outlined">{item.icon}</span>
            <span className={`text-xs ${active ? "font-bold" : "font-medium"}`}>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
