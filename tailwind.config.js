/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        surface: {
          DEFAULT: "hsl(var(--surface))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        info: {
          DEFAULT: "hsl(var(--info))",
          foreground: "hsl(var(--info-foreground))",
        },
        "sidebar-bg": "hsl(var(--sidebar-bg))",
        "sidebar-hover": "hsl(var(--sidebar-hover))",
        "sidebar-active": "hsl(var(--sidebar-active))",
        "sidebar-foreground": "hsl(var(--sidebar-foreground))",
        "card-hover": "hsl(var(--card-hover))",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xs: "calc(var(--radius) - 6px)",
        "radius-sm": "var(--radius-sm)",
        "radius-md": "var(--radius-md)",
        "radius-lg": "var(--radius-lg)",
        "radius-xl": "var(--radius-xl)",
        "radius-2xl": "var(--radius-2xl)",
        "2xl": "1.25rem",
        "3xl": "1.5rem",
      },
      boxShadow: {
        "soft": "0 1px 2px 0 rgb(0 0 0 / 0.04)",
        "subtle": "0 2px 4px 0 rgb(0 0 0 / 0.05), 0 1px 2px -1px rgb(0 0 0 / 0.05)",
        "card": "0 4px 6px -1px rgb(0 0 0 / 0.06), 0 2px 4px -2px rgb(0 0 0 / 0.06)",
        "lifted": "0 10px 15px -3px rgb(0 0 0 / 0.07), 0 4px 6px -4px rgb(0 0 0 / 0.07)",
        "elevated": "0 20px 25px -5px rgb(0 0 0 / 0.08), 0 8px 10px -6px rgb(0 0 0 / 0.08)",
        "float": "0 25px 50px -12px rgb(0 0 0 / 0.15)",
        "inner-soft": "inset 0 2px 4px 0 rgb(0 0 0 / 0.04)",
        "inner-subtle": "inset 0 1px 2px 0 rgb(0 0 0 / 0.05)",
        "glow-sm": "0 0 0 3px hsl(var(--primary) / 0.15)",
        "glow": "0 0 0 4px hsl(var(--primary) / 0.2)",
        "glow-lg": "0 0 0 6px hsl(var(--primary) / 0.25)",
        "primary-sm": "0 1px 2px 0 hsl(var(--primary) / 0.2), 0 0 0 1px hsl(var(--primary) / 0.05)",
        "primary": "0 4px 6px -1px hsl(var(--primary) / 0.25), 0 2px 4px -2px hsl(var(--primary) / 0.2), 0 0 0 1px hsl(var(--primary) / 0.1)",
        "primary-md": "0 8px 16px -4px hsl(var(--primary) / 0.3), 0 4px 6px -2px hsl(var(--primary) / 0.2), 0 0 0 1px hsl(var(--primary) / 0.1)",
        "primary-lg": "0 20px 25px -5px hsl(var(--primary) / 0.3), 0 8px 10px -6px hsl(var(--primary) / 0.2), 0 0 0 1px hsl(var(--primary) / 0.1)",
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
