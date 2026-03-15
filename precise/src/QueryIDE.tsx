import React, { useState, useCallback, useMemo, useEffect } from 'react'
import TrinoQueryRunner from './AsyncTrinoClient'
import QueryCharts from './QueryCharts'
import Editor from '@monaco-editor/react'
import { 
  Box, styled, IconButton, Typography, Button, Chip, 
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, LinearProgress, Dialog, DialogContent, DialogTitle, TextField
} from '@mui/material'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import FolderIcon from '@mui/icons-material/Folder'
import StorageIcon from '@mui/icons-material/Storage'
import TableChartIcon from '@mui/icons-material/TableChart'
import ColumnsIcon from '@mui/icons-material/ViewColumn'
import SearchIcon from '@mui/icons-material/Search'
import RefreshIcon from '@mui/icons-material/Refresh'
import BarChartIcon from '@mui/icons-material/BarChart'
import CloseIcon from '@mui/icons-material/Close'
import ToggleOnIcon from '@mui/icons-material/ToggleOn'
import ToggleOffIcon from '@mui/icons-material/ToggleOff'
import AddCircleIcon from '@mui/icons-material/AddCircle'
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import LanIcon from '@mui/icons-material/Lan'
import DarkModeIcon from '@mui/icons-material/DarkMode'
import LightModeIcon from '@mui/icons-material/LightMode'

const lightColors = {
  bg: '#FFFFFF',
  bgSecondary: '#F9FAFB',
  bgTertiary: '#F3F4F6',
  border: '#E5E7EB',
  primary: '#F59E0B',
  dataAccent: '#14B8A6',
  text: '#111827',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  success: '#10B981',
}

const darkColors = {
  bg: '#0D1117',
  bgSecondary: '#161B22',
  bgTertiary: '#21262D',
  border: '#30363D',
  primary: '#F59E0B',
  dataAccent: '#14B8A6',
  text: '#E6EDF3',
  textSecondary: '#8B949E',
  textMuted: '#6E7681',
  success: '#3FB950',
}

type ColorTheme = typeof lightColors

/// Run a fire-and-forget query and return all first-page rows as raw arrays.
function runSimpleQuery(sql: string): Promise<any[][]> {
  return new Promise((resolve) => {
    const runner = new TrinoQueryRunner()
    runner.SetAllResultsCallback((rows: any[], error: boolean) => resolve(error ? [] : rows))
    runner.SetErrorMessageCallback(() => resolve([]))
    runner.SetStopped = () => {}
    runner.SetStarted = () => {}
    runner.StartQuery(sql)
  })
}

interface QueryTab { id: number; name: string; query: string; results: any[][]; columns: any[]; isRunning: boolean; completed: boolean; error?: string; execMs?: number }
interface TreeNode { name: string; type: string; expanded?: boolean; children?: TreeNode[]; colType?: string }

