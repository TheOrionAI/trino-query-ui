import React, { useState, useCallback, useMemo } from 'react'
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

const sampleData = [
  { id: 1, name: 'Alice Johnson', email: 'alice@example.com', status: 'active', created: '2024-01-15', amount: 1250.00 },
  { id: 2, name: 'Bob Smith', email: 'bob@example.com', status: 'active', created: '2024-01-16', amount: 890.50 },
  { id: 3, name: 'Charlie Brown', email: 'charlie@example.com', status: 'pending', created: '2024-01-17', amount: 2100.00 },
  { id: 4, name: 'Diana Prince', email: 'diana@example.com', status: 'active', created: '2024-01-18', amount: 750.25 },
  { id: 5, name: 'Eve Wilson', email: 'eve@example.com', status: 'inactive', created: '2024-01-19', amount: 3200.00 },
  { id: 6, name: 'Frank Miller', email: 'frank@example.com', status: 'active', created: '2024-01-20', amount: 450.75 },
  { id: 7, name: 'Grace Lee', email: 'grace@example.com', status: 'pending', created: '2024-01-21', amount: 1800.00 },
  { id: 8, name: 'Henry Chen', email: 'henry@example.com', status: 'active', created: '2024-01-22', amount: 920.00 },
]
const columns = ['id', 'name', 'email', 'status', 'created', 'amount']

const fullSchemaData = [
  { 
    name: 'trino', type: 'connector', expanded: false, children: [
      { name: 'memory', type: 'catalog', expanded: false, children: [
        { name: 'information_schema', type: 'schema', expanded: false, children: [
          { name: 'tables', type: 'table', expanded: false, children: [{ name: 'table_name', type: 'column', colType: 'varchar' }, { name: 'table_schema', type: 'column', colType: 'varchar' }] },
          { name: 'columns', type: 'table', expanded: false, children: [{ name: 'column_name', type: 'column', colType: 'varchar' }, { name: 'data_type', type: 'column', colType: 'varchar' }] }
        ]},
        { name: 'tpch', type: 'schema', expanded: false, children: [
          { name: 'orders', type: 'table', expanded: false, children: [{ name: 'orderkey', type: 'column', colType: 'bigint' }, { name: 'custkey', type: 'column', colType: 'bigint' }, { name: 'orderstatus', type: 'column', colType: 'char' }] },
          { name: 'lineitem', type: 'table', expanded: false, children: [{ name: 'orderkey', type: 'column', colType: 'bigint' }, { name: 'partkey', type: 'column', colType: 'bigint' }] },
          { name: 'customer', type: 'table', expanded: false, children: [{ name: 'custkey', type: 'column', colType: 'bigint' }, { name: 'name', type: 'column', colType: 'varchar' }] }
        ]},
        { name: 'postgres', type: 'schema', expanded: false, children: [
          { name: 'users', type: 'table', expanded: false, children: [{ name: 'id', type: 'column', colType: 'integer' }, { name: 'username', type: 'column', colType: 'varchar' }] },
          { name: 'orders', type: 'table', expanded: false, children: [{ name: 'id', type: 'column', colType: 'integer' }, { name: 'user_id', type: 'column', colType: 'integer' }] }
        ]}
      ]},
      { name: 'hive', type: 'catalog', expanded: false, children: [
        { name: 'default', type: 'schema', expanded: false, children: [
          { name: 'sales', type: 'table', expanded: false, children: [{ name: 'id', type: 'column', colType: 'bigint' }, { name: 'amount', type: 'column', colType: 'decimal' }] },
          { name: 'analytics', type: 'table', expanded: false, children: [{ name: 'event', type: 'column', colType: 'varchar' }, { name: 'timestamp', type: 'column', colType: 'timestamp' }] }
        ]}
      ]}
    ]
  },
  { 
    name: 'postgres', type: 'connector', expanded: false, children: [
      { name: 'postgresql', type: 'catalog', expanded: false, children: [
        { name: 'public', type: 'schema', expanded: false, children: [
          { name: 'employees', type: 'table', expanded: false, children: [{ name: 'id', type: 'column', colType: 'serial' }, { name: 'name', type: 'column', colType: 'varchar' }, { name: 'department', type: 'column', colType: 'varchar' }] }
        ]}
      ]}
    ]
  },
  { 
    name: 'mysql', type: 'connector', expanded: false, children: [
      { name: 'mysql', type: 'catalog', expanded: false, children: [
        { name: 'app', type: 'schema', expanded: false, children: [
          { name: 'transactions', type: 'table', expanded: false, children: [{ name: 'id', type: 'column', colType: 'int' }, { name: 'amount', type: 'column', colType: 'decimal' }] }
        ]}
      ]}
    ]
  }
]

