import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";

type Theme = "light" | "dark" | "system";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: "light" | "dark";
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [theme, setThemeState] = useState<Theme>("system");
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    if (user) {
      loadThemePreference();
    } else {
      const savedTheme = localStorage.getItem("theme") as Theme;
      if (savedTheme) {
        setThemeState(savedTheme);
      }
    }
  }, [user]);

  useEffect(() => {
    const resolved = getResolvedTheme(theme);
    setResolvedTheme(resolved);
    applyTheme(resolved);
  }, [theme]);

  useEffect(() => {
    if (theme === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handleChange = () => {
        const resolved = getResolvedTheme("system");
        setResolvedTheme(resolved);
        applyTheme(resolved);
      };
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }
  }, [theme]);

  const loadThemePreference = async () => {
    if (!user) return;

    try {
      const { data } = await supabase
        .from("profiles")
        .select("theme_preference")
        .eq("id", user.id)
        .single();

      if (data?.theme_preference) {
        setThemeState(data.theme_preference as Theme);
      }
    } catch (error) {
      console.error("Failed to load theme preference:", error);
    }
  };

  const getResolvedTheme = (themeValue: Theme): "light" | "dark" => {
    if (themeValue === "system") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    return themeValue;
  };

  const applyTheme = (resolved: "light" | "dark") => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(resolved);
  };

  const setTheme = async (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem("theme", newTheme);

    if (user) {
      try {
        await supabase
          .from("profiles")
          .update({ theme_preference: newTheme })
          .eq("id", user.id);
      } catch (error) {
        console.error("Failed to save theme preference:", error);
      }
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
