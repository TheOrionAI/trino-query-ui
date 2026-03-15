import { createTheme, alpha } from '@mui/material/styles'
import darkScrollbar from '@mui/material/darkScrollbar'

// DuckDB-inspired modern dark theme
export const lightTheme = createTheme({
    palette: {
        mode: 'light',
        primary: {
            main: '#0b1367',
        },
        secondary: {
            main: '#f50057',
        },
    },
    components: {
        MuiLink: {
            styleOverrides: {
                root: {
                    color: '#f50057',
                    textDecoration: 'none',
                },
            },
        },
    },
})

// Modern dark theme inspired by DuckDB Wasm
export const darkTheme = createTheme({
    palette: {
        mode: 'dark',
        primary: {
            main: '#6e56cf',  // Purple accent like DuckDB
            light: '#9178f0',
            dark: '#4f3a9e',
        },
        secondary: {
            main: '#3cddac',  // Teal/green accent
            light: '#6ee7c4',
            dark: '#2ba884',
        },
        error: {
            main: '#f06c6c',
        },
        warning: {
            main: '#ffb347',
        },
        success: {
            main: '#3cddac',
        },
        info: {
            main: '#78a9ff',
        },
        background: {
            default: '#0d1117',  // GitHub dark
            paper: '#161b22',    // Card backgrounds
        },
        text: {
            primary: '#e6edf3',
            secondary: '#8b949e',
        },
        divider: '#30363d',
        action: {
            active: '#e6edf3',
            hover: alpha('#6e56cf', 0.08),
            selected: alpha('#6e56cf', 0.16),
            disabled: alpha('#e6edf3', 0.26),
            disabledBackground: alpha('#e6edf3', 0.12),
        },
    },
    typography: {
        fontFamily: '"JetBrains Mono", "Fira Code", "Roboto Mono", monospace',
        h1: {
            fontFamily: '"Inter", "Segoe UI", sans-serif',
            fontWeight: 600,
        },
        h2: {
            fontFamily: '"Inter", "Segoe UI", sans-serif',
            fontWeight: 600,
        },
        h3: {
            fontFamily: '"Inter", "Segoe UI", sans-serif',
            fontWeight: 600,
        },
        h4: {
            fontFamily: '"Inter", "Segoe UI", sans-serif',
            fontWeight: 600,
        },
        h5: {
            fontFamily: '"Inter", "Segoe UI", sans-serif',
            fontWeight: 600,
        },
        h6: {
            fontFamily: '"Inter", "Segoe UI", sans-serif',
            fontWeight: 600,
        },
        body1: {
            fontFamily: '"Inter", "Segoe UI", sans-serif',
        },
        body2: {
            fontFamily: '"Inter", "Segoe UI", sans-serif',
        },
    },
    shape: {
        borderRadius: 8,
    },
    components: {
        MuiCssBaseline: {
            styleOverrides: {
                body: {
                    ...darkScrollbar(),
                    scrollbarColor: '#30363d #0d1117',
                    '&::-webkit-scrollbar, & *::-webkit-scrollbar': {
                        width: 8,
                        height: 8,
                    },
                    '&::-webkit-scrollbar-thumb, & *::-webkit-scrollbar-thumb': {
                        borderRadius: 8,
                        backgroundColor: '#30363d',
                    },
                    '&::-webkit-scrollbar-track, & *::-webkit-scrollbar-track': {
                        backgroundColor: '#0d1117',
                    },
                },
            },
        },
        MuiButton: {
            styleOverrides: {
                root: {
                    textTransform: 'none',
                    fontWeight: 600,
                    borderRadius: 6,
                },
                contained: {
                    boxShadow: 'none',
                    '&:hover': {
                        boxShadow: '0 4px 12px rgba(110, 86, 207, 0.4)',
                    },
                },
            },
        },
        MuiPaper: {
            styleOverrides: {
                root: {
                    backgroundImage: 'none',
                    border: '1px solid #30363d',
                },
            },
        },
        MuiCard: {
            styleOverrides: {
                root: {
                    backgroundImage: 'none',
                    border: '1px solid #30363d',
                },
            },
        },
        MuiDrawer: {
            styleOverrides: {
                paper: {
                    borderRight: '1px solid #30363d',
                    backgroundImage: 'none',
                },
            },
        },
        MuiAppBar: {
            styleOverrides: {
                root: {
                    backgroundImage: 'none',
                    borderBottom: '1px solid #30363d',
                },
            },
        },
        MuiTab: {
            styleOverrides: {
                root: {
                    textTransform: 'none',
                    fontWeight: 500,
                    minHeight: 40,
                },
            },
        },
        MuiTextField: {
            styleOverrides: {
                root: {
                    '& .MuiOutlinedInput-root': {
                        '& fieldset': {
                            borderColor: '#30363d',
                        },
                        '&:hover fieldset': {
                            borderColor: '#6e56cf',
                        },
                        '&.Mui-focused fieldset': {
                            borderColor: '#6e56cf',
                        },
                    },
                },
            },
        },
        MuiLink: {
            styleOverrides: {
                root: {
                    color: '#78a9ff',
                    textDecoration: 'none',
                    '&:hover': {
                        color: '#9178f0',
                    },
                },
            },
        },
        MuiTooltip: {
            styleOverrides: {
                tooltip: {
                    backgroundColor: '#161b22',
                    border: '1px solid #30363d',
                    fontSize: '0.75rem',
                },
            },
        },
        MuiChip: {
            styleOverrides: {
                root: {
                    borderRadius: 6,
                },
            },
        },
        MuiIconButton: {
            styleOverrides: {
                root: {
                    '&:hover': {
                        backgroundColor: alpha('#6e56cf', 0.1),
                    },
                },
            },
        },
        MuiListItemButton: {
            styleOverrides: {
                root: {
                    borderRadius: 6,
                    '&:hover': {
                        backgroundColor: alpha('#6e56cf', 0.08),
                    },
                    '&.Mui-selected': {
                        backgroundColor: alpha('#6e56cf', 0.16),
                        '&:hover': {
                            backgroundColor: alpha('#6e56cf', 0.24),
                        },
                    },
                },
            },
        },
    },
})

// Theme tokens for custom components
export const themeTokens = {
    // Colors
    colors: {
        // Primary palette
        primary: '#6e56cf',
        primaryLight: '#9178f0',
        primaryDark: '#4f3a9e',
        // Secondary/accent
        accent: '#3cddac',
        accentLight: '#6ee7c4',
        accentDark: '#2ba884',
        // Backgrounds
        bgPrimary: '#0d1117',
        bgSecondary: '#161b22',
        bgTertiary: '#21262d',
        // Borders
        border: '#30363d',
        borderLight: '#3d444d',
        // Text
        textPrimary: '#e6edf3',
        textSecondary: '#8b949e',
        textMuted: '#6e7681',
        // Status
        success: '#3cddac',
        warning: '#ffb347',
        error: '#f06c6c',
        info: '#78a9ff',
    },
    // Typography
    fonts: {
        mono: '"JetBrains Mono", "Fira Code", "Roboto Mono", monospace',
        sans: '"Inter", "Segoe UI", -apple-system, sans-serif',
    },
    // Spacing
    spacing: {
        xs: 4,
        sm: 8,
        md: 16,
        lg: 24,
        xl: 32,
    },
    // Animation
    animation: {
        fast: '150ms ease',
        normal: '250ms ease',
        slow: '350ms ease',
    },
}