const flatSchemaData = [
  { name: 'memory', type: 'catalog', expanded: false, children: [
    { name: 'information_schema', type: 'schema', expanded: false, children: [{ name: 'tables', type: 'table', children: [] }, { name: 'columns', type: 'table', children: [] }] },
    { name: 'tpch', type: 'schema', expanded: false, children: [{ name: 'orders', type: 'table', children: [] }, { name: 'lineitem', type: 'table', children: [] }, { name: 'customer', type: 'table', children: [] }] },
    { name: 'postgres', type: 'schema', expanded: false, children: [{ name: 'users', type: 'table', children: [] }, { name: 'orders', type: 'table', children: [] }] }
  ]},
  { name: 'hive', type: 'catalog', expanded: false, children: [
    { name: 'default', type: 'schema', expanded: false, children: [{ name: 'sales', type: 'table', children: [] }, { name: 'analytics', type: 'table', children: [] }] }
  ]},
  { name: 'postgres', type: 'catalog', expanded: false, children: [
    { name: 'public', type: 'schema', expanded: false, children: [{ name: 'employees', type: 'table', children: [] }] }
  ]},
  { name: 'mysql', type: 'catalog', expanded: false, children: [
    { name: 'app', type: 'schema', expanded: false, children: [{ name: 'transactions', type: 'table', children: [] }] }
  ]}
]

interface QueryTab { id: number; name: string; query: string; results: any[]; isRunning: boolean; completed: boolean }
interface TreeNode { name: string; type: string; expanded?: boolean; children?: TreeNode[]; colType?: string }

