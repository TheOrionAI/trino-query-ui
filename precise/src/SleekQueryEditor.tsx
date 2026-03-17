import React, { useState, useCallback, useRef, useEffect } from 'react'
import { ThemeProvider, CssBaseline } from '@mui/material'
import { Box, styled, alpha, IconButton, Tooltip, Typography, Button, Chip } from '@mui/material'
import Editor from '@monaco-editor/react'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import KeyboardReturnIcon from '@mui/icons-material/KeyboardReturn'
import FormatAlignLeftIcon from '@mui/icons-material/FormatAlignLeft'
import BarChartIcon from '@mui/icons-material/BarChart'
import AccountTreeIcon from '@mui/icons-material/AccountTree'
import TableChartIcon from '@mui/icons-material/TableChart'
import SettingsIcon from '@mui/icons-material/Settings'
import FullscreenIcon from '@mui/icons-material/Fullscreen'
import GetAppIcon from '@mui/icons-material/GetApp'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import HistoryIcon from '@mui/icons-material/History'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import { darkTheme, lightTheme } from './theme'
import TrinoQueryRunner from './AsyncTrinoClient'

// Modern color palette - inspired by modern code editors
const colors = {
  bg: '#0a0a0f',
  bgSecondary: '#12121a',
  bgTertiary: '#1a1a25',
  border: '#2a2a3a',
  borderLight: '#3a3a4a',
  primary: '#6366f1',  // Indigo
  primaryHover: '#818cf8',
  secondary: '#22d3ee',  // Cyan
  accent: '#f472b6',  // Pink
  success: '#34d399',
  warning: '#fbbf24',
  error: '#f87171',
  text: '#f1f5f9',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',
}

// Styled components
const Container = styled('div')({
  height: '100vh',
  width: '100vw',
  backgroundColor: colors.bg,
  color: colors.text,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
})

const Header = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '12px 20px',
  backgroundColor: colors.bgSecondary,
  borderBottom: `1px solid ${colors.border}`,
})

const Logo = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  '& .logo': {
    width: 32,
    height: 32,
    borderRadius: 8,
    background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize: 16,
    color: '#fff',
  },
  '& .title': {
    fontSize: 18,
    fontWeight: 600,
    color: colors.text,
    letterSpacing: '-0.02em',
  },
  '& .subtitle': {
    fontSize: 12,
    color: colors.textMuted,
  },
})

const HeaderActions = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
})

const IconBtn = styled(IconButton)({
  color: colors.textSecondary,
  padding: 8,
  borderRadius: 8,
  '&:hover': {
    backgroundColor: alpha(colors.primary, 0.15),
    color: colors.text,
  },
})

const MainArea = styled(Box)({
  flex: 1,
  display: 'flex',
  overflow: 'hidden',
})

const EditorSection = styled(Box)({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  borderRight: `1px solid ${colors.border}`,
})

const EditorToolbar = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '8px 16px',
  backgroundColor: colors.bgSecondary,
  borderBottom: `1px solid ${colors.border}`,
})

const ToolbarLeft = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
})

const ToolbarRight = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
})

const RunButton = styled(Button)({
  backgroundColor: colors.primary,
  color: '#fff',
  padding: '8px 20px',
  borderRadius: 8,
  fontWeight: 600,
  fontSize: 13,
  textTransform: 'none',
  boxShadow: 'none',
  '&:hover': {
    backgroundColor: colors.primaryHover,
    boxShadow: `0 4px 16px ${alpha(colors.primary, 0.4)}`,
  },
})

const Tab = styled(Box)<{ active?: boolean }>(({ active }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  padding: '6px 14px',
  borderRadius: 6,
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: 500,
  color: active ? colors.text : colors.textMuted,
  backgroundColor: active ? alpha(colors.primary, 0.15) : 'transparent',
  border: active ? `1px solid ${alpha(colors.primary, 0.3)}` : '1px solid transparent',
  transition: 'all 0.15s ease',
  '&:hover': {
    backgroundColor: active ? alpha(colors.primary, 0.2) : alpha(colors.primary, 0.08),
    color: colors.text,
  },
}))

const EditorWrapper = styled(Box)({
  flex: 1,
  overflow: 'hidden',
})

const ResultsSection = styled(Box)({
  width: '45%',
  display: 'flex',
  flexDirection: 'column',
  backgroundColor: colors.bgSecondary,
})

const ResultsHeader = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '8px 16px',
  borderBottom: `1px solid ${colors.border}`,
})

const ResultsContent = styled(Box)({
  flex: 1,
  overflow: 'auto',
  padding: 16,
})

const StatusBar = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '6px 16px',
  backgroundColor: colors.bgSecondary,
  borderTop: `1px solid ${colors.border}`,
  fontSize: 12,
})

const StatusItem = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  color: colors.textMuted,
  '& .dot': {
    width: 8,
    height: 8,
    borderRadius: '50%',
    backgroundColor: colors.success,
  },
})

