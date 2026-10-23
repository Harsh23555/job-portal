"use strict";
import { createContext, useContext, useState, useEffect } from "react";
import { Sun, Moon } from "lucide-react";

export const DARK_THEME = {
  name: "dark",
  isDark: true,
  bg: "#09090f",
  surface: "rgba(255,255,255,0.04)",
  surfaceHov: "rgba(255,255,255,0.07)",
  surfaceGlass: "rgba(255,255,255,0.04)",
  border: "rgba(255,255,255,0.08)",
  borderHov: "rgba(124,106,247,0.4)",
  purple: "#7c6af7",
  purpleL: "#a090ff",
  purpleDim: "rgba(124,106,247,0.15)",
  green: "#4ade80",
  greenDim: "rgba(74,222,128,0.12)",
  pink: "#f472b6",
  orange: "#fb923c",
  yellow: "#facc15",
  red: "#ef4444",
  redDim: "rgba(239,68,68,0.12)",
  text: "#f0f0fa",
  textMid: "#9090b8",
  textDim: "#5a5a80",
  font: "'DM Sans', sans-serif",
  serif: "'DM Serif Display', serif",
  cardShadow: "none",
  cardGlass: "rgba(255,255,255,0.04)",
  cardBorder: "rgba(255,255,255,0.08)",
  inputBg: "rgba(255,255,255,0.04)",
  modalBg: "rgba(12, 10, 24, 0.94)",
  modalBackdrop: "rgba(9, 9, 15, 0.75)",
  tooltipBg: "#121020",
  tooltipText: "#f0f0fa",
  tooltipBorder: "rgba(255,255,255,0.1)"
};

export const LIGHT_THEME = {
  name: "light",
  isDark: false,
  bg: "#f8fafc",
  surface: "#ffffff",
  surfaceHov: "#f1f5f9",
  surfaceGlass: "rgba(255, 255, 255, 0.85)",
  border: "#e2e8f0",
  borderHov: "rgba(109,90,230,0.45)",
  purple: "#6d5ae6",
  purpleL: "#5b48e0",
  purpleDim: "rgba(109,90,230,0.08)",
  green: "#16a34a",
  greenDim: "rgba(22,163,74,0.1)",
  pink: "#db2777",
  orange: "#ea580c",
  yellow: "#d97706",
  red: "#dc2626",
  redDim: "rgba(220,38,38,0.1)",
  text: "#0f172a",
  textMid: "#475569",
  textDim: "#64748b",
  font: "'DM Sans', sans-serif",
  serif: "'DM Serif Display', serif",
  cardShadow: "0 4px 20px -2px rgba(0, 0, 0, 0.06), 0 2px 6px -1px rgba(0, 0, 0, 0.03)",
  cardGlass: "rgba(255, 255, 255, 0.85)",
  cardBorder: "#e2e8f0",
  inputBg: "#ffffff",
  modalBg: "#ffffff",
  modalBackdrop: "rgba(15, 23, 42, 0.5)",
  tooltipBg: "#ffffff",
  tooltipText: "#0f172a",
  tooltipBorder: "#e2e8f0"
};

let currentTokens = DARK_THEME;

const applyThemeToDOM = (newTheme) => {
  currentTokens = newTheme === "light" ? LIGHT_THEME : DARK_THEME;
  if (typeof document !== "undefined") {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(newTheme);
    root.setAttribute("data-theme", newTheme);
    root.style.colorScheme = newTheme;
  }
};

export const T = new Proxy({}, {
  get(target, prop) {
    return currentTokens[prop];
  }
});

const THEME_STORAGE_KEY = "jobsphere_theme";

const ThemeContext = createContext({
  theme: "dark",
  isDark: true,
  toggleTheme: () => {},
  T: DARK_THEME
});

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    let initial = "dark";
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (saved === "light" || saved === "dark") initial = saved;
    }
    applyThemeToDOM(initial);
    return initial;
  });

  const isDark = theme === "dark";
  const activeT = isDark ? DARK_THEME : LIGHT_THEME;

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    applyThemeToDOM(next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch (e) {
      console.error("Failed to save theme in localStorage", e);
    }
    setTheme(next);
  };

  useEffect(() => {
    applyThemeToDOM(theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme, T: activeT }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeToggle({ className = "", style = {}, size = "normal" }) {
  const { theme, isDark, toggleTheme, T } = useTheme();

  const isSmall = size === "sm";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${isDark ? "Light" : "Dark"} theme`}
      title={`Switch to ${isDark ? "Light" : "Dark"} theme`}
      className={`theme-toggle-btn ${className}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        padding: isSmall ? "5px 9px" : "6px 12px",
        borderRadius: 20,
        background: isDark ? "rgba(255,255,255,0.06)" : "#f1f5f9",
        border: `1px solid ${isDark ? "rgba(255,255,255,0.12)" : "#cbd5e1"}`,
        color: isDark ? "#facc15" : "#6d5ae6",
        fontSize: isSmall ? "0.72rem" : "0.78rem",
        fontWeight: 600,
        cursor: "pointer",
        transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
        fontFamily: T.font,
        boxShadow: isDark
          ? "none"
          : "0 1px 3px rgba(0,0,0,0.06)",
        flexShrink: 0,
        ...style
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.12)" : "#e2e8f0";
        e.currentTarget.style.transform = "scale(1.04)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.06)" : "#f1f5f9";
        e.currentTarget.style.transform = "scale(1)";
      }}
    >
      {isDark ? (
        <>
          <Sun size={isSmall ? 13 : 15} />
          <span style={{ color: T.text, fontSize: isSmall ? "0.72rem" : "0.75rem" }}>Light</span>
        </>
      ) : (
        <>
          <Moon size={isSmall ? 13 : 15} />
          <span style={{ color: T.text, fontSize: isSmall ? "0.72rem" : "0.75rem" }}>Dark</span>
        </>
      )}
    </button>
  );
}