export const QueryIDE = () => {
  const [darkMode, setDarkMode] = useState(false)
  const [tabs, setTabs] = useState<QueryTab[]>([{ id: 1, name: 'Query 1', query: 'SELECT * FROM tpch.sf1.nation LIMIT 10', results: [], columns: [], isRunning: false, completed: false }])
  const [activeTabId, setActiveTabId] = useState(1)
  const [showInspector, setShowInspector] = useState(true)
  const [showAnalytics, setShowAnalytics] = useState(false)
  const [showTableSelect, setShowTableSelect] = useState(false)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [schemaSearch, setSchemaSearch] = useState('')
  const [schemaTree, setSchemaTree] = useState<TreeNode[]>([])
  const [schemaLoading, setSchemaLoading] = useState(false)
  const [resultTab, setResultTab] = useState<'table' | 'chart'>('table')

  const colors = darkMode ? darkColors : lightColors

  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0]

  const handleTabChange = (id: number) => setActiveTabId(id)
  const addNewTab = () => { const n = Math.max(...tabs.map(t => t.id)) + 1; setTabs([...tabs, { id: n, name: `Query ${n}`, query: 'SELECT * FROM ', results: [], columns: [], isRunning: false, completed: false }]); setActiveTabId(n) }
  const closeTab = (id: number) => { if (tabs.length === 1) return; const n = tabs.filter(t => t.id !== id); setTabs(n); if (activeTabId === id) setActiveTabId(n[0].id) }
  const updateQuery = (q: string) => setTabs(tabs.map(t => t.id === activeTabId ? { ...t, query: q } : t))

  // Load the full catalog → schema → table tree from the live Trino server
  const loadSchemaTree = useCallback(async () => {
    setSchemaLoading(true)
    try {
      const catRows = await runSimpleQuery('SHOW CATALOGS')
      const catalogNames = catRows.map((r: any[]) => String(r[0]))
      const tree: TreeNode[] = []
      for (const cat of catalogNames) {
        const schemaRows = await runSimpleQuery(`SHOW SCHEMAS FROM ${cat}`)
        const schemas = schemaRows
          .map((r: any[]) => String(r[0]))
          .filter(s => s !== 'information_schema')
        const schemaNodes: TreeNode[] = []
        for (const schema of schemas) {
          const tableRows = await runSimpleQuery(`SHOW TABLES FROM ${cat}.${schema}`)
          const tables = tableRows.map((r: any[]) => String(r[0]))
          schemaNodes.push({ name: schema, type: 'schema', children: tables.map(t => ({ name: t, type: 'table', children: [] })) })
        }
        tree.push({ name: cat, type: 'catalog', children: schemaNodes })
      }
      setSchemaTree(tree)
    } catch (e) {
      console.error('Schema load failed', e)
    } finally {
      setSchemaLoading(false)
    }
  }, [])

  useEffect(() => { loadSchemaTree() }, [loadSchemaTree])

  const handleRunQuery = useCallback(() => {
    const sql = activeTab.query.trim()
    if (!sql || activeTab.isRunning) return
    const startMs = Date.now()
    setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, isRunning: true, completed: false, error: undefined, results: [], columns: [] } : t))
    const runner = new TrinoQueryRunner()
    runner.SetColumns = (cols: any[]) => {
      setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, columns: cols } : t))
    }
    runner.SetAllResultsCallback((rows: any[], error: boolean) => {
      const execMs = Date.now() - startMs
      setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, isRunning: false, completed: !error, results: rows, execMs } : t))
    })
    runner.SetErrorMessageCallback((msg: string) => {
      setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, isRunning: false, error: msg } : t))
    })
    runner.SetStopped = () => {}
    runner.StartQuery(sql)
  }, [activeTabId, activeTab.query, activeTab.isRunning])

  const insertTable = (table: string) => { updateQuery(`SELECT * FROM ${table} LIMIT 100`); setShowTableSelect(false) }

  const toggleExpand = (path: string) => {
    setExpanded(prev => ({ ...prev, [path]: !prev[path] }))
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'connector': return <LanIcon sx={{ fontSize: 10, color: '#8B5CF6' }} />
      case 'catalog': return <StorageIcon sx={{ fontSize: 10, color: colors.primary }} />
      case 'schema': return <FolderIcon sx={{ fontSize: 10 }} />
      case 'table': return <TableChartIcon sx={{ fontSize: 10, color: colors.dataAccent }} />
      case 'column': return <ColumnsIcon sx={{ fontSize: 9, color: colors.textMuted }} />
      default: return null
    }
  }

  const renderTree = (nodes: TreeNode[], level = 0, prefix = '') => nodes.map(node => {
    // qualifiedName is the full dotted path (e.g. "tpch.sf1.nation")
    const qualifiedName = prefix ? `${prefix}.${node.name}` : node.name
    const expandKey = qualifiedName
    const isExpanded = expanded[expandKey]
    const hasChildren = node.children && node.children.length > 0

    const searchLower = schemaSearch.toLowerCase()
    const matchesSearch = !schemaSearch || node.name.toLowerCase().includes(searchLower)
    const hasMatchingChild = (n: TreeNode): boolean => {
      if (n.name.toLowerCase().includes(searchLower)) return true
      return n.children?.some(hasMatchingChild) || false
    }
    const childMatches = node.children?.some(hasMatchingChild) || false

    if (!matchesSearch && !childMatches) return null

    return (
      <Box key={qualifiedName}>
        <TreeItem
          level={level}
          title={node.type === 'table' ? `Click to query ${qualifiedName}` : undefined}
          onClick={() => {
            if (node.type === 'table') insertTable(qualifiedName)
            else if (hasChildren) toggleExpand(expandKey)
          }}
        >
          <TreeIcon>
            {hasChildren ? (isExpanded ? <ExpandMoreIcon sx={{ fontSize: 12 }} /> : <ChevronRightIcon sx={{ fontSize: 12 }} />) : null}
          </TreeIcon>
          <TreeIcon>{getIcon(node.type)}</TreeIcon>
          <span style={{ fontWeight: node.type === 'connector' || node.type === 'catalog' ? 600 : 400 }}>
            {node.name}
          </span>
          {node.type === 'column' && node.colType && <ColumnType>{node.colType}</ColumnType>}
        </TreeItem>
        {isExpanded && node.children?.map(child => renderTree([child], level + 1, qualifiedName))}
      </Box>
    )
  })

  const schemaData = schemaTree

  // Derive sparkline data from real tab execution times (last 12 completed tabs)
  const sparkData = useMemo(() => {
    const times = tabs.filter(t => t.execMs != null).map(t => t.execMs!)
    if (times.length === 0) return [0]
    const max = Math.max(...times)
    return times.slice(-12).map(ms => max > 0 ? Math.round((ms / max) * 100) : 0)
  }, [tabs])

  // Distribution histogram of exec times across all completed tabs
  const histData = useMemo(() => {
    const times = tabs.filter(t => t.execMs != null).map(t => t.execMs!)
    if (times.length === 0) return [0]
    const max = Math.max(...times)
    const bins = 12
    const binSize = max / bins || 1
    const counts = Array(bins).fill(0)
    times.forEach(ms => { counts[Math.min(Math.floor(ms / binSize), bins - 1)]++ })
    const maxCount = Math.max(...counts)
    return counts.map(c => maxCount > 0 ? Math.round((c / maxCount) * 100) : 0)
  }, [tabs])

  // Parse catalog.schema from the active query's FROM clause
  const breadcrumb = useMemo(() => {
    const match = activeTab.query.match(/\bfrom\s+([a-z_][a-z0-9_]*)\.([a-z_][a-z0-9_]*)\./i)
    if (match) return { catalog: match[1], schema: match[2] }
    return null
  }, [activeTab.query])

  // Real exec-time stats across all completed tabs
  const execTimes = tabs.filter(t => t.execMs != null).map(t => t.execMs!)
  const statsMin = execTimes.length > 0 ? Math.min(...execTimes) : null
  const statsMax = execTimes.length > 0 ? Math.max(...execTimes) : null
  const statsAvg = execTimes.length > 0 ? Math.round(execTimes.reduce((a, b) => a + b, 0) / execTimes.length) : null

  const allTables = schemaTree.flatMap((cat: TreeNode) =>
    (cat.children || []).flatMap((schema: TreeNode) =>
      (schema.children || [])
        .filter(t => t.type === 'table')
        .map(t => `${cat.name}.${schema.name}.${t.name}`)
    )
  )

  React.useEffect(() => {
    if (schemaSearch) {
      const newExpanded: Record<string, boolean> = {}
      const markExpanded = (nodes: TreeNode[], prefix = '') => {
        nodes.forEach(node => {
          const key = prefix ? `${prefix}.${node.name}` : node.name
          newExpanded[key] = true
          if (node.children) markExpanded(node.children, key)
        })
      }
      markExpanded(schemaData)
      setExpanded(newExpanded)
    }
  }, [schemaSearch])

  const Container = useMemo(() => styled('div')({ 
    height: '100vh', width: '100vw', backgroundColor: colors.bg, display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: '"Inter", sans-serif' 
  }), [colors.bg])

  const Header = useMemo(() => styled(Box)({ 
    height: 36, backgroundColor: colors.bgSecondary, borderBottom: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', padding: '0 12px', gap: 10 
  }), [colors.bgSecondary, colors.border])

  const Logo = useMemo(() => styled(Box)({ 
    display: 'flex', alignItems: 'center', gap: 6, 
    '& .logo-text': { fontSize: 14, fontWeight: 700, color: colors.primary },
    '& .logo-icon': { fontSize: 16, color: colors.primary, fontWeight: 800 },
    '& .logo-sub': { fontSize: 10, color: colors.textMuted, padding: '2px 5px', backgroundColor: colors.bgTertiary, borderRadius: 3 }
  }), [colors.primary, colors.textMuted, colors.bgTertiary])

  const TabsArea = useMemo(() => styled(Box)({ flex: 1, display: 'flex', alignItems: 'flex-end', paddingLeft: 16, overflow: 'hidden' }), [])

  const TabBar = useMemo(() => styled(Box)({ 
    display: 'flex', alignItems: 'flex-end', height: 28, gap: 1, borderLeft: `1px solid ${colors.border}`, paddingLeft: 8 
  }), [colors.border])

  const QueryTab = useMemo(() => styled(Box)<{ active?: boolean }>(({ active }) => ({ 
    display: 'flex', alignItems: 'center', gap: 4, padding: '3px 10px', cursor: 'pointer', 
    borderTop: active ? `2px solid ${colors.primary}` : `2px solid transparent`, 
    borderLeft: `1px solid ${colors.border}`, borderRight: `1px solid ${colors.border}`, 
    backgroundColor: active ? colors.bg : colors.bgTertiary, 
    color: active ? colors.text : colors.textSecondary, 
    fontSize: 11, borderRadius: '3px 3px 0 0', marginTop: 2, height: 22, 
    '&:hover': { backgroundColor: active ? colors.bg : colors.bgSecondary } 
  })), [colors.primary, colors.border, colors.bg, colors.bgTertiary, colors.text, colors.textSecondary])

  const AddTab = useMemo(() => styled(Box)({ 
    display: 'flex', alignItems: 'center', padding: '3px 6px', cursor: 'pointer', 
    color: colors.textMuted, height: 22, marginTop: 2, borderRadius: 3, 
    '&:hover': { color: colors.primary, backgroundColor: colors.bgTertiary } 
  }), [colors.textMuted, colors.primary, colors.bgTertiary])

  const HeaderActions = useMemo(() => styled(Box)({ display: 'flex', alignItems: 'center', gap: 4 }), [])

  const RunButton = useMemo(() => styled(Button)({ 
    backgroundColor: colors.primary, color: '#fff', padding: '2px 10px', borderRadius: 3, 
    fontWeight: 600, fontSize: 11, textTransform: 'none', boxShadow: 'none', height: 22, 
    '&:hover': { backgroundColor: colors.primary, boxShadow: 'none' } 
  }), [colors.primary])

  const IconBtn = useMemo(() => styled(IconButton)({ 
    color: colors.textSecondary, padding: 2, borderRadius: 3, 
    '&:hover': { backgroundColor: colors.bgTertiary, color: colors.text } 
  }), [colors.textSecondary, colors.bgTertiary, colors.text])

  const MainArea = useMemo(() => styled('div')({ flex: 1, display: 'flex', overflow: 'hidden' }), [])

  const LeftSidebar = useMemo(() => styled(Box)({ 
    width: 220, backgroundColor: colors.bgSecondary, borderRight: `1px solid ${colors.border}`, 
    display: 'flex', flexDirection: 'column' 
  }), [colors.bgSecondary, colors.border])

  const SidebarHeader = useMemo(() => styled(Box)({ 
    padding: '4px 8px', borderBottom: `1px solid ${colors.border}`, 
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 28 
  }), [colors.border])

  const SidebarTitle = useMemo(() => styled(Box)({ display: 'flex', alignItems: 'center', gap: 6 }), [])

  const SidebarTitleText = useMemo(() => styled(Typography)({ 
    fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: colors.textSecondary 
  }), [colors.textSecondary])

  const ToggleSwitch = useMemo(() => styled(Box)({ 
    display: 'flex', alignItems: 'center', gap: 4, fontSize: 8, color: colors.textMuted, cursor: 'pointer', 
    '&:hover': { color: colors.textSecondary } 
  }), [colors.textMuted, colors.textSecondary])

  const SearchField = useMemo(() => styled(TextField)({ 
    '& .MuiInputBase-root': { height: 22, fontSize: 10 }, 
    '& .MuiInputBase-input': { padding: '4px 8px', height: 14 }, 
    '& .MuiOutlinedInput-notchedOutline': { borderColor: colors.border } 
  }), [colors.border])

  const SidebarContent = useMemo(() => styled(Box)({ flex: 1, overflow: 'auto' }), [])

  const TreeItem = useMemo(() => styled(Box)<{ level?: number }>(({ level = 0 }) => ({ 
    display: 'flex', alignItems: 'center', padding: '2px 4px', cursor: 'pointer', fontSize: 10, 
    color: colors.text, paddingLeft: level * 12 + 4, 
    '&:hover': { backgroundColor: colors.bgTertiary } 
  })), [colors.text, colors.bgTertiary])

  const TreeIcon = useMemo(() => styled(Box)({ 
    width: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 2, color: colors.textMuted 
  }), [colors.textMuted])

  const ColumnType = useMemo(() => styled('span')({ color: colors.textMuted, fontSize: 9, marginLeft: 4 }), [colors.textMuted])

  const Workspace = useMemo(() => styled(Box)({ 
    flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', backgroundColor: colors.bg 
  }), [colors.bg])

  const WorkspaceHeader = useMemo(() => styled(Box)({ 
    padding: '4px 12px', borderBottom: `1px solid ${colors.border}`, 
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 28 
  }), [colors.border])

  const Breadcrumb = useMemo(() => styled(Box)({ 
    display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: colors.textSecondary 
  }), [colors.textSecondary])

  const CellContainer = useMemo(() => styled(Paper)({ 
    margin: '0 12px 12px 12px', border: `1px solid ${colors.border}`, borderRadius: 3, 
    overflow: 'hidden', boxShadow: 'none', flex: 1, display: 'flex', flexDirection: 'column' 
  }), [colors.border])

  const CellHeader = useMemo(() => styled(Box)({ 
    padding: '4px 8px', borderBottom: `1px solid ${colors.border}`, 
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
    backgroundColor: colors.bgSecondary, minHeight: 26 
  }), [colors.border, colors.bgSecondary])

  const CellLabel = useMemo(() => styled(Box)({ 
    display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, fontWeight: 600, color: colors.textSecondary 
  }), [colors.textSecondary])

  const TablePicker = useMemo(() => styled(Box)({ 
    display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: colors.textSecondary, cursor: 'pointer', 
    '&:hover': { color: colors.primary } 
  }), [colors.textSecondary, colors.primary])

  const CellStatus = useMemo(() => styled(Box)({ 
    display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: colors.textMuted 
  }), [colors.textMuted])

  const StatusDot = useMemo(() => styled(Box)({ width: 5, height: 5, borderRadius: '50%', backgroundColor: colors.success }), [colors.success])

  const CellEditor = useMemo(() => styled(Box)({ flex: 1, minHeight: 100, overflow: 'hidden' }), [])

  const CellResults = useMemo(() => styled(Box)({ 
    borderTop: `1px solid ${colors.border}`, flex: 1, overflow: 'auto', minHeight: 150 
  }), [colors.border])

  const ResultsTable = useMemo(() => styled(TableContainer)({ 
    '& .MuiTableCell-head': { 
      backgroundColor: colors.bgTertiary, color: colors.textSecondary, fontWeight: 600, fontSize: 9, 
      textTransform: 'uppercase', borderBottom: `1px solid ${colors.border}`, padding: '4px 8px', 
      position: 'sticky', top: 0 
    }, 
    '& .MuiTableCell-body': { 
      borderBottom: `1px solid ${colors.border}`, padding: '4px 8px', color: colors.text, 
      fontFamily: '"JetBrains Mono", monospace', fontSize: 10 
    }, 
    '& .MuiTableRow-root': { '&:nth-of-type(even)': { backgroundColor: colors.bgSecondary } } 
  }), [colors.bgTertiary, colors.textSecondary, colors.border, colors.text, colors.bgSecondary])

  const ResultFooter = useMemo(() => styled(Box)({ 
    padding: '4px 8px', borderTop: `1px solid ${colors.border}`, backgroundColor: colors.bgSecondary, 
    fontSize: 10, color: colors.textSecondary, display: 'flex', justifyContent: 'space-between' 
  }), [colors.border, colors.bgSecondary, colors.textSecondary])

  const StatusBar = useMemo(() => styled(Box)({ 
    padding: '3px 12px', borderTop: `1px solid ${colors.border}`, backgroundColor: colors.bgSecondary, 
    display: 'flex', justifyContent: 'space-between', fontSize: 10, color: colors.textMuted 
  }), [colors.border, colors.bgSecondary, colors.textMuted])

  const AnalyticsModal = useMemo(() => styled(Dialog)({ '& .MuiDialog-paper': { width: 500 } }), [])

  const ModalHeader = useMemo(() => styled(DialogTitle)({ 
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
    padding: '8px 12px', borderBottom: `1px solid ${colors.border}`, 
    backgroundColor: colors.bgSecondary, fontSize: 13 
  }), [colors.border, colors.bgSecondary])

  const ModalContent = useMemo(() => styled(DialogContent)({ padding: 12 }), [])

  const AnalyticsGrid = useMemo(() => styled(Box)({ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }), [])

  const AnalyticsCard = useMemo(() => styled(Paper)({ 
    padding: 10, border: `1px solid ${colors.border}`, borderRadius: 3, boxShadow: 'none' 
  }), [colors.border])

  const AnalyticsTitle = useMemo(() => styled(Typography)({ 
    fontSize: 9, fontWeight: 600, textTransform: 'uppercase', color: colors.textSecondary, marginBottom: 6 
  }), [colors.textSecondary])

  const Sparkline = useMemo(() => styled(Box)({ height: 28, display: 'flex', alignItems: 'flex-end', gap: 2 }), [])

  const SparkBar = useMemo(() => styled(Box)<{ h: number }>(({ h }) => ({ 
    width: 5, height: `${h}%`, backgroundColor: colors.dataAccent, borderRadius: 1, minHeight: 2 
  })), [colors.dataAccent])

  const Histogram = useMemo(() => styled(Box)({ height: 36, display: 'flex', alignItems: 'flex-end', gap: 2 }), [])

  const HistBar = useMemo(() => styled(Box)<{ h: number }>(({ h }) => ({ 
    flex: 1, height: `${h}%`, backgroundColor: colors.dataAccent, borderRadius: '1px 1px 0 0', minHeight: 2 
  })), [colors.dataAccent])

  const InspectorRow = useMemo(() => styled(Box)({ 
    display: 'flex', justifyContent: 'space-between', padding: '2px 0', fontSize: 11 
  }), [])

  const InspectorLabel = useMemo(() => styled(Box)({ color: colors.textSecondary }), [colors.textSecondary])

  const InspectorValue = useMemo(() => styled(Box)({ 
    color: colors.text, fontFamily: '"JetBrains Mono", monospace', fontSize: 10 
  }), [colors.text])

  const TableSelectDialog = useMemo(() => styled(Dialog)({ '& .MuiDialog-paper': { width: 350 } }), [])

  const TableList = useMemo(() => styled('div')({ maxHeight: 250, overflow: 'auto', marginTop: 8 }), [])

  const TableItem = useMemo(() => styled(Box)({ 
    display: 'flex', alignItems: 'center', padding: '4px 8px', cursor: 'pointer', fontSize: 10, 
    '&:hover': { backgroundColor: colors.bgTertiary } 
  }), [colors.bgTertiary])

  return (
    <Container>
      <Header>
        <Logo>
          <span className="logo-icon">⚡</span>
          <span className="logo-text">Rusty Trino</span>
          <span className="logo-sub">Federated</span>
        </Logo>
        <TabsArea>
          <TabBar>
            {tabs.map(t => (
              <QueryTab key={t.id} active={t.id === activeTabId} onClick={() => handleTabChange(t.id)}>
                <span>{t.name}</span>
                {tabs.length > 1 && <CloseIcon sx={{ fontSize: 10, ml: 4, opacity: 0.5 }} onClick={(e) => { e.stopPropagation(); closeTab(t.id) }} />}
              </QueryTab>
            ))}
            <AddTab onClick={addNewTab}><AddCircleIcon sx={{ fontSize: 14 }} /></AddTab>
          </TabBar>
        </TabsArea>
        <HeaderActions>
          <IconBtn size="small" onClick={() => setDarkMode(!darkMode)}>
            {darkMode ? <LightModeIcon sx={{ fontSize: 16, color: colors.primary }} /> : <DarkModeIcon sx={{ fontSize: 16 }} />}
          </IconBtn>
          <IconBtn size="small" onClick={() => setShowInspector(!showInspector)}>
            {showInspector ? <ToggleOnIcon sx={{ fontSize: 16, color: colors.primary }} /> : <ToggleOffIcon sx={{ fontSize: 16 }} />}
          </IconBtn>
          <IconBtn size="small" onClick={() => setShowAnalytics(true)} title="Query Analytics">
            <BarChartIcon sx={{ fontSize: 14 }} />
          </IconBtn>
          <IconBtn size="small"><SearchIcon sx={{ fontSize: 14 }} /></IconBtn>
          <RunButton variant="contained" startIcon={<PlayArrowIcon sx={{ fontSize: 12 }} />} onClick={handleRunQuery} disabled={activeTab.isRunning}>
            {activeTab.isRunning ? 'Running...' : 'Run'}
          </RunButton>
        </HeaderActions>
      </Header>

      <MainArea>
        <LeftSidebar>
          <SidebarHeader>
            <SidebarTitle>
              <SidebarTitleText>Schema Browser</SidebarTitleText>
              {schemaLoading && <SidebarTitleText sx={{ color: colors.textMuted }}>Loading…</SidebarTitleText>}
            </SidebarTitle>
            <IconBtn size="small" onClick={loadSchemaTree} disabled={schemaLoading}><RefreshIcon sx={{ fontSize: 12, animation: schemaLoading ? 'spin 1s linear infinite' : 'none' }} /></IconBtn>
          </SidebarHeader>
          <Box sx={{ px: 1, py: 0.5 }}>
            <SearchField 
              placeholder="Search..." 
              size="small" 
              fullWidth
              value={schemaSearch}
              onChange={(e) => setSchemaSearch(e.target.value)}
              InputProps={{ startAdornment: <SearchIcon sx={{ fontSize: 12, mr: 0.5, color: colors.textMuted }} /> }}
            />
          </Box>
          <SidebarContent>
            {renderTree(schemaData)}
          </SidebarContent>
        </LeftSidebar>

        <Workspace>
          <WorkspaceHeader>
            <Breadcrumb>
              {breadcrumb
                ? <><span>{breadcrumb.catalog}</span><span>›</span><span>{breadcrumb.schema}</span></>
                : <span style={{ color: colors.textMuted }}>—</span>
              }
            </Breadcrumb>
          </WorkspaceHeader>

          <CellContainer>
            <CellHeader>
              <CellLabel>
                <Chip label="SQL" size="small" sx={{ height: 16, fontSize: 8, fontWeight: 600, backgroundColor: colors.primary, color: '#fff' }} />
                <span>{activeTab.name}</span>
                <TablePicker onClick={() => setShowTableSelect(true)}>
                  <TableChartIcon sx={{ fontSize: 12 }} />Select Table<ArrowDropDownIcon sx={{ fontSize: 14 }} />
                </TablePicker>
              </CellLabel>
              <CellStatus>
                {activeTab.isRunning ? <><LinearProgress sx={{ width: 40, height: 3 }} /><span>Running...</span></> : activeTab.completed ? <><StatusDot /><span>{activeTab.execMs != null ? `${activeTab.execMs}ms` : 'done'}</span></> : activeTab.error ? <span style={{ color: '#f06c6c' }}>Error</span> : <span>Ready</span>}
              </CellStatus>
            </CellHeader>
            <CellEditor>
              <Editor 
                height="100%" 
                defaultLanguage="sql" 
                value={activeTab.query} 
                onChange={(v) => updateQuery(v || '')} 
                theme={darkMode ? 'vs-dark' : 'light'} 
                options={{ 
                  minimap: { enabled: false }, 
                  fontSize: 11, 
                  fontFamily: '"JetBrains Mono", monospace', 
                  lineNumbers: 'on', 
                  scrollBeyondLastLine: false, 
                  automaticLayout: true, 
                  padding: { top: 6, bottom: 6 }, 
                  lineHeight: 18 
                }} 
              />
            </CellEditor>
            {activeTab.error && (
              <Box sx={{ px: 2, py: 1, color: '#f06c6c', fontSize: 11, fontFamily: 'monospace', backgroundColor: colors.bgTertiary, borderTop: `1px solid ${colors.border}` }}>
                Error: {activeTab.error}
              </Box>
            )}
            {activeTab.results.length > 0 && activeTab.columns.length > 0 && (
              <CellResults>
                {/* Result tab bar: Table | Chart */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1, py: 0.5, borderBottom: `1px solid ${colors.border}`, backgroundColor: colors.bgSecondary }}>
                  {(['table', 'chart'] as const).map(tab => (
                    <Box
                      key={tab}
                      onClick={() => setResultTab(tab)}
                      sx={{
                        px: 1, py: 0.25, fontSize: 10, fontWeight: 600, cursor: 'pointer', borderRadius: 1,
                        textTransform: 'uppercase', letterSpacing: '0.05em',
                        color: resultTab === tab ? colors.primary : colors.textMuted,
                        backgroundColor: resultTab === tab ? `${colors.primary}18` : 'transparent',
                        '&:hover': { color: colors.primary },
                      }}
                    >
                      {tab === 'table' ? 'Table' : 'Chart'}
                    </Box>
                  ))}
                </Box>

                {resultTab === 'table' ? (
                  <>
                    <ResultsTable>
                      <TableHead>
                        <TableRow>
                          {activeTab.columns.map((col: any, i: number) => (
                            <TableCell key={i}>{col.name}</TableCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {activeTab.results.map((row: any[], i: number) => (
                          <TableRow key={i}>
                            {activeTab.columns.map((_: any, j: number) => (
                              <TableCell key={j}>
                                {row[j] === null || row[j] === undefined ? <span style={{ color: colors.textMuted, fontStyle: 'italic' }}>NULL</span> : String(row[j])}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </ResultsTable>
                    <ResultFooter>
                      <span>{activeTab.results.length} rows</span>
                      <span>{activeTab.execMs != null ? `${activeTab.execMs}ms` : ''}</span>
                    </ResultFooter>
                  </>
                ) : (
                  <QueryCharts
                    columns={activeTab.columns}
                    rows={activeTab.results.map((row: any[]) =>
                      Object.fromEntries(activeTab.columns.map((col: any, j: number) => [col.name, row[j]]))
                    )}
                    height={300}
                  />
                )}
              </CellResults>
            )}
          </CellContainer>
        </Workspace>

        {showInspector && (
          <Box sx={{ width: 160, backgroundColor: colors.bgSecondary, borderLeft: `1px solid ${colors.border}`, p: 1 }}>
            <SidebarTitleText sx={{ mb: 1 }}>Inspector</SidebarTitleText>
            <AnalyticsCard sx={{ mb: 1 }}>
              <AnalyticsTitle>Query</AnalyticsTitle>
              <InspectorRow><InspectorLabel>State</InspectorLabel><InspectorValue>{activeTab.completed ? 'FINISHED' : 'READY'}</InspectorValue></InspectorRow>
              <InspectorRow><InspectorLabel>Rows</InspectorLabel><InspectorValue>{activeTab.results.length}</InspectorValue></InspectorRow>
            </AnalyticsCard>
            <AnalyticsCard>
              <AnalyticsTitle>History</AnalyticsTitle>
              <Sparkline>{sparkData.map((h, i) => <SparkBar key={i} h={h} />)}</Sparkline>
            </AnalyticsCard>
          </Box>
        )}
      </MainArea>

      <StatusBar>
        <Box>
          <span>✓ Connected</span>
          <span style={{ margin: '0 8px' }}>|</span>
          <span>Rusty Trino v0.1</span>
        </Box>
        <Box>
          <span>{activeTab.results.length} rows</span>
          {activeTab.execMs != null && <><span style={{ margin: '0 8px' }}>|</span><span>{activeTab.execMs}ms</span></>}
        </Box>
      </StatusBar>

      <AnalyticsModal open={showAnalytics} onClose={() => setShowAnalytics(false)}>
        <ModalHeader>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <BarChartIcon sx={{ fontSize: 16, color: colors.dataAccent }} />
            <span style={{ fontWeight: 600, fontSize: 13 }}>Query Analytics</span>
          </Box>
          <IconBtn size="small" onClick={() => setShowAnalytics(false)}><CloseIcon fontSize="small" /></IconBtn>
        </ModalHeader>
        <ModalContent>
          <AnalyticsGrid>
            <AnalyticsCard><AnalyticsTitle>Execution Time</AnalyticsTitle><Sparkline>{sparkData.map((h, i) => <SparkBar key={i} h={h} />)}</Sparkline></AnalyticsCard>
            <AnalyticsCard><AnalyticsTitle>Distribution</AnalyticsTitle><Histogram>{histData.map((h, i) => <HistBar key={i} h={h} />)}</Histogram></AnalyticsCard>
            <AnalyticsCard>
              <AnalyticsTitle>Exec Time (ms)</AnalyticsTitle>
              <InspectorRow><InspectorLabel>Min</InspectorLabel><InspectorValue>{statsMin != null ? `${statsMin}ms` : '—'}</InspectorValue></InspectorRow>
              <InspectorRow><InspectorLabel>Max</InspectorLabel><InspectorValue>{statsMax != null ? `${statsMax}ms` : '—'}</InspectorValue></InspectorRow>
              <InspectorRow><InspectorLabel>Avg</InspectorLabel><InspectorValue>{statsAvg != null ? `${statsAvg}ms` : '—'}</InspectorValue></InspectorRow>
            </AnalyticsCard>
            <AnalyticsCard>
              <AnalyticsTitle>Current Query</AnalyticsTitle>
              <InspectorRow><InspectorLabel>Status</InspectorLabel><InspectorValue style={{ color: activeTab.error ? '#f06c6c' : colors.success }}>{activeTab.completed ? '✓ Success' : activeTab.error ? '✗ Error' : '—'}</InspectorValue></InspectorRow>
              <InspectorRow><InspectorLabel>Time</InspectorLabel><InspectorValue>{activeTab.execMs != null ? `${activeTab.execMs}ms` : '—'}</InspectorValue></InspectorRow>
              <InspectorRow><InspectorLabel>Rows</InspectorLabel><InspectorValue>{activeTab.results.length > 0 ? activeTab.results.length : '—'}</InspectorValue></InspectorRow>
            </AnalyticsCard>
          </AnalyticsGrid>
        </ModalContent>
      </AnalyticsModal>

      <TableSelectDialog open={showTableSelect} onClose={() => setShowTableSelect(false)}>
        <ModalHeader>
          <span style={{ fontWeight: 600, fontSize: 13 }}>Select Table</span>
          <IconBtn size="small" onClick={() => setShowTableSelect(false)}><CloseIcon fontSize="small" /></IconBtn>
        </ModalHeader>
        <DialogContent sx={{ pt: 1 }}>
          <TableList>
            {allTables.map(t => (
              <TableItem key={t} onClick={() => insertTable(t)}>
                <TableChartIcon sx={{ fontSize: 12, mr: 1, color: colors.dataAccent }} />
                {t}
              </TableItem>
            ))}
          </TableList>
        </DialogContent>
      </TableSelectDialog>
    </Container>
  )
}

export default QueryIDE