const Resizer = styled(Box)({
  width: 4,
  backgroundColor: colors.bgTertiary,
  cursor: 'col-resize',
  transition: 'background-color 0.15s ease',
  '&:hover': {
    backgroundColor: colors.primary,
  },
})


interface SleekQueryEditorProps {
  height: number
}

export const SleekQueryEditor = ({ height }: SleekQueryEditorProps) => {
  const [activeTab, setActiveTab] = useState<'table' | 'charts' | 'explain'>('table')
  const [query, setQuery] = useState(`SELECT * FROM users 
WHERE status = 'active'
ORDER BY created DESC
LIMIT 100`)
  const [isRunning, setIsRunning] = useState(false)
  const [results, setResults] = useState<any[]>([])
  const [columns, setColumns] = useState<string[]>([])
  const [showResults, setShowResults] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const editorRef = useRef<any>(null)

  const handleEditorMount = (editor: any) => {
    editorRef.current = editor
  }

  const handleRunQuery = useCallback(() => {
    if (!query.trim()) return
    setIsRunning(true)
    setShowResults(true)
    setResults([])
    setColumns([])
    setErrorMessage('')

    const runner = new TrinoQueryRunner()
    runner.SetColumns = (cols: any[]) => setColumns(cols.map((c: any) => c.name ?? String(c)))
    runner.SetAllResultsCallback((rows: any[], error: boolean) => {
      setIsRunning(false)
      if (!error) setResults(rows)
    })
    runner.SetErrorMessageCallback((msg: string) => {
      setIsRunning(false)
      setErrorMessage(msg)
    })
    runner.SetStopped = () => setIsRunning(false)
    runner.StartQuery(query)
  }, [query])

  // Handle Ctrl+Enter
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        handleRunQuery()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleRunQuery])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return colors.success
      case 'pending': return colors.warning
      case 'inactive': return colors.error
      default: return colors.textMuted
    }
  }

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Container>
        {/* Header */}
        <Header>
          <Logo>
            <div className="logo">T</div>
            <Box>
              <div className="title">Trino Query</div>
              <div className="subtitle">SQL Editor</div>
            </Box>
          </Logo>
          <HeaderActions>
            <Tooltip title="Query History">
              <IconBtn size="small">
                <HistoryIcon sx={{ fontSize: 18 }} />
              </IconBtn>
            </Tooltip>
            <Tooltip title="Settings">
              <IconBtn size="small">
                <SettingsIcon sx={{ fontSize: 18 }} />
              </IconBtn>
            </Tooltip>
            <RunButton 
              variant="contained" 
              startIcon={<PlayArrowIcon />}
              onClick={handleRunQuery}
              disabled={isRunning}
            >
              {isRunning ? 'Running...' : 'Run Query'}
            </RunButton>
          </HeaderActions>
        </Header>

        {/* Main Area */}
        <MainArea>
          {/* Editor Section */}
          <EditorSection>
            <EditorToolbar>
              <ToolbarLeft>
                <Tab active>
                  <FormatAlignLeftIcon sx={{ fontSize: 16 }} />
                  Query
                </Tab>
                <Tab>
                  <HistoryIcon sx={{ fontSize: 16 }} />
                  History
                </Tab>
              </ToolbarLeft>
              <ToolbarRight>
                <Chip 
                  label="Ctrl+Enter" 
                  size="small" 
                  sx={{ 
                    backgroundColor: colors.bgTertiary,
                    color: colors.textMuted,
                    fontSize: 11,
                    height: 22,
                  }}
                />
              </ToolbarRight>
            </EditorToolbar>
            <EditorWrapper>
              <Editor
                height="100%"
                defaultLanguage="sql"
                value={query}
                onChange={(value) => setQuery(value || '')}
                onMount={handleEditorMount}
                theme="vs-dark"
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  fontFamily: '"JetBrains Mono", "Fira Code", monospace',
                  lineNumbers: 'on',
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  padding: { top: 16, bottom: 16 },
                  tabSize: 2,
                  wordWrap: 'on',
                  renderLineHighlight: 'line',
                  cursorBlinking: 'smooth',
                  smoothScrolling: true,
                  bracketPairColorization: { enabled: true },
                }}
              />
            </EditorWrapper>
          </EditorSection>

          <Resizer />

          {/* Results Section */}
          <ResultsSection>
            <ResultsHeader>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Tab active={activeTab === 'table'} onClick={() => setActiveTab('table')}>
                  <TableChartIcon sx={{ fontSize: 16 }} />
                  Table
                </Tab>
                <Tab active={activeTab === 'charts'} onClick={() => setActiveTab('charts')}>
                  <BarChartIcon sx={{ fontSize: 16 }} />
                  Charts
                </Tab>
                <Tab active={activeTab === 'explain'} onClick={() => setActiveTab('explain')}>
                  <AccountTreeIcon sx={{ fontSize: 16 }} />
                  Explain
                </Tab>
              </Box>
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                <Tooltip title="Copy Results">
                  <IconBtn size="small">
                    <ContentCopyIcon sx={{ fontSize: 16 }} />
                  </IconBtn>
                </Tooltip>
                <Tooltip title="Export">
                  <IconBtn size="small">
                    <GetAppIcon sx={{ fontSize: 16 }} />
                  </IconBtn>
                </Tooltip>
              </Box>
            </ResultsHeader>

            <ResultsContent>
              {activeTab === 'table' && (
                showResults ? (
                  <Box>
                    {errorMessage && (
                      <Box sx={{
                        mb: 2, p: 2,
                        backgroundColor: alpha(colors.error, 0.1),
                        border: `1px solid ${alpha(colors.error, 0.3)}`,
                        borderRadius: 1,
                        color: colors.error,
                        fontSize: 13,
                        fontFamily: '"JetBrains Mono", monospace',
                      }}>
                        {errorMessage}
                      </Box>
                    )}
                    {/* Results Table */}
                    <table style={{
                      width: '100%', 
                      borderCollapse: 'collapse',
                      fontSize: 13,
                      fontFamily: '"Inter", sans-serif',
                    }}>
                      <thead>
                        <tr>
                          {columns.map((col) => (
                            <th key={col} style={{
                              textAlign: 'left',
                              padding: '10px 12px',
                              backgroundColor: colors.bgTertiary,
                              color: colors.textSecondary,
                              fontWeight: 600,
                              fontSize: 12,
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em',
                              borderBottom: `1px solid ${colors.border}`,
                              borderRight: `1px solid ${colors.border}`,
                            }}>
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {results.map((row, idx) => (
                          <tr key={idx} style={{
                            backgroundColor: idx % 2 === 0 ? 'transparent' : alpha(colors.bgTertiary, 0.3),
                          }}>
                            {columns.map((col) => (
                              <td key={col} style={{
                                padding: '10px 12px',
                                color: colors.text,
                                borderBottom: `1px solid ${colors.border}`,
                                borderRight: `1px solid ${colors.border}`,
                              }}>
                                {col === 'status' ? (
                                  <Box sx={{ 
                                    display: 'inline-flex', 
                                    alignItems: 'center',
                                    gap: 6,
                                    padding: '2px 8px',
                                    borderRadius: 4,
                                    backgroundColor: alpha(getStatusColor(row[col]), 0.15),
                                    color: getStatusColor(row[col]),
                                    fontSize: 12,
                                    fontWeight: 500,
                                  }}>
                                    <Box sx={{ 
                                      width: 6, 
                                      height: 6, 
                                      borderRadius: '50%', 
                                      backgroundColor: getStatusColor(row[col]) 
                                    }} />
                                    {row[col]}
                                  </Box>
                                ) : (
                                  row[col]
                                )}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </Box>
                ) : (
                  <Box sx={{ 
                    height: '100%', 
                    display: 'flex', 
                    flexDirection: 'column',
                    alignItems: 'center', 
                    justifyContent: 'center',
                    color: colors.textMuted,
                  }}>
                    <TableChartIcon sx={{ fontSize: 64, opacity: 0.2, mb: 2 }} />
                    <Typography variant="h6" sx={{ color: colors.textSecondary, mb: 1 }}>
                      Run a query to see results
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.5 }}>
                      Press Ctrl+Enter or click the Run Query button
                    </Typography>
                  </Box>
                )
              )}
              
              {activeTab === 'charts' && (
                <Box sx={{ 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column',
                  alignItems: 'center', 
                  justifyContent: 'center',
                  color: colors.textMuted,
                }}>
                  <BarChartIcon sx={{ fontSize: 64, opacity: 0.2, mb: 2 }} />
                  <Typography variant="h6" sx={{ color: colors.textSecondary, mb: 1 }}>
                    Charts
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.5 }}>
                    Visualize your query results
                  </Typography>
                </Box>
              )}
              
              {activeTab === 'explain' && (
                <Box sx={{ 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column',
                  alignItems: 'center', 
                  justifyContent: 'center',
                  color: colors.textMuted,
                }}>
                  <AccountTreeIcon sx={{ fontSize: 64, opacity: 0.2, mb: 2 }} />
                  <Typography variant="h6" sx={{ color: colors.textSecondary, mb: 1 }}>
                    Query Plan
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.5 }}>
                    View the execution plan
                  </Typography>
                </Box>
              )}
            </ResultsContent>
          </ResultsSection>
        </MainArea>

        {/* Status Bar */}
        <StatusBar>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <StatusItem>
              <span className="dot" />
              Connected
            </StatusItem>
            <StatusItem>
              Trino Engine
            </StatusItem>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <StatusItem>
              {results.length} rows
            </StatusItem>
            <StatusItem>
              42ms
            </StatusItem>
          </Box>
        </StatusBar>
      </Container>
    </ThemeProvider>
  )
}

export default SleekQueryEditor
