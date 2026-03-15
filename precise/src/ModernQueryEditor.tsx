import React, { useState, useCallback, useEffect } from 'react'
import { ThemeProvider, CssBaseline } from '@mui/material'
import { Box, styled, alpha, IconButton, Tooltip, Typography, Paper, CircularProgress } from '@mui/material'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import FormatAlignLeftIcon from '@mui/icons-material/FormatAlignLeft'
import BarChartIcon from '@mui/icons-material/BarChart'
import AccountTreeIcon from '@mui/icons-material/AccountTree'
import HistoryIcon from '@mui/icons-material/History'
import SettingsIcon from '@mui/icons-material/Settings'
import DarkModeIcon from '@mui/icons-material/DarkMode'
import LightModeIcon from '@mui/icons-material/LightMode'
import QueryEditorPane from './QueryEditorPane'
import ResultSet from './ResultSet'
import QueryCharts from './QueryCharts'
import { darkTheme, lightTheme, themeTokens } from './theme'
import Queries from './schema/Queries'
import QueryInfo from './schema/QueryInfo'

// Styled components
const EditorContainer = styled('div')({
    height: '100vh',
    width: '100vw',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    fontFamily: themeTokens.fonts.sans,
})

const TopBar = styled(Box)(({ theme }) => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 16px',
    backgroundColor: theme.palette.background.paper,
    borderBottom: `1px solid ${theme.palette.divider}`,
    minHeight: 48,
}))

