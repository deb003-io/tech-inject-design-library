export const themeTokens = {
  colors: {
    primary: "#1a73e8",
    primaryHover: "#1557b0",
    primaryActive: "#0f3f82",
    secondary: "#34a853",
    background: "#ffffff",
    surface: "#f8f9fa",
    surfaceBorder: "#e5e7eb",
    text: "#1a1a1a",
    muted: "#6b7280",
    error: "#d93025",
    success: "#188038",
    warning: "#e37400",
    onPrimary: "#ffffff"
  },
  font: {
    family: "'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif",
    size: { xs: "0.75rem", sm: "0.875rem", md: "1rem", lg: "1.125rem", xl: "1.25rem" },
    weight: { normal: 400, medium: 500, semibold: 600, bold: 700 }
  },
  radius: { sm: "4px", md: "8px", lg: "12px", full: "9999px" },
  spacing: { xs: "0.25rem", sm: "0.5rem", md: "1rem", lg: "1.5rem", xl: "2rem" },
  border: "1px solid #e5e7eb",
  shadow: {
    sm: "0 1px 2px rgba(16,24,40,.06)",
    md: "0 4px 12px rgba(16,24,40,.08)"
  }
} as const;

export type ThemeTokens = typeof themeTokens;