export const NotebookIDE = () => {
  const [darkMode, setDarkMode] = useState(false)
  const [tabs, setTabs] = useState<QueryTab[]>([{ id: 1, name: 'Query 1', query: 'SELECT * FROM orders LIMIT 10', results: [], isRunning: false, completed: false }])
  const [activeTabId, setActiveTabId] = useState(1)
  const [showInspector, setShowInspector] = useState(true)
  const [showAnalytics, setShowAnalytics] = useState(false)
  const [showTableSelect, setShowTableSelect] = useState(false)
  const [connectorMode, setConnectorMode] = useState(true)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [schemaSearch, setSchemaSearch] = useState('')

  const colors = darkMode ? darkColors : lightColors

  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0]

  const handleTabChange = (id: number) => setActiveTabId(id)
  const addNewTab = () => { const n = Math.max(...tabs.map(t => t.id)) + 1; setTabs([...tabs, { id: n, name: `Query ${n}`, query: 'SELECT * FROM ', results: [], isRunning: false, completed: false }]); setActiveTabId(n) }
  const closeTab = (id: number) => { if (tabs.length === 1) return; const n = tabs.filter(t => t.id !== id); setTabs(n); if (activeTabId === id) setActiveTabId(n[0].id) }
  const updateQuery = (q: string) => setTabs(tabs.map(t => t.id === activeTabId ? { ...t, query: q } : t))

  const handleRunQuery = useCallback(() => {
    setTabs(tabs.map(t => t.id === activeTabId ? { ...t, isRunning: true } : t))
    setTimeout(() => setTabs(tabs.map(t => t.id === activeTabId ? { ...t, isRunning: false, results: sampleData, completed: true } : t)), 600)
  }, [activeTabId, tabs])

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

  const renderTree = (nodes: TreeNode[], level = 0) => nodes.map(node => {
    const path = node.name
    const isExpanded = expanded[path]
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
      <Box key={path}>
        <TreeItem level={level} onClick={() => hasChildren && toggleExpand(path)}>
          <TreeIcon>
            {hasChildren ? (isExpanded ? <ExpandMoreIcon sx={{ fontSize: 12 }} /> : <ChevronRightIcon sx={{ fontSize: 12 }} />) : null}
          </TreeIcon>
          <TreeIcon>{getIcon(node.type)}</TreeIcon>
          <span style={{ fontWeight: node.type === 'connector' || node.type === 'catalog' ? 600 : 400 }}>
            {node.name}
          </span>
          {node.type === 'column' && node.colType && <ColumnType>{node.colType}</ColumnType>}
        </TreeItem>
        {isExpanded && node.children?.map(child => renderTree([child], level + 1))}
      </Box>
    )
  })

  const schemaData = connectorMode ? fullSchemaData : flatSchemaData

  const sparkData = [30, 45, 60, 40, 70, 55, 80, 65, 75, 50, 85, 70]
  const histData = [20, 35, 45, 60, 55, 70, 45, 30, 25, 15, 20, 10]

  const allTables = schemaData.flatMap((node: any) => {
    if (node.type === 'catalog') {
      return node.children?.flatMap((sch: any) => 
        sch.children?.filter((t: any) => t.type === 'table').map((tbl: any) => `${node.name}.${sch.name}.${tbl.name}`) || []
      ) || []
    }
    return node.children?.flatMap((cat: any) => 
      cat.children?.flatMap((sch: any) => 
        sch.children?.filter((t: any) => t.type === 'table').map((tbl: any) => `${node.name}.${cat.name}.${sch.name}.${tbl.name}`) || []
      ) || []
    ) || []
  })

  React.useEffect(() => {
    if (schemaSearch) {
      const newExpanded: Record<string, boolean> = {}
      const markExpanded = (nodes: TreeNode[]) => {
        nodes.forEach(node => {
          newExpanded[node.name] = true
          if (node.children) markExpanded(node.children)
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
              <ToggleSwitch onClick={() => setConnectorMode(!connectorMode)}>
                {connectorMode ? <ToggleOnIcon sx={{ fontSize: 12, color: colors.primary }} /> : <ToggleOffIcon sx={{ fontSize: 12 }} />}
                <span>Connector</span>
              </ToggleSwitch>
            </SidebarTitle>
            <IconBtn size="small"><RefreshIcon sx={{ fontSize: 12 }} /></IconBtn>
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
              <span>memory</span><span>›</span><span>tpch</span>
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
                {activeTab.isRunning ? <><LinearProgress sx={{ width: 40, height: 3 }} /><span>Running...</span></> : activeTab.completed ? <><StatusDot /><span>642ms</span></> : <span>Ready</span>}
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
            {activeTab.results.length > 0 && (
              <CellResults>
                <ResultsTable>
                  <TableHead>
                    <TableRow>
                      {columns.map(c => <TableCell key={c}>{c}</TableCell>)}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {activeTab.results.map((row, i) => (
                      <TableRow key={i}>
                        {columns.map(c => (
                          <TableCell key={c}>
                            {c === 'status' ? (
                              <Chip 
                                label={row[c]} 
                                size="small" 
                                sx={{ 
                                  height: 14, 
                                  fontSize: 8, 
                                  backgroundColor: row[c] === 'active' ? '#D1FAE5' : row[c] === 'pending' ? '#FEF3C7' : '#FEE2E2', 
                                  color: row[c] === 'active' ? '#065F46' : row[c] === 'pending' ? '#92400E' : '#991B1B' 
                                }} 
                              />
                            ) : row[c]}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </ResultsTable>
                <ResultFooter>
                  <span>{activeTab.results.length} rows</span>
                  <span>0.64s</span>
                </ResultFooter>
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
          <span style={{ margin: '0 8px' }}>|</span>
          <span>memory</span>
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
            <AnalyticsCard><AnalyticsTitle>Stats</AnalyticsTitle><InspectorRow><InspectorLabel>Min</InspectorLabel><InspectorValue>$450</InspectorValue></InspectorRow><InspectorRow><InspectorLabel>Max</InspectorLabel><InspectorValue>$3,200</InspectorValue></InspectorRow><InspectorRow><InspectorLabel>Avg</InspectorLabel><InspectorValue>$1,395</InspectorValue></InspectorRow></AnalyticsCard>
            <AnalyticsCard><AnalyticsTitle>Summary</AnalyticsTitle><InspectorRow><InspectorLabel>Status</InspectorLabel><InspectorValue style={{ color: colors.success }}>✓ Success</InspectorValue></InspectorRow><InspectorRow><InspectorLabel>Time</InspectorLabel><InspectorValue>642ms</InspectorValue></InspectorRow><InspectorRow><InspectorLabel>Memory</InspectorLabel><InspectorValue>2.4MB</InspectorValue></InspectorRow></AnalyticsCard>
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

export default NotebookIDE