const Logo = styled(Box)({
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    '& .logo-icon': {
        width: 28,
        height: 28,
        borderRadius: 6,
        background: `linear-gradient(135deg, ${themeTokens.colors.primary} 0%, ${themeTokens.colors.accent} 100%)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        fontWeight: 700,
        fontSize: 14,
    },
    '& .logo-text': {
        fontFamily: themeTokens.fonts.sans,
        fontWeight: 600,
        fontSize: 16,
        color: themeTokens.colors.textPrimary,
    },
})

const ActionButtons = styled(Box)({
    display: 'flex',
    alignItems: 'center',
    gap: 8,
})

const RunButton = styled(IconButton)({
    backgroundColor: themeTokens.colors.primary,
    color: '#fff',
    padding: '8px 16px',
    borderRadius: 6,
    '&:hover': {
        backgroundColor: themeTokens.colors.primaryLight,
        boxShadow: `0 4px 12px ${alpha(themeTokens.colors.primary, 0.4)}`,
    },
    '& .MuiSvgIcon-root': {
        fontSize: 20,
    },
})

const IconBtn = styled(IconButton)({
    color: themeTokens.colors.textSecondary,
    '&:hover': {
        color: themeTokens.colors.textPrimary,
        backgroundColor: alpha(themeTokens.colors.primary, 0.1),
    },
})

const MainContent = styled(Box)({
    flex: 1,
    display: 'flex',
    overflow: 'hidden',
    backgroundColor: themeTokens.colors.bgPrimary,
})

const EditorSection = styled(Box)({
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
})

const ResultsSection = styled(Box)(({ theme }) => ({
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    backgroundColor: theme.palette.background.paper,
    borderTop: `1px solid ${theme.palette.divider}`,
}))

const EditorToolbar = styled(Box)({
    display: 'flex',
    alignItems: 'center',
    padding: '8px 12px',
    gap: 8,
    backgroundColor: themeTokens.colors.bgSecondary,
    borderBottom: `1px solid ${themeTokens.colors.border}`,
})

const TabButton = styled(Box)<{ active?: boolean }>(({ active }) => ({
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 12px',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 500,
    color: active ? themeTokens.colors.textPrimary : themeTokens.colors.textSecondary,
    backgroundColor: active ? alpha(themeTokens.colors.primary, 0.15) : 'transparent',
    transition: 'all 150ms ease',
    '&:hover': {
        backgroundColor: active ? alpha(themeTokens.colors.primary, 0.2) : alpha(themeTokens.colors.primary, 0.08),
        color: themeTokens.colors.textPrimary,
    },
}))

const StatusBar = styled(Box)({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '4px 16px',
    backgroundColor: themeTokens.colors.bgSecondary,
    borderTop: `1px solid ${themeTokens.colors.border}`,
    fontSize: 12,
    color: themeTokens.colors.textSecondary,
})

const Resizer = styled(Box)({
    height: 4,
    backgroundColor: themeTokens.colors.bgTertiary,
    cursor: 'row-resize',
    transition: 'background-color 150ms ease',
    '&:hover': {
        backgroundColor: themeTokens.colors.primary,
    },
})

const EmptyState = styled(Box)({
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: themeTokens.colors.textMuted,
    gap: 12,
})

const SplitPaneContainer = styled(Box)({
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
})

interface ModernQueryEditorProps {
    height: number
    theme?: 'dark' | 'light'
    enableCatalogSearchColumns?: boolean
}

export const ModernQueryEditor = ({ 
    height, 
    theme = 'dark',
    enableCatalogSearchColumns 
}: ModernQueryEditorProps) => {
    const [activeTab, setActiveTab] = useState<'results' | 'charts' | 'explain'>('results')
    const [isRunning, setIsRunning] = useState(false)
    const [editorHeight, setEditorHeight] = useState(height * 0.5)
    const [resultsHeight, setResultsHeight] = useState(height * 0.5)
    const [isDragging, setIsDragging] = useState(false)
    const [queries] = useState<Queries>(() => new Queries())
    const [queryId, setQueryId] = useState<string | undefined>()
    const [results, setResults] = useState<any[]>([])
    const [columns, setColumns] = useState<any[]>([])
    const [response, setResponse] = useState<any>(null)
    const [errorMessage, setErrorMessage] = useState('')

    const currentTheme = theme === 'dark' ? darkTheme : lightTheme

    // Handle resize drag
    const handleMouseDown = useCallback(() => {
        setIsDragging(true)
    }, [])

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging) return
            // This is simplified - in production you'd use proper event handling
        }
        
        const handleMouseUp = () => {
            setIsDragging(false)
        }

        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove)
            document.addEventListener('mouseup', handleMouseUp)
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove)
            document.removeEventListener('mouseup', handleMouseUp)
        }
    }, [isDragging])

    const handleRunQuery = useCallback(() => {
        setIsRunning(true)
        setErrorMessage('')
        
        // Simulate query execution - in real app, this would call Trino
        setTimeout(() => {
            setIsRunning(false)
            // Set sample results
            setQueryId('sample-query-id')
            setColumns([
                { name: 'id', type: 'integer' },
                { name: 'name', type: 'varchar' },
                { name: 'created_at', type: 'timestamp' },
            ])
            setResults([
                { id: 1, name: 'Alice', created_at: '2024-01-15' },
                { id: 2, name: 'Bob', created_at: '2024-01-16' },
                { id: 3, name: 'Charlie', created_at: '2024-01-17' },
            ])
        }, 1000)
    }, [])

    const handleClearResults = useCallback((id: string | undefined) => {
        setResults([])
        setQueryId(undefined)
    }, [])

    const handleQueryChange = useCallback((query: string) => {
        // Handle query changes
    }, [])

    const handleSelectChange = useCallback((selectedText: string) => {
        // Handle selection changes
    }, [])

    const handleExecute = useCallback(() => {
        handleRunQuery()
    }, [handleRunQuery])

    return (
        <ThemeProvider theme={currentTheme}>
            <CssBaseline />
            <EditorContainer>
                {/* Top Bar */}
                <TopBar>
                    <Logo>
                        <div className="logo-icon">T</div>
                        <span className="logo-text">Trino Query</span>
                    </Logo>
                    
                    <ActionButtons>
                        <Tooltip title="Query History">
                            <IconBtn size="small">
                                <HistoryIcon fontSize="small" />
                            </IconBtn>
                        </Tooltip>
                        <Tooltip title="Settings">
                            <IconBtn size="small">
                                <SettingsIcon fontSize="small" />
                            </IconBtn>
                        </Tooltip>
                        <Tooltip title={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}>
                            <IconBtn size="small">
                                {theme === 'dark' ? (
                                    <LightModeIcon fontSize="small" />
                                ) : (
                                    <DarkModeIcon fontSize="small" />
                                )}
                            </IconBtn>
                        </Tooltip>
                        <RunButton onClick={handleRunQuery} disabled={isRunning}>
                            <PlayArrowIcon />
                        </RunButton>
                    </ActionButtons>
                </TopBar>

                {/* Main Content */}
                <MainContent>
                    <SplitPaneContainer>
                        {/* Query Editor */}
                        <EditorSection>
                            <EditorToolbar>
                                <TabButton active>
                                    <FormatAlignLeftIcon sx={{ fontSize: 16 }} />
                                    Query
                                </TabButton>
                                <TabButton>
                                    <HistoryIcon sx={{ fontSize: 16 }} />
                                    History
                                </TabButton>
                            </EditorToolbar>
                            <Box sx={{ flex: 1, overflow: 'hidden' }}>
                                <QueryEditorPane 
                                    queries={queries}
                                    maxHeight={editorHeight - 40}
                                    onQueryChange={handleQueryChange}
                                    onSelectChange={handleSelectChange}
                                    onExecute={handleExecute}
                                    theme={theme}
                                />
                            </Box>
                        </EditorSection>

                        {/* Resizer */}
                        <Resizer 
                            onMouseDown={handleMouseDown}
                            sx={{ cursor: isDragging ? 'row-resize' : 'row-resize' }}
                        />

                        {/* Results Panel */}
                        <ResultsSection>
                            <EditorToolbar>
                                <TabButton 
                                    active={activeTab === 'results'} 
                                    onClick={() => setActiveTab('results')}
                                >
                                    Results
                                    {results.length > 0 && (
                                        <Typography variant="caption" sx={{ ml: 1, opacity: 0.7 }}>
                                            ({results.length})
                                        </Typography>
                                    )}
                                </TabButton>
                                <TabButton 
                                    active={activeTab === 'charts'} 
                                    onClick={() => setActiveTab('charts')}
                                >
                                    <BarChartIcon sx={{ fontSize: 14 }} />
                                    Charts
                                </TabButton>
                                <TabButton 
                                    active={activeTab === 'explain'} 
                                    onClick={() => setActiveTab('explain')}
                                >
                                    <AccountTreeIcon sx={{ fontSize: 14 }} />
                                    Explain
                                </TabButton>
                            </EditorToolbar>
                            
                            <Box sx={{ flex: 1, overflow: 'hidden' }}>
                                {activeTab === 'results' && (
                                    results.length > 0 ? (
                                        <ResultSet 
                                            queryId={queryId}
                                            results={results}
                                            columns={columns}
                                            response={response}
                                            height={resultsHeight - 40}
                                            errorMessage={errorMessage}
                                            onClearResults={handleClearResults}
                                        />
                                    ) : (
                                        <EmptyState>
                                            <PlayArrowIcon sx={{ fontSize: 48, opacity: 0.3 }} />
                                            <Typography variant="body2">
                                                Run a query to see results
                                            </Typography>
                                            <Typography variant="caption" sx={{ opacity: 0.5 }}>
                                                Press Ctrl+Enter or click the Run button
                                            </Typography>
                                        </EmptyState>
                                    )
                                )}
                                {activeTab === 'charts' && (
                                    <EmptyState>
                                        <BarChartIcon sx={{ fontSize: 48, opacity: 0.3 }} />
                                        <Typography variant="body2">
                                            Charts visualization
                                        </Typography>
                                        <Typography variant="caption" sx={{ opacity: 0.5 }}>
                                            Visualize your query results as charts
                                        </Typography>
                                    </EmptyState>
                                )}
                                {activeTab === 'explain' && (
                                    <EmptyState>
                                        <AccountTreeIcon sx={{ fontSize: 48, opacity: 0.3 }} />
                                        <Typography variant="body2">
                                            Query execution plan
                                        </Typography>
                                        <Typography variant="caption" sx={{ opacity: 0.5 }}>
                                            View the query plan visualization
                                        </Typography>
                                    </EmptyState>
                                )}
                            </Box>
                        </ResultsSection>
                    </SplitPaneContainer>
                </MainContent>

                {/* Status Bar */}
                <StatusBar>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box sx={{ 
                            width: 8, 
                            height: 8, 
                            borderRadius: '50%', 
                            backgroundColor: themeTokens.colors.success 
                        }} />
                        <span>Connected to Trino</span>
                    </Box>
                    <span>{results.length} rows returned</span>
                </StatusBar>
            </EditorContainer>
        </ThemeProvider>
    )
}

export default ModernQueryEditor
