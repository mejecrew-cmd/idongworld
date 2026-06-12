import { createTheme } from '@mui/material/styles'

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#3e9b8f', dark: '#26736d', light: '#d8f4ef' },
    secondary: { main: '#f27f75', dark: '#c95f57', light: '#ffe3df' },
    success: { main: '#6daa62' },
    warning: { main: '#e0a742' },
    background: {
      default: '#f6fbf7',
      paper: '#fffefa',
    },
    text: {
      primary: '#273333',
      secondary: '#6d7a75',
    },
  },
  typography: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif',
    h1: { fontSize: 28, fontWeight: 800, lineHeight: 1.2 },
    h2: { fontSize: 20, fontWeight: 800, lineHeight: 1.25 },
    h3: { fontSize: 17, fontWeight: 800, lineHeight: 1.3 },
    body1: { fontSize: 14, lineHeight: 1.7 },
    body2: { fontSize: 13, lineHeight: 1.55 },
    button: { fontWeight: 800, textTransform: 'none' },
  },
  shape: { borderRadius: 8 },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#f6fbf7',
          color: '#273333',
        },
        '*': {
          boxSizing: 'border-box',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          minHeight: 38,
          borderRadius: 8,
          boxShadow: 'none',
        },
        contained: {
          backgroundImage: 'linear-gradient(135deg, #3e9b8f 0%, #67bda4 62%, #f3c35c 100%)',
          color: '#fffefa',
          border: '1px solid rgba(255,255,255,0.28)',
          boxShadow: '0 8px 18px rgba(62,155,143,0.2)',
          '&:hover': {
            boxShadow: '0 10px 22px rgba(62,155,143,0.28)',
          },
        },
        outlined: {
          backgroundColor: 'rgba(255,254,250,0.78)',
          borderColor: 'rgba(62,155,143,0.3)',
          '&:hover': {
            backgroundColor: '#fffefa',
            borderColor: '#3e9b8f',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 800,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
  },
})
