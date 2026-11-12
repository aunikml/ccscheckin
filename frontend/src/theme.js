import { createTheme } from '@mui/material/styles';

export const BRAND_COLORS = {
  plum: '#50153f',
  plumDark: '#380d2c',
  plumLight: '#6f1c57',
  orange: '#e85d26',
  orangeHover: '#cf4d1a',
  blue: '#2d82c6',
  yellow: '#fab319',
  cream: '#faf6ee',
  sidebarBg: '#25091e',
  sidebarGradient: 'linear-gradient(180deg, #25091e 0%, #350c2a 50%, #1f0718 100%)',
};

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#50153f', // Official Summit Plum / Wine
      light: '#6f1c57',
      dark: '#380d2c',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#e85d26', // Tangerine Orange from banner
      light: '#f97316',
      dark: '#c2410c',
      contrastText: '#ffffff',
    },
    background: {
      default: '#f8fafc',
      paper: '#ffffff',
    },
    text: {
      primary: '#0f172a',
      secondary: '#64748b',
    },
    success: {
      main: '#10b981',
      light: '#d1fae5',
      dark: '#047857',
    },
    warning: {
      main: '#f59e0b',
      light: '#fef3c7',
      dark: '#b45309',
    },
    error: {
      main: '#ef4444',
      light: '#fee2e2',
      dark: '#b91c1c',
    },
    info: {
      main: '#06b6d4',
      light: '#cffafe',
      dark: '#0e7490',
    },
  },
  typography: {
    fontFamily: '"Plus Jakarta Sans", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    h4: {
      fontWeight: 700,
      letterSpacing: '-0.02em',
    },
    h5: {
      fontWeight: 600,
      letterSpacing: '-0.01em',
    },
    h6: {
      fontWeight: 600,
    },
    subtitle1: {
      fontWeight: 500,
    },
    button: {
      fontWeight: 600,
      textTransform: 'none',
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          padding: '8px 18px',
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 4px 14px rgba(80, 21, 63, 0.25)',
          },
        },
        containedPrimary: {
          background: 'linear-gradient(135deg, #50153f 0%, #6f1c57 100%)',
          '&:hover': {
            background: 'linear-gradient(135deg, #380d2c 0%, #50153f 100%)',
          },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: '#50153f',
            borderWidth: 2,
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)',
          border: '1px solid #e2e8f0',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.04), 0 2px 4px -2px rgba(0, 0, 0, 0.04)',
          border: '1px solid #e2e8f0',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          borderRadius: 8,
        },
      },
    },
  },
});

