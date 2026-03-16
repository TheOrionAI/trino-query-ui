import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import Editor, { loader } from '@monaco-editor/react'
import TrinoQueryRunner from './AsyncTrinoClient'
import QueryCharts from './QueryCharts'

// ── Types ────────────────────────────────────────────────────────────────────

interface Column { name: string; type: string }
interface QueryTab {
  id: number; name: string; sql: string
  columns: Column[]; rows: any[][]
  isRunning: boolean; completed: boolean
  error?: string; execMs?: number
  queryId?: string; explainPlan?: string
  totalRowCount?: number        // actual rows from server (may exceed displayed rows)
  savedFile?: string            // filename if Run & Download was used
}
type RunMode = 'limit1000' | 'nolimit' | 'download'
interface HistoryEntry {
  id: number; sql: string; execMs: number
  rowCount: number; success: boolean; ts: Date
}
interface TreeNode {
  name: string; type: 'catalog' | 'schema' | 'table'; children?: TreeNode[]
}
type ThemeMode = 'dark' | 'light' | 'auto'

// ── Theme ────────────────────────────────────────────────────────────────────

const DARK = {
  bg0:         '#090f1d',   // editor bg + active tab bg — must stay in sync with Monaco theme
  bg1:         '#0d1526',   // header, sidebar, toolbars
  bg2:         '#121c30',   // inactive tab bg (visually distinct from editor)
  bg3:         '#192840',   // hover / active row
  tabTray:     '#050b18',   // tab bar tray (darkest strip)
  border:      '#1b2d46',
  borderStrong:'#253a56',
  accent:      '#4a8fff',
  purple:      '#9b78ff',
  green:       '#22d18a',
  red:         '#ff5c6a',
  amber:       '#f59e0b',
  text0:       '#dde6f0',
  text1:       '#7d96b0',
  text2:       '#3a5370',
}

const LIGHT = {
  bg0:         '#f4f6fb',   // editor bg + active tab bg
  bg1:         '#ffffff',   // header, sidebar
  bg2:         '#e8ecf5',   // inactive tab bg
  bg3:         '#dde3f0',   // hover
  tabTray:     '#dce1ed',   // tray (darkest in light)
  border:      '#cdd5e4',
  borderStrong:'#b0bcce',
  accent:      '#2563eb',
  purple:      '#7c3aed',
  green:       '#16a34a',
  red:         '#dc2626',
  amber:       '#d97706',
  text0:       '#0e1929',
  text1:       '#4a5b6f',
  text2:       '#8fa3b8',
}

type T = typeof DARK
const THEME_NEXT: Record<ThemeMode, ThemeMode> = { dark: 'light', light: 'auto', auto: 'dark' }
const THEME_ICON: Record<ThemeMode, string> = { dark: '🌙', light: '☀', auto: '⊙' }
const THEME_TIP:  Record<ThemeMode, string> = { dark: 'Dark mode', light: 'Light mode', auto: 'Auto (time-based)' }

// ── Register Monaco themes — bg must match DARK.bg0 / LIGHT.bg0 exactly ─────

loader.init().then(monaco => {
  monaco.editor.defineTheme('studio-dark', {
    base: 'vs-dark', inherit: true, rules: [],
    colors: {
      'editor.background':                '#090f1d',
      'editor.lineHighlightBackground':   '#111e3380',
      'editorLineNumber.foreground':      '#213250',
      'editorLineNumber.activeForeground':'#4a6a90',
      'editorCursor.foreground':          '#4a8fff',
      'editor.selectionBackground':       '#4a8fff30',
      'editorIndentGuide.background1':    '#1c2e4860',
      'editorWidget.background':          '#0d1526',
      'editorSuggestWidget.background':   '#0d1526',
      'editorSuggestWidget.border':       '#253a56',
      'editorSuggestWidget.selectedBackground': '#192840',
    },
  })
  monaco.editor.defineTheme('studio-light', {
    base: 'vs', inherit: true, rules: [],
    colors: {
      'editor.background':                '#f4f6fb',
      'editor.lineHighlightBackground':   '#e8ecf580',
      'editorLineNumber.foreground':      '#b0bdd0',
      'editorLineNumber.activeForeground':'#6a7a90',
      'editorCursor.foreground':          '#2563eb',
      'editor.selectionBackground':       '#2563eb22',
      'editorWidget.background':          '#ffffff',
      'editorSuggestWidget.background':   '#ffffff',
      'editorSuggestWidget.border':       '#cdd5e4',
      'editorSuggestWidget.selectedBackground': '#e8ecf5',
    },
  })
})

// ── SVG Icons ─────────────────────────────────────────────────────────────────

const IcoChevronRight = () => (
  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3,2 7,5 3,8" />
  </svg>
)
const IcoChevronDown = () => (
  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="2,3.5 5,7 8,3.5" />
  </svg>
)
const IcoCatalog = ({ c }: { c: string }) => (
  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke={c} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <ellipse cx="8" cy="4.5" rx="5.5" ry="2" />
    <path d="M2.5 4.5v7c0 1.1 2.46 2 5.5 2s5.5-.9 5.5-2v-7" />
    <path d="M2.5 8c0 1.1 2.46 2 5.5 2s5.5-.9 5.5-2" />
  </svg>
)
const IcoFolderOpen = ({ c }: { c: string }) => (
  <svg width="13" height="13" viewBox="0 0 16 16" fill={c + '22'} stroke={c} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 5h4.5l1.5 1.5h8v7.5H1z" />
    <path d="M1 5V3h4l1.5 1.5" strokeOpacity="0.5" />
  </svg>
)
const IcoFolderClosed = ({ c }: { c: string }) => (
  <svg width="13" height="13" viewBox="0 0 16 16" fill={c + '22'} stroke={c} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 3h4.5l1.5 2H15v9H1z" />
  </svg>
)
const IcoTable = ({ c }: { c: string }) => (
  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke={c} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1.5" y="1.5" width="13" height="13" rx="1.5" />
    <line x1="1.5" y1="5.5" x2="14.5" y2="5.5" />
    <line x1="6" y1="5.5" x2="6" y2="14.5" />
  </svg>
)
const IcoSearch = ({ c }: { c: string }) => (
  <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round">
    <circle cx="6" cy="6" r="4.5" /><line x1="9.5" y1="9.5" x2="13" y2="13" />
  </svg>
)

// ── Utils ────────────────────────────────────────────────────────────────────

function runSimpleQuery(sql: string): Promise<any[][]> {
  return new Promise(resolve => {
    const r = new TrinoQueryRunner()
    r.SetAllResultsCallback((rows: any[][], err: any) => resolve(err ? [] : rows))
    r.SetErrorMessageCallback(() => resolve([]))
    r.SetStopped = () => {}; r.SetStarted = () => {}
    r.StartQuery(sql)
  })
}

function typeColor(type: string): string {
  const u = (type ?? '').toUpperCase()
  if (u.includes('CHAR') || u.includes('TEXT') || u.includes('STRING')) return '#60a5fa'
  if (u.includes('INT') || u.includes('BIGINT') || u.includes('LONG') || u.includes('SHORT')) return '#fbbf24'
  if (u.includes('FLOAT') || u.includes('DOUBLE') || u.includes('DECIMAL') || u.includes('NUMERIC') || u.includes('REAL')) return '#a78bfa'
  if (u.includes('DATE') || u.includes('TIME') || u.includes('STAMP')) return '#34d399'
  if (u.includes('BOOL')) return '#fb7185'
  return '#8da0b8'
}

function fmtMs(ms: number): string {
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`
}

function fmtRows(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n)
}

function exportCSV(columns: Column[], rows: any[][]): void {
  const header = columns.map(c => JSON.stringify(c.name)).join(',')
  const body = rows.map(r => r.map(v => JSON.stringify(v ?? '')).join(',')).join('\n')
  const blob = new Blob([header + '\n' + body], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = `query-${Date.now()}.csv`; a.click()
  URL.revokeObjectURL(url)
}

// ── Component ─────────────────────────────────────────────────────────────────

let _tabSeq = 1
let _histSeq = 0

export const QueryStudio: React.FC = () => {
  const [themeMode, setThemeMode] = useState<ThemeMode>('dark')
  const [tick, setTick] = useState(0)           // increments every minute in auto mode

  // Derive isDark from mode + time
  const isDark = useMemo(() => {
    if (themeMode === 'dark')  return true
    if (themeMode === 'light') return false
    const h = new Date().getHours()
    return h < 7 || h >= 19                       // dark from 7 PM to 7 AM
  }, [themeMode, tick])

  const t: T = isDark ? DARK : LIGHT
  const MONO = '"JetBrains Mono","Fira Code","Cascadia Code",monospace'
  const SANS = '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif'

  // Tick every minute when in auto mode so the theme re-evaluates at boundary
  useEffect(() => {
    if (themeMode !== 'auto') return
    const id = setInterval(() => setTick(n => n + 1), 60_000)
    return () => clearInterval(id)
  }, [themeMode])

  const cycleTheme = () => setThemeMode(m => THEME_NEXT[m])

  const [tabs, setTabs] = useState<QueryTab[]>([{
    id: 1, name: 'Query 1', sql: 'SELECT * FROM tpch.sf1.nation LIMIT 10',
    columns: [], rows: [], isRunning: false, completed: false,
  }])
  const [activeId, setActiveId]   = useState(1)
  const [renamingId, setRenamingId] = useState<number | null>(null)
  const [renameDraft, setRenameDraft] = useState('')
  const [sideTab, setSideTab]     = useState<'schema' | 'history'>('schema')
  const [schemaSearch, setSchemaSearch] = useState('')
  const [schemaTree, setSchemaTree] = useState<TreeNode[]>([])
  const [expanded, setExpanded]   = useState<Record<string, boolean>>({})
  const [schemaLoading, setSchemaLoading] = useState(false)
  const [history, setHistory]     = useState<HistoryEntry[]>([])
  const [resultView, setResultView] = useState<'table' | 'chart' | 'explain'>('table')
  const [splitPct, setSplitPct]   = useState(42)
  const [palette, setPalette]     = useState(false)
  const [paletteSearch, setPaletteSearch] = useState('')
  const [elapsed, setElapsed]     = useState(0)

  const [runMenuOpen, setRunMenuOpen]           = useState(false)
  const [selectedRunMode, setSelectedRunMode]   = useState<RunMode>('limit1000')
  const [dlModal, setDlModal]                   = useState(false)
  const [dlFilename, setDlFilename]             = useState('')

  const isDragging     = useRef(false)
  const centerRef      = useRef<HTMLDivElement>(null)
  const tabScrollRef   = useRef<HTMLDivElement>(null)
  const runMenuRef     = useRef<HTMLDivElement>(null)
  const dlInputRef     = useRef<HTMLInputElement>(null)
  const paletteInputRef = useRef<HTMLInputElement>(null)
  const timerRef       = useRef<ReturnType<typeof setInterval> | null>(null)
  const startMsRef     = useRef(0)
  const runnerRef      = useRef<TrinoQueryRunner | null>(null)
  const handleRunRef   = useRef<() => void>(() => {})

  const [tabsOverflow, setTabsOverflow] = useState(false)

  const activeTab = tabs.find(tab => tab.id === activeId) ?? tabs[0]
  const anyRunning = tabs.some(tab => tab.isRunning)

  // ── Schema ──────────────────────────────────────────────────────────────
  const loadSchema = useCallback(async () => {
    setSchemaLoading(true)
    try {
      const cats = (await runSimpleQuery('SHOW CATALOGS')).map(r => String(r[0]))
      const tree: TreeNode[] = []
      for (const cat of cats) {
        const schemas = (await runSimpleQuery(`SHOW SCHEMAS FROM ${cat}`))
          .map(r => String(r[0])).filter(s => s !== 'information_schema')
        const schemaNodes: TreeNode[] = []
        for (const schema of schemas) {
          const tables = (await runSimpleQuery(`SHOW TABLES FROM ${cat}.${schema}`))
            .map(r => String(r[0]))
          schemaNodes.push({ name: schema, type: 'schema', children: tables.map(n => ({ name: n, type: 'table' as const })) })
        }
        tree.push({ name: cat, type: 'catalog', children: schemaNodes })
      }
      setSchemaTree(tree)
    } catch (e) { console.error('Schema load failed', e) }
    finally { setSchemaLoading(false) }
  }, [])

  useEffect(() => { loadSchema() }, [loadSchema])

  // ── Drag split ───────────────────────────────────────────────────────────
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!isDragging.current || !centerRef.current) return
      const r = centerRef.current.getBoundingClientRect()
      setSplitPct(Math.max(18, Math.min(78, ((e.clientY - r.top) / r.height) * 100)))
    }
    const onUp = () => { isDragging.current = false }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [])

  // ── Helpers ───────────────────────────────────────────────────────────────
  /**
   * Enforce a maximum row limit.
   * - No LIMIT in the query  → append LIMIT max
   * - LIMIT present and ≤ max → keep it unchanged
   * - LIMIT present and > max → clamp it down to max
   */
  function enforceMaxLimit(sql: string, max: number): string {
    const s = sql.replace(/;\s*$/, '').trimEnd()
    const m = s.match(/\bLIMIT\s+(\d+)/i)
    if (m) {
      const existing = parseInt(m[1], 10)
      if (existing <= max) return s                         // already within budget
      return s.replace(/\bLIMIT\s+\d+/i, `LIMIT ${max}`)  // clamp down
    }
    return `${s}\nLIMIT ${max}`
  }

  /** Shared query startup bookkeeping */
  function startQueryState(tabId: number, sql: string) {
    setTabs(prev => prev.map(tab =>
      tab.id === tabId
        ? { ...tab, isRunning: true, completed: false, error: undefined,
            rows: [], columns: [], queryId: undefined, explainPlan: undefined,
            totalRowCount: undefined, savedFile: undefined }
        : tab
    ))
    setResultView('table')
    startMsRef.current = Date.now(); setElapsed(0)
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => setElapsed(Date.now() - startMsRef.current), 100)
  }

  // ── Run (limit 1000 or no-limit) ──────────────────────────────────────────
  const handleRun = useCallback((mode: RunMode = 'limit1000') => {
    const rawSql = activeTab.sql.trim()
    if (!rawSql || activeTab.isRunning) return
    const sql = mode === 'limit1000' ? enforceMaxLimit(rawSql, 1000) : rawSql
    const tabId = activeId
    startQueryState(tabId, sql)
    const wallMs = Date.now()
    const runner = new TrinoQueryRunner(); runnerRef.current = runner
    runner.SetStatusCallback((state: any) => {
      if (state.id) setTabs(prev => prev.map(tab => tab.id === tabId && !tab.queryId ? { ...tab, queryId: state.id } : tab))
    })
    runner.SetColumns = (cols: any[]) => {
      setTabs(prev => prev.map(tab => tab.id === tabId ? { ...tab, columns: cols } : tab))
    }
    runner.SetAllResultsCallback((rows: any[][], error: any) => {
      const execMs = Date.now() - wallMs
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
      // For nolimit mode show only first 1000 rows in the UI
      const display = mode === 'nolimit' ? rows.slice(0, 1000) : rows
      setTabs(prev => prev.map(tab => tab.id === tabId
        ? { ...tab, isRunning: false, completed: !error, rows: error ? [] : display,
            execMs, totalRowCount: error ? 0 : rows.length }
        : tab))
      setHistory(prev => [{ id: ++_histSeq, sql: rawSql, execMs, rowCount: error ? 0 : rows.length, success: !error, ts: new Date() }, ...prev.slice(0, 49)])
    })
    runner.SetErrorMessageCallback((msg: string) => {
      const execMs = Date.now() - wallMs
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
      setTabs(prev => prev.map(tab => tab.id === tabId ? { ...tab, isRunning: false, error: msg, execMs } : tab))
      setHistory(prev => [{ id: ++_histSeq, sql: rawSql, execMs, rowCount: 0, success: false, ts: new Date() }, ...prev.slice(0, 49)])
    })
    runner.SetStopped = () => { runnerRef.current = null }
    runner.StartQuery(sql)
  }, [activeId, activeTab.sql, activeTab.isRunning])

  // ── Run & Download ────────────────────────────────────────────────────────
  // filename : used for the blob download filename (modal fallback path)
  // fileHandle: if provided (native picker path), stream directly to disk
  const handleRunDownload = useCallback(async (filename: string, fileHandle?: any) => {
    const rawSql = activeTab.sql.trim()
    if (!rawSql || activeTab.isRunning) return

    const tabId = activeId
    startQueryState(tabId, rawSql)
    const wallMs = Date.now()
    let capturedCols: Column[] = []
    const runner = new TrinoQueryRunner(); runnerRef.current = runner

    runner.SetStatusCallback((state: any) => {
      if (state.id) setTabs(prev => prev.map(tab => tab.id === tabId && !tab.queryId ? { ...tab, queryId: state.id } : tab))
    })
    runner.SetColumns = (cols: any[]) => {
      capturedCols = cols
      setTabs(prev => prev.map(tab => tab.id === tabId ? { ...tab, columns: cols } : tab))
    }
    runner.SetAllResultsCallback(async (rows: any[][], error: any) => {
      const execMs = Date.now() - wallMs
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }

      let savedFile: string | undefined
      if (!error) {
        try {
          const headerLine = capturedCols.map(c => JSON.stringify(c.name)).join(',') + '\r\n'
          const rowToCsv = (row: any[]) =>
            row.map(v => v === null || v === undefined ? '' : JSON.stringify(String(v))).join(',')

          if (fileHandle) {
            // Stream chunks directly to disk via File System Access API
            const writable = await fileHandle.createWritable()
            const enc = new TextEncoder()
            await writable.write(enc.encode(headerLine))
            const CHUNK = 500
            for (let i = 0; i < rows.length; i += CHUNK) {
              const chunk = rows.slice(i, i + CHUNK).map(rowToCsv).join('\r\n') + '\r\n'
              await writable.write(enc.encode(chunk))
            }
            await writable.close()
            savedFile = fileHandle.name
          } else {
            // Blob fallback — works in Firefox, Safari, and all Chromium variants
            const body = rows.map(rowToCsv).join('\r\n')
            const blob = new Blob([headerLine + body], { type: 'text/csv;charset=utf-8;' })
            const url  = URL.createObjectURL(blob)
            const a    = document.createElement('a')
            a.href = url; a.download = filename
            document.body.appendChild(a); a.click()
            document.body.removeChild(a); URL.revokeObjectURL(url)
            savedFile = filename
          }
        } catch (e) {
          console.error('Download failed:', e)
        }
      }

      const display = rows.slice(0, 1000)
      setTabs(prev => prev.map(tab => tab.id === tabId
        ? { ...tab, isRunning: false, completed: !error, rows: error ? [] : display,
            execMs, totalRowCount: error ? 0 : rows.length, savedFile }
        : tab))
      setHistory(prev => [{ id: ++_histSeq, sql: rawSql, execMs, rowCount: error ? 0 : rows.length, success: !error, ts: new Date() }, ...prev.slice(0, 49)])
    })
    runner.SetErrorMessageCallback((msg: string) => {
      const execMs = Date.now() - wallMs
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
      setTabs(prev => prev.map(tab => tab.id === tabId ? { ...tab, isRunning: false, error: msg, execMs } : tab))
      setHistory(prev => [{ id: ++_histSeq, sql: rawSql, execMs, rowCount: 0, success: false, ts: new Date() }, ...prev.slice(0, 49)])
    })
    runner.SetStopped = () => { runnerRef.current = null }
    runner.StartQuery(rawSql)
  }, [activeId, activeTab.sql, activeTab.isRunning])

  // ── Trigger download: native Save As picker → fallback modal ────────────
  // showSaveFilePicker MUST be the first `await` in an async function to
  // preserve the browser's transient user-activation context.  Any await
  // before it (or calling it via .then() off a sync function) can drop the
  // activation token in some Chrome builds.
  const startDownloadRef = useRef<() => void>(() => {})

  // Keep a stable ref so keyboard handler always calls the latest version
  useEffect(() => {
    handleRunRef.current = () => {
      if (selectedRunMode === 'download') startDownloadRef.current()
      else handleRun(selectedRunMode)
    }
  }, [handleRun, selectedRunMode])

  // Auto-focus the filename input when the download dialog opens
  useEffect(() => {
    if (dlModal) setTimeout(() => dlInputRef.current?.focus(), 40)
  }, [dlModal])
  const handleCancel = () => runnerRef.current?.CancelQuery('User cancelled')

  // ── Close run menu on outside click ──────────────────────────────────────
  useEffect(() => {
    if (!runMenuOpen) return
    const handler = (e: MouseEvent) => {
      if (runMenuRef.current && !runMenuRef.current.contains(e.target as Node))
        setRunMenuOpen(false)
    }
    window.addEventListener('mousedown', handler)
    return () => window.removeEventListener('mousedown', handler)
  }, [runMenuOpen])

  // ── Explain ───────────────────────────────────────────────────────────────
  const fetchExplain = useCallback(async (tab: QueryTab) => {
    if (!tab.queryId || tab.explainPlan) return
    try {
      const res = await fetch(`/v1/query/${tab.queryId}/explain`)
      if (res.ok) {
        const json = await res.json()
        setTabs(prev => prev.map(t => t.id === tab.id ? { ...t, explainPlan: json.plan ?? 'No plan available' } : t))
      }
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    if (resultView === 'explain' && activeTab.queryId && !activeTab.explainPlan) fetchExplain(activeTab)
  }, [resultView, activeTab, fetchExplain])

  // ── Keyboard ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.key === 'Enter') { e.preventDefault(); handleRunRef.current() }
      if (mod && e.key === 'k')     { e.preventDefault(); setPalette(true) }
      if (e.key === 'Escape')       { setPalette(false); setRenamingId(null) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => { if (palette) setTimeout(() => paletteInputRef.current?.focus(), 40) }, [palette])

  // ── Tab overflow detection ────────────────────────────────────────────────
  // Re-check every time tabs array changes (wait one frame for DOM to update)
  useEffect(() => {
    requestAnimationFrame(() => {
      const el = tabScrollRef.current
      if (el) setTabsOverflow(el.scrollWidth > el.clientWidth)
    })
  }, [tabs])
  // Re-check when the container itself resizes (window resize, sidebar toggle…)
  useEffect(() => {
    const el = tabScrollRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setTabsOverflow(el.scrollWidth > el.clientWidth))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // ── Tab management ────────────────────────────────────────────────────────
  const addTab = () => {
    const id = ++_tabSeq
    setTabs(prev => [...prev, { id, name: `Query ${id}`, sql: 'SELECT ', columns: [], rows: [], isRunning: false, completed: false }])
    setActiveId(id)
  }
  const closeTab = (id: number, e: React.MouseEvent) => {
    e.stopPropagation()
    if (tabs.length === 1) return
    const next = tabs.filter(tab => tab.id !== id)
    setTabs(next)
    if (activeId === id) setActiveId(next[next.length - 1].id)
  }
  const updateSql = (sql: string) => setTabs(prev => prev.map(tab => tab.id === activeId ? { ...tab, sql } : tab))
  const commitRename = () => {
    if (renamingId) setTabs(prev => prev.map(tab => tab.id === renamingId ? { ...tab, name: renameDraft || tab.name } : tab))
    setRenamingId(null)
  }

  // ── Tree helpers ───────────────────────────────────────────────────────────
  const toggleExpand = (key: string) => setExpanded(prev => ({ ...prev, [key]: !prev[key] }))
  const insertTable = (qualified: string) => {
    setTabs(prev => prev.map(tab => tab.id === activeId ? { ...tab, sql: `SELECT * FROM ${qualified} LIMIT 100` } : tab))
    setPalette(false); setPaletteSearch('')
  }

  const allTables = useMemo(() =>
    schemaTree.flatMap(cat => (cat.children ?? []).flatMap(schema =>
      (schema.children ?? []).map(tbl => `${cat.name}.${schema.name}.${tbl.name}`)
    )), [schemaTree]
  )
  const filteredTables = useMemo(() =>
    allTables.filter(tbl => tbl.toLowerCase().includes(paletteSearch.toLowerCase())),
    [allTables, paletteSearch]
  )
  const breadcrumb = useMemo(() => {
    const m = activeTab.sql.match(/\bfrom\s+([a-z_][a-z0-9_]*)\.([a-z_][a-z0-9_]*)\./i)
    return m ? { catalog: m[1], schema: m[2] } : null
  }, [activeTab.sql])

  // ── Tree renderer ─────────────────────────────────────────────────────────
  const renderTree = (nodes: TreeNode[], depth = 0, prefix = ''): React.ReactNode =>
    nodes.map(node => {
      const key = prefix ? `${prefix}.${node.name}` : node.name
      const isExp = !!expanded[key]
      const hasKids = !!(node.children?.length)
      const lo = schemaSearch.toLowerCase()
      const selfMatch = !lo || node.name.toLowerCase().includes(lo)
      const childMatch = (n: TreeNode): boolean =>
        n.name.toLowerCase().includes(lo) || (n.children ?? []).some(childMatch)
      if (!selfMatch && !(node.children ?? []).some(childMatch)) return null

      const nodeColor = depth === 0 ? t.accent : depth === 1 ? t.purple : t.text1
      const INDENT = 16
      const LEFT_PAD = 10 + depth * INDENT

      return (
        <div key={key}>
          <div
            onClick={() => node.type === 'table' ? insertTable(key) : hasKids && toggleExpand(key)}
            title={node.type === 'table' ? `SELECT * FROM ${key} LIMIT 100` : undefined}
            style={{ display: 'flex', alignItems: 'center', height: 26, paddingLeft: LEFT_PAD, paddingRight: 10, cursor: 'pointer', userSelect: 'none', fontSize: 12.5, fontWeight: depth === 0 ? 600 : 400, color: depth < 2 ? t.text0 : t.text1, gap: 5, transition: 'background 0.1s' }}
            onMouseEnter={e => (e.currentTarget.style.background = t.bg3)}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <span style={{ width: 14, height: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: t.text2 }}>
              {hasKids && (isExp ? <IcoChevronDown /> : <IcoChevronRight />)}
            </span>
            {depth === 0 && <IcoCatalog c={nodeColor} />}
            {depth === 1 && (isExp ? <IcoFolderOpen c={nodeColor} /> : <IcoFolderClosed c={nodeColor} />)}
            {depth === 2 && <IcoTable c={nodeColor} />}
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{node.name}</span>
          </div>
          {isExp && hasKids && (
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', left: LEFT_PAD + 6, top: 0, bottom: 4, width: 1, background: t.border, pointerEvents: 'none' }} />
              {renderTree(node.children!, depth + 1, key)}
            </div>
          )}
        </div>
      )
    })

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div style={{ height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column', background: t.bg0, color: t.text0, fontFamily: SANS, overflow: 'hidden', transition: 'background 0.3s, color 0.2s' }}>

      {/* ══ TOP PROGRESS BAR — visible when any query is running ══════════ */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, height: 2, zIndex: 9998,
        opacity: anyRunning ? 1 : 0,
        transition: 'opacity 0.4s',
        background: `linear-gradient(90deg, transparent 0%, ${t.accent} 30%, ${t.purple} 60%, ${t.accent} 80%, transparent 100%)`,
        backgroundSize: '200% 100%',
        animation: anyRunning ? 'progress-sweep 1.8s linear infinite' : 'none',
      }} />

      {/* ══ HEADER ════════════════════════════════════════════════════════ */}
      <div style={{
        height: 44, flexShrink: 0,
        background: isDark
          ? `linear-gradient(180deg, #0f1d35 0%, ${t.bg1} 100%)`
          : `linear-gradient(180deg, #ffffff 0%, ${t.bg1} 100%)`,
        borderBottom: `1px solid ${t.border}`,
        display: 'flex', alignItems: 'center', padding: '0 14px', gap: 10,
        transition: 'background 0.3s, border-color 0.2s',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingRight: 14, borderRight: `1px solid ${t.border}`, flexShrink: 0, transition: 'border-color 0.2s' }}>
          <span style={{ fontSize: 18, filter: 'drop-shadow(0 0 6px #4a8fff80)' }}>⚡</span>
          <span style={{ fontSize: 13.5, fontWeight: 700, letterSpacing: '-0.02em' }}>
            Rusty<span style={{ color: t.accent }}>Trino</span>
          </span>
          <span style={{ fontSize: 9, color: t.text2, background: t.bg3, border: `1px solid ${t.border}`, borderRadius: 3, padding: '1px 5px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>studio</span>
        </div>

        <div style={{ flex: 1 }} />

        {/* Search */}
        <button onClick={() => setPalette(true)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 12px', borderRadius: 6, background: t.bg2, border: `1px solid ${t.border}`, color: t.text2, fontSize: 12, cursor: 'pointer', fontFamily: SANS, transition: 'border-color 0.15s, background 0.15s' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = t.accent; e.currentTarget.style.background = t.bg3 }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = t.border; e.currentTarget.style.background = t.bg2 }}
        >
          <IcoSearch c={t.text2} />
          <span>Search tables</span>
          <kbd style={{ fontSize: 10, background: t.bg3, border: `1px solid ${t.border}`, borderRadius: 3, padding: '1px 5px', fontFamily: MONO }}>⌘K</kbd>
        </button>

        {/* Theme toggle — cycles dark → light → auto */}
        <button onClick={cycleTheme} title={THEME_TIP[themeMode]} style={{ display: 'flex', alignItems: 'center', gap: 5, background: t.bg2, border: `1px solid ${t.border}`, borderRadius: 6, color: t.text1, padding: '5px 10px', cursor: 'pointer', fontSize: 13, lineHeight: 1, fontFamily: SANS, transition: 'all 0.15s' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = t.accent; e.currentTarget.style.color = t.text0 }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = t.border; e.currentTarget.style.color = t.text1 }}
        >
          <span>{THEME_ICON[themeMode]}</span>
          <span style={{ fontSize: 10, letterSpacing: '0.04em', textTransform: 'uppercase', fontWeight: 600 }}>{themeMode}</span>
        </button>

        {/* ── Run button group (split button + dropdown) ── */}
        {(() => {
          const RUN_OPTIONS: { mode: RunMode; icon: string; label: string; desc: string }[] = [
            { mode: 'limit1000', icon: '▶', label: 'Run  ·  max 1 000',   desc: 'Enforces LIMIT 1 000 — clamps higher limits too  ·  ⌘↵' },
            { mode: 'nolimit',   icon: '▶', label: 'Run  ·  no limit',    desc: 'Fetches all rows — displays first 1 000 in UI' },
            { mode: 'download',  icon: '⬇', label: 'Run & Download CSV',  desc: 'Pick a file — full results stream directly to disk' },
          ]
          const current = RUN_OPTIONS.find(o => o.mode === selectedRunMode)!
          const btnGrad = `linear-gradient(135deg, ${t.accent} 0%, ${t.purple} 100%)`

          // Inline async so showSaveFilePicker is the FIRST await — this is
          // the only reliable way to keep the browser's transient user-activation.
          const execCurrent = async () => {
            if (selectedRunMode !== 'download') { handleRun(selectedRunMode); return }
            if (activeTab.isRunning) return
            const suggestedName = `query-${new Date().toISOString().slice(0, 10)}.csv`
            if (typeof (window as any).showSaveFilePicker !== 'function') {
              setDlFilename(suggestedName); setDlModal(true); return
            }
            let fh: any
            try {
              fh = await (window as any).showSaveFilePicker({
                suggestedName,
                types: [{ description: 'CSV file', accept: { 'text/csv': ['.csv'] } }],
              })
            } catch (e: any) {
              if (e?.name === 'AbortError' || e?.code === 20) return
              console.error('[RustyTrino] showSaveFilePicker:', e?.name, e?.message)
              setDlFilename(suggestedName); setDlModal(true); return
            }
            handleRunDownload(fh.name, fh)
          }
          // Expose to keyboard shortcut ref
          startDownloadRef.current = execCurrent

          return (
            // align-items: center + matching 5px vertical padding on every button
            // keeps this group the same height as the search / theme header buttons
            <div ref={runMenuRef} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              {activeTab.isRunning ? (
                /* Cancel — same padding as every other header button */
                <button onClick={handleCancel} style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  padding: '5px 16px',
                  borderRadius: 7, border: 'none', cursor: 'pointer', fontFamily: SANS,
                  background: t.red, color: '#fff', fontSize: 12.5, fontWeight: 600,
                  boxShadow: `0 0 16px ${t.red}50`,
                }}>
                  <span style={{ fontSize: 9 }}>■</span>
                  <span>Cancel</span>
                  <span style={{ opacity: 0.8, fontSize: 11, fontFamily: MONO }}>{fmtMs(elapsed)}</span>
                </button>
              ) : (<>
                {/* Main button — 5px top/bottom matches search & theme buttons */}
                <button onClick={execCurrent} style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  padding: '5px 14px',
                  borderRadius: '7px 0 0 7px', border: 'none',
                  borderRight: `1px solid #ffffff22`,
                  cursor: 'pointer', fontFamily: SANS,
                  background: btnGrad, color: '#fff', fontSize: 12.5, fontWeight: 600,
                  boxShadow: `0 0 20px ${t.accent}40`, transition: 'box-shadow 0.15s, transform 0.1s',
                  whiteSpace: 'nowrap',
                }}
                  onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 0 28px ${t.accent}70`; e.currentTarget.style.transform = 'translateY(-1px)' }}
                  onMouseLeave={e => { e.currentTarget.style.boxShadow = `0 0 20px ${t.accent}40`; e.currentTarget.style.transform = 'translateY(0)' }}
                >
                  <span style={{ fontSize: current.mode === 'download' ? 13 : 11 }}>{current.icon}</span>
                  <span>{current.label}</span>
                  <kbd style={{ opacity: 0.5, fontSize: 10, fontFamily: MONO, background: 'transparent', border: 'none', padding: 0 }}>⌘↵</kbd>
                </button>

                {/* Chevron — same 5px vertical padding as main button */}
                <button onClick={() => setRunMenuOpen(o => !o)} title="Run options"
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '5px 9px',
                    borderRadius: '0 7px 7px 0', border: 'none', cursor: 'pointer',
                    background: btnGrad, color: '#ffffffbb', fontSize: 9,
                    boxShadow: `0 0 20px ${t.accent}40`, transition: 'color 0.12s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#ffffffbb')}
                >
                  {runMenuOpen ? '▲' : '▼'}
                </button>

                {/* Dropdown */}
                {runMenuOpen && (
                  <div style={{
                    position: 'absolute', top: 'calc(100% + 7px)', right: 0, zIndex: 2000,
                    background: t.bg1, border: `1px solid ${t.borderStrong}`,
                    borderRadius: 10, overflow: 'hidden', minWidth: 280,
                    boxShadow: `0 16px 48px rgba(0,0,0,0.5)`,
                  }}>
                    {RUN_OPTIONS.map((opt, i) => {
                      const isSelected = opt.mode === selectedRunMode
                      return (
                        <div key={opt.mode}
                          onClick={async () => {
                            setSelectedRunMode(opt.mode)
                            setRunMenuOpen(false)
                            if (opt.mode !== 'download') { handleRun(opt.mode); return }
                            if (activeTab.isRunning) return
                            const suggestedName = `query-${new Date().toISOString().slice(0, 10)}.csv`
                            if (typeof (window as any).showSaveFilePicker !== 'function') {
                              setDlFilename(suggestedName); setDlModal(true); return
                            }
                            let fh: any
                            try {
                              fh = await (window as any).showSaveFilePicker({
                                suggestedName,
                                types: [{ description: 'CSV file', accept: { 'text/csv': ['.csv'] } }],
                              })
                            } catch (e: any) {
                              if (e?.name === 'AbortError' || e?.code === 20) return
                              console.error('[RustyTrino] showSaveFilePicker:', e?.name, e?.message)
                              setDlFilename(suggestedName); setDlModal(true); return
                            }
                            handleRunDownload(fh.name, fh)
                          }}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 12,
                            padding: '11px 14px', cursor: 'pointer',
                            borderBottom: i < RUN_OPTIONS.length - 1 ? `1px solid ${t.border}40` : 'none',
                            background: isSelected ? t.accent + '12' : 'transparent',
                            transition: 'background 0.1s',
                          }}
                          onMouseEnter={e => !isSelected && (e.currentTarget.style.background = t.bg2)}
                          onMouseLeave={e => (e.currentTarget.style.background = isSelected ? t.accent + '12' : 'transparent')}
                        >
                          {/* Selected indicator */}
                          <span style={{ width: 14, flexShrink: 0, textAlign: 'center', fontSize: 9, color: t.accent }}>
                            {isSelected ? '●' : ''}
                          </span>
                          <span style={{ fontSize: opt.mode === 'download' ? 14 : 11, color: t.accent, width: 16, textAlign: 'center', flexShrink: 0 }}>{opt.icon}</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 12.5, fontWeight: 600, color: isSelected ? t.accent : t.text0 }}>{opt.label}</div>
                            <div style={{ fontSize: 10.5, color: t.text2, marginTop: 1, fontFamily: MONO }}>{opt.desc}</div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </>)}
            </div>
          )
        })()}
      </div>

      {/* ══ BODY ══════════════════════════════════════════════════════════ */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* ── LEFT SIDEBAR ──────────────────────────────────────────────── */}
        <div style={{ width: 240, background: t.bg1, borderRight: `1px solid ${t.border}`, display: 'flex', flexDirection: 'column', flexShrink: 0, transition: 'background 0.3s, border-color 0.2s' }}>
          {/* Sidebar tab switcher */}
          <div style={{ display: 'flex', alignItems: 'center', height: 34, borderBottom: `1px solid ${t.border}`, padding: '0 4px', gap: 2, flexShrink: 0 }}>
            {(['schema', 'history'] as const).map(s => (
              <div key={s} onClick={() => setSideTab(s)} style={{ padding: '4px 10px', borderRadius: 5, fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', cursor: 'pointer', userSelect: 'none', color: sideTab === s ? t.accent : t.text2, background: sideTab === s ? t.accent + '14' : 'transparent', transition: 'all 0.12s' }}>
                {s}
              </div>
            ))}
            <div style={{ flex: 1 }} />
            {sideTab === 'schema' && (
              <button onClick={loadSchema} disabled={schemaLoading} title="Refresh schema" style={{ background: 'none', border: 'none', color: t.text2, cursor: schemaLoading ? 'default' : 'pointer', fontSize: 15, padding: '3px 6px', opacity: schemaLoading ? 0.35 : 0.65, fontFamily: SANS, transition: 'opacity 0.15s' }}
                onMouseEnter={e => !schemaLoading && (e.currentTarget.style.opacity = '1')}
                onMouseLeave={e => (e.currentTarget.style.opacity = schemaLoading ? '0.35' : '0.65')}
              >↺</button>
            )}
          </div>

          {/* Schema search box */}
          {sideTab === 'schema' && (
            <div style={{ padding: '7px 8px', borderBottom: `1px solid ${t.border}`, flexShrink: 0 }}>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                  <IcoSearch c={t.text2} />
                </div>
                <input value={schemaSearch} onChange={e => setSchemaSearch(e.target.value)} placeholder="Filter…"
                  style={{ width: '100%', boxSizing: 'border-box', background: t.bg2, border: `1px solid ${t.border}`, borderRadius: 5, padding: '5px 8px 5px 26px', color: t.text0, fontSize: 12, fontFamily: SANS, outline: 'none', transition: 'border-color 0.15s, background 0.2s' }}
                  onFocus={e => (e.target.style.borderColor = t.accent)}
                  onBlur={e => (e.target.style.borderColor = t.border)}
                />
              </div>
            </div>
          )}

          {/* Tree / History */}
          <div style={{ flex: 1, overflow: 'auto' }}>
            {sideTab === 'schema' ? (
              schemaLoading ? (
                // Skeleton shimmer rows
                <div style={{ padding: '10px 8px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {[80, 60, 70, 50, 65].map((w, i) => (
                    <div key={i} style={{ height: 14, borderRadius: 4, background: isDark ? '#1c2e4840' : '#d0d8e840', animation: 'shimmer 1.5s ease infinite', animationDelay: `${i * 0.1}s`, width: `${w}%` }} />
                  ))}
                </div>
              ) : schemaTree.length === 0 ? (
                <div style={{ padding: '20px 12px', textAlign: 'center', color: t.text2, fontSize: 12, lineHeight: 1.6 }}>
                  No catalogs found.<br />
                  <span style={{ color: t.accent, cursor: 'pointer' }} onClick={loadSchema}>Retry</span>
                </div>
              ) : (
                <div style={{ paddingTop: 4, paddingBottom: 8 }}>{renderTree(schemaTree)}</div>
              )
            ) : (
              history.length === 0 ? (
                <div style={{ padding: '20px 12px', textAlign: 'center', color: t.text2, fontSize: 12 }}>No history yet</div>
              ) : (
                history.map(h => (
                  <div key={h.id} onClick={() => setTabs(prev => prev.map(tab => tab.id === activeId ? { ...tab, sql: h.sql } : tab))} title="Restore query"
                    style={{ padding: '8px 12px', borderBottom: `1px solid ${t.border}30`, cursor: 'pointer', transition: 'background 0.1s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = t.bg2)}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: h.success ? t.green : t.red, display: 'inline-block', flexShrink: 0 }} />
                      <span style={{ fontSize: 10.5, color: t.text2, fontFamily: MONO }}>{fmtMs(h.execMs)}</span>
                      <span style={{ fontSize: 10.5, color: t.text2 }}>· {h.rowCount} rows</span>
                      <div style={{ flex: 1 }} />
                      <span style={{ fontSize: 9.5, color: t.text2 }}>{h.ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div style={{ fontSize: 11, color: t.text1, fontFamily: MONO, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {h.sql.replace(/\s+/g, ' ').trim().slice(0, 55)}
                    </div>
                  </div>
                ))
              )
            )}
          </div>
        </div>

        {/* ── CENTER: TAB BAR + EDITOR + RESULTS ────────────────────────── */}
        <div ref={centerRef} style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', transition: 'background 0.3s' }}>

          {/* ── CHROME TAB BAR ─────────────────────────────────────────────
              • All tabs are the same height (34px)
              • Active tab: bg = editor bg (seamless merge), accent top border, no bottom border
              • Inactive tab: slightly different bg, transparent top border
              • Tray border at bottom is "swallowed" by active tab (margin-bottom: -1px)
          ─────────────────────────────────────────────────────────────────── */}
          <div style={{
            background: t.tabTray,
            /* No borderBottom here — the tray's own border would paint on top of
               all children and slice through the active tab. The darker tabTray
               background is enough to visually separate the inactive-tab strip
               from the header above; the active tab flows unbroken into the editor. */
            display: 'flex', alignItems: 'flex-end',
            flexShrink: 0, height: 42,
            paddingLeft: 4, position: 'relative', zIndex: 10,
            transition: 'background 0.3s',
          }}>
            {/* Scrollable tab container */}
            <div ref={tabScrollRef} className="tab-scroll">
              {tabs.map(tab => {
                const isActive = tab.id === activeId
                // Mini timing badge shown on completed tabs
                const badge = tab.completed && tab.execMs != null
                  ? (tab.rows.length > 0 ? `${fmtRows(tab.rows.length)} · ${fmtMs(tab.execMs)}` : fmtMs(tab.execMs))
                  : null

                return (
                  <div
                    key={tab.id}
                    className={`ctab${isActive ? ' ctab-active' : ''}`}
                    onClick={() => setActiveId(tab.id)}
                    onDoubleClick={() => { setRenamingId(tab.id); setRenameDraft(tab.name) }}
                  >
                    {/* Status dot */}
                    <span className={`ctab-dot${tab.isRunning ? ' ctab-dot-run' : ''}`}
                      style={{
                        background: tab.isRunning ? t.accent : tab.error ? t.red : tab.completed ? t.green : t.text2,
                        opacity: (!tab.isRunning && !tab.completed && !tab.error) ? 0.25 : 1,
                        boxShadow: tab.isRunning ? `0 0 6px ${t.accent}` : tab.error ? `0 0 6px ${t.red}` : 'none',
                      }}
                    />

                    {/* Name or rename input */}
                    {renamingId === tab.id ? (
                      <input value={renameDraft} onChange={e => setRenameDraft(e.target.value)}
                        onBlur={commitRename}
                        onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') commitRename() }}
                        autoFocus onClick={e => e.stopPropagation()}
                        style={{ flex: 1, minWidth: 0, background: 'transparent', border: 'none', outline: 'none', color: t.text0, fontSize: 12, fontFamily: SANS }}
                      />
                    ) : (
                      <span className="ctab-label">{tab.name}</span>
                    )}

                    {/* Mini stats badge */}
                    {badge && !tab.isRunning && (
                      <span style={{ fontSize: 9.5, color: isActive ? t.text2 : t.text2, fontFamily: MONO, opacity: 0.7, flexShrink: 0, whiteSpace: 'nowrap' }}>
                        {badge}
                      </span>
                    )}

                    {/* Close button */}
                    {tabs.length > 1 && (
                      <span className="ctab-close" onClick={e => closeTab(tab.id, e)}>×</span>
                    )}
                  </div>
                )
              })}

              {/* Inline "+" — only when tabs fit (no overflow); sticky one handles the overflow case */}
              {!tabsOverflow && (
                <div className="ctab-add ctab-add-inline" onClick={addTab} title="New tab">+</div>
              )}
            </div>

            {/* Sticky "+" — only shown when tabs overflow the scroll container.
                It stays pinned at the right edge so it is always reachable. */}
            {tabsOverflow && (
              <div className="ctab-add ctab-add-sticky" onClick={addTab} title="New tab">+</div>
            )}
          </div>

          {/* ── Monaco editor ────────────────────────────────────────────── */}
          <div style={{ height: `${splitPct}%`, minHeight: 60, overflow: 'hidden', flexShrink: 0 }}>
            <Editor
              height="100%"
              defaultLanguage="sql"
              value={activeTab.sql}
              onChange={v => updateSql(v ?? '')}
              theme={isDark ? 'studio-dark' : 'studio-light'}
              options={{
                minimap: { enabled: false }, fontSize: 13, fontFamily: MONO,
                lineNumbers: 'on', scrollBeyondLastLine: false, automaticLayout: true,
                padding: { top: 12, bottom: 10 }, lineHeight: 22, wordWrap: 'on',
                renderLineHighlight: 'gutter',
                scrollbar: { verticalScrollbarSize: 5, horizontalScrollbarSize: 5 },
                overviewRulerBorder: false,
                renderWhitespace: 'selection',
                suggest: { showKeywords: true, showSnippets: true },
                quickSuggestionsDelay: 120,
              }}
            />
          </div>

          {/* ── Drag handle ──────────────────────────────────────────────── */}
          <div
            onMouseDown={() => { isDragging.current = true }}
            style={{ height: 5, cursor: 'row-resize', flexShrink: 0, borderTop: `1px solid ${t.border}`, borderBottom: `1px solid ${t.border}`, transition: 'background 0.15s, border-color 0.2s', userSelect: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onMouseEnter={e => (e.currentTarget.style.background = t.accent + '30')}
            onMouseLeave={e => { if (!isDragging.current) e.currentTarget.style.background = 'transparent' }}
          >
            <div style={{ width: 40, height: 2, borderRadius: 1, background: isDragging.current ? t.accent : t.border, transition: 'background 0.15s' }} />
          </div>

          {/* ── Results pane ─────────────────────────────────────────────── */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

            {/* Results toolbar */}
            <div style={{ height: 34, background: t.bg1, borderBottom: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', padding: '0 12px', gap: 3, flexShrink: 0, transition: 'background 0.3s, border-color 0.2s' }}>
              {(['table', 'chart', 'explain'] as const).map(v => (
                <div key={v} onClick={() => setResultView(v)} style={{ padding: '4px 11px', borderRadius: 5, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', cursor: 'pointer', color: resultView === v ? t.accent : t.text2, background: resultView === v ? t.accent + '18' : 'transparent', transition: 'all 0.12s' }}>
                  {v}
                </div>
              ))}
              <div style={{ flex: 1 }} />
              {activeTab.isRunning && (
                <span style={{ fontSize: 12, color: t.accent, fontFamily: MONO }}>
                  {fmtMs(elapsed)}
                </span>
              )}
              {!activeTab.isRunning && activeTab.completed && (
                <span style={{ fontSize: 11.5, color: t.text2, fontFamily: MONO }}>
                  {/* Show actual fetched row count if it differs from displayed rows */}
                  {activeTab.totalRowCount != null && activeTab.totalRowCount > activeTab.rows.length
                    ? <>{activeTab.rows.length.toLocaleString()} <span style={{ opacity: 0.55 }}>of {activeTab.totalRowCount.toLocaleString()}</span> rows</>
                    : <>{activeTab.rows.length.toLocaleString()} rows</>
                  }{' '}· {fmtMs(activeTab.execMs ?? 0)}
                </span>
              )}
              {/* Saved-to-disk badge */}
              {activeTab.savedFile && !activeTab.isRunning && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: t.green, fontFamily: MONO, marginLeft: 4, padding: '2px 8px', borderRadius: 4, background: t.green + '18', border: `1px solid ${t.green}40` }}>
                  ✓ {activeTab.savedFile}
                </span>
              )}
              {breadcrumb && (
                <span style={{ fontSize: 11, color: t.text2, fontFamily: MONO, marginLeft: 8, paddingLeft: 8, borderLeft: `1px solid ${t.border}` }}>
                  <span style={{ color: t.accent }}>{breadcrumb.catalog}</span>
                  <span style={{ color: t.text2 }}>.</span>
                  <span style={{ color: t.purple }}>{breadcrumb.schema}</span>
                </span>
              )}
              {activeTab.rows.length > 0 && (
                <button onClick={() => exportCSV(activeTab.columns, activeTab.rows)}
                  style={{ marginLeft: 6, background: t.bg2, border: `1px solid ${t.border}`, borderRadius: 5, color: t.text1, fontSize: 11.5, padding: '3px 9px', cursor: 'pointer', fontFamily: SANS, transition: 'border-color 0.15s, color 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = t.accent; e.currentTarget.style.color = t.accent }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = t.border; e.currentTarget.style.color = t.text1 }}
                >⬇ CSV</button>
              )}
            </div>

            {/* Results content */}
            <div style={{ flex: 1, overflow: 'auto', position: 'relative', background: t.bg0, transition: 'background 0.3s' }}>

              {/* Running spinner */}
              {activeTab.isRunning && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 14, color: t.text2 }}>
                  <div style={{ width: 38, height: 38, borderRadius: '50%', border: `2px solid ${t.border}`, borderTopColor: t.accent, animation: 'spin 0.9s linear infinite' }} />
                  <span style={{ fontSize: 12.5 }}>Running… <span style={{ color: t.accent, fontFamily: MONO }}>{fmtMs(elapsed)}</span></span>
                </div>
              )}

              {/* Error */}
              {!activeTab.isRunning && activeTab.error && (
                <div style={{ margin: 14, padding: '12px 16px', background: t.red + '10', border: `1px solid ${t.red}40`, borderRadius: 8, fontSize: 12.5, color: t.red, fontFamily: MONO, whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
                  <span style={{ fontWeight: 700, marginRight: 8 }}>Error</span>{activeTab.error}
                </div>
              )}

              {/* Empty result */}
              {!activeTab.isRunning && !activeTab.error && activeTab.completed && activeTab.rows.length === 0 && (
                <div style={{ padding: 28, textAlign: 'center', color: t.text2, fontSize: 12 }}>Query returned 0 rows</div>
              )}

              {/* Table */}
              {!activeTab.isRunning && activeTab.rows.length > 0 && resultView === 'table' && (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, fontFamily: MONO }}>
                  <thead>
                    <tr>
                      <th style={{ position: 'sticky', top: 0, zIndex: 1, background: t.bg2, padding: '5px 8px', borderBottom: `1px solid ${t.border}`, borderRight: `1px solid ${t.border}40`, color: t.text2, fontSize: 10, fontWeight: 600, textAlign: 'right', width: 36 }}>#</th>
                      {activeTab.columns.map((col, i) => (
                        <th key={i} style={{ position: 'sticky', top: 0, zIndex: 1, background: t.bg2, padding: '5px 12px', borderBottom: `1px solid ${t.border}`, borderRight: `1px solid ${t.border}40`, textAlign: 'left', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ color: t.text0, fontWeight: 600, fontSize: 11.5 }}>{col.name}</span>
                            <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 3, fontFamily: SANS, fontWeight: 600, letterSpacing: '0.04em', background: typeColor(col.type ?? '') + '20', color: typeColor(col.type ?? '') }}>
                              {(col.type ?? '').split('(')[0].toUpperCase() || '?'}
                            </span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {activeTab.rows.map((row, ri) => (
                      <tr key={ri} style={{ background: ri % 2 === 0 ? 'transparent' : (isDark ? '#ffffff03' : '#00000004') }}
                        onMouseEnter={e => (e.currentTarget.style.background = t.bg3 + '90')}
                        onMouseLeave={e => (e.currentTarget.style.background = ri % 2 === 0 ? 'transparent' : (isDark ? '#ffffff03' : '#00000004'))}
                      >
                        <td style={{ padding: '4px 8px', borderBottom: `1px solid ${t.border}25`, borderRight: `1px solid ${t.border}40`, color: t.text2, fontSize: 10, textAlign: 'right', userSelect: 'none' }}>{ri + 1}</td>
                        {row.map((cell, ci) => (
                          <td key={ci} style={{ padding: '4px 12px', borderBottom: `1px solid ${t.border}25`, borderRight: `1px solid ${t.border}40`, maxWidth: 360, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: t.text0 }}>
                            {cell === null || cell === undefined
                              ? <span style={{ color: t.text2, fontSize: 10, background: t.bg3, borderRadius: 3, padding: '1px 6px', fontFamily: SANS, fontStyle: 'italic' }}>NULL</span>
                              : String(cell)
                            }
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* Chart */}
              {!activeTab.isRunning && activeTab.rows.length > 0 && resultView === 'chart' && (
                <QueryCharts
                  columns={activeTab.columns as any[]}
                  rows={activeTab.rows.map(row => Object.fromEntries(activeTab.columns.map((col, j) => [col.name, row[j]])))}
                  height={Math.max(280, window.innerHeight * 0.38)}
                />
              )}

              {/* Explain plan */}
              {resultView === 'explain' && (
                <div style={{ padding: 14 }}>
                  {!activeTab.queryId
                    ? <div style={{ color: t.text2, fontSize: 12 }}>Run a query first to view its logical plan.</div>
                    : !activeTab.explainPlan
                      ? <div style={{ color: t.text2, fontSize: 12 }}>Loading plan…</div>
                      : <pre style={{ margin: 0, fontFamily: MONO, fontSize: 11.5, color: t.text0, background: t.bg1, border: `1px solid ${t.border}`, borderRadius: 8, padding: '14px 18px', overflow: 'auto', whiteSpace: 'pre', lineHeight: 1.75 }}>{activeTab.explainPlan}</pre>
                  }
                </div>
              )}

              {/* Idle empty state */}
              {!activeTab.isRunning && !activeTab.completed && !activeTab.error && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 10, color: t.text2, userSelect: 'none' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: isDark ? '#1c2e4840' : '#dde3f080', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, opacity: 0.5 }}>⊞</div>
                  <span style={{ fontSize: 12, opacity: 0.65 }}>
                    Press <kbd style={{ background: t.bg3, border: `1px solid ${t.border}`, borderRadius: 4, padding: '2px 6px', fontFamily: MONO, fontSize: 11 }}>⌘↵</kbd> to run query
                  </span>
                  <span style={{ fontSize: 11, opacity: 0.4 }}>or click a table in the schema explorer →</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ══ STATUS BAR ════════════════════════════════════════════════════ */}
      <div style={{ height: 22, background: isDark ? '#050b18' : t.bg1, borderTop: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', padding: '0 12px', gap: 10, fontSize: 10.5, color: t.text2, flexShrink: 0, transition: 'background 0.3s, border-color 0.2s' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: t.green, display: 'inline-block', boxShadow: `0 0 4px ${t.green}` }} />
          localhost:8080
        </span>
        <span>·</span>
        {breadcrumb
          ? <span style={{ fontFamily: MONO, color: t.text1 }}>{breadcrumb.catalog}<span style={{ color: t.text2 }}>.</span>{breadcrumb.schema}</span>
          : <span style={{ fontStyle: 'italic' }}>no context</span>}
        <span>·</span>
        {activeTab.isRunning
          ? <span style={{ color: t.accent, fontFamily: MONO }}>{fmtMs(elapsed)}</span>
          : activeTab.execMs != null
            ? <span style={{ fontFamily: MONO }}>{activeTab.rows.length.toLocaleString()} rows · {fmtMs(activeTab.execMs)}</span>
            : <span>ready</span>}
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 9.5, color: t.text2, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          {themeMode === 'auto' ? `auto · ${isDark ? 'dark' : 'light'}` : themeMode}
        </span>
        {activeTab.isRunning  && <span style={{ color: t.accent, fontWeight: 700, letterSpacing: '0.08em', fontSize: 9.5 }}>● RUNNING</span>}
        {activeTab.completed && !activeTab.error && <span style={{ color: t.green,  fontWeight: 700, letterSpacing: '0.08em', fontSize: 9.5 }}>✓ DONE</span>}
        {activeTab.error && !activeTab.isRunning  && <span style={{ color: t.red,    fontWeight: 700, letterSpacing: '0.08em', fontSize: 9.5 }}>✕ ERROR</span>}
      </div>

      {/* ══ DOWNLOAD FILENAME DIALOG ══════════════════════════════════════ */}
      {dlModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, backdropFilter: 'blur(4px)' }}
          onClick={() => setDlModal(false)}
        >
          <div
            style={{ width: 400, background: t.bg1, border: `1px solid ${t.borderStrong}`, borderRadius: 14, padding: '24px 24px 20px', boxShadow: '0 24px 72px rgba(0,0,0,0.6)', display: 'flex', flexDirection: 'column', gap: 16 }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: t.text0, marginBottom: 4 }}>Run & Download CSV</div>
              <div style={{ fontSize: 12, color: t.text2, lineHeight: 1.5 }}>
                Enter a filename. The file will be saved to your Downloads folder.
              </div>
            </div>

            {/* Filename input */}
            <div>
              <label style={{ display: 'block', fontSize: 11, color: t.text2, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Filename</label>
              <input
                ref={dlInputRef}
                value={dlFilename}
                onChange={e => setDlFilename(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && dlFilename.trim()) { setDlModal(false); handleRunDownload(dlFilename.trim()) }
                  if (e.key === 'Escape') setDlModal(false)
                }}
                spellCheck={false}
                style={{ width: '100%', boxSizing: 'border-box', background: t.bg2, border: `1px solid ${t.border}`, borderRadius: 7, padding: '9px 12px', color: t.text0, fontSize: 13, fontFamily: MONO, outline: 'none', transition: 'border-color 0.15s' }}
                onFocus={e => (e.target.style.borderColor = t.accent)}
                onBlur={e => (e.target.style.borderColor = t.border)}
              />
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setDlModal(false)}
                style={{ padding: '7px 16px', borderRadius: 7, border: `1px solid ${t.border}`, background: 'transparent', color: t.text1, cursor: 'pointer', fontSize: 12.5, fontFamily: SANS, transition: 'border-color 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = t.borderStrong)}
                onMouseLeave={e => (e.currentTarget.style.borderColor = t.border)}
              >Cancel</button>
              <button
                disabled={!dlFilename.trim()}
                onClick={() => { setDlModal(false); handleRunDownload(dlFilename.trim()) }}
                style={{ padding: '7px 18px', borderRadius: 7, border: 'none', background: dlFilename.trim() ? `linear-gradient(135deg, ${t.accent}, ${t.purple})` : t.bg3, color: dlFilename.trim() ? '#fff' : t.text2, cursor: dlFilename.trim() ? 'pointer' : 'default', fontSize: 12.5, fontWeight: 600, fontFamily: SANS, transition: 'opacity 0.15s', boxShadow: dlFilename.trim() ? `0 0 16px ${t.accent}40` : 'none' }}
              >⬇ Run & Download</button>
            </div>
          </div>
        </div>
      )}

      {/* ══ COMMAND PALETTE ═══════════════════════════════════════════════ */}
      {palette && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '10vh', zIndex: 9999, backdropFilter: 'blur(6px)' }}
          onClick={() => { setPalette(false); setPaletteSearch('') }}>
          <div style={{ width: 600, background: t.bg1, border: `1px solid ${t.borderStrong}`, borderRadius: 14, overflow: 'hidden', boxShadow: `0 32px 96px rgba(0,0,0,0.7), 0 0 0 1px ${isDark ? '#ffffff08' : '#00000010'}`, maxHeight: '62vh', display: 'flex', flexDirection: 'column', transition: 'background 0.2s' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', padding: '14px 18px', borderBottom: `1px solid ${t.border}`, gap: 12 }}>
              <IcoSearch c={t.accent} />
              <input ref={paletteInputRef} value={paletteSearch} onChange={e => setPaletteSearch(e.target.value)} placeholder="Search tables…"
                style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: t.text0, fontSize: 15, fontFamily: SANS }} />
              {paletteSearch && <span style={{ fontSize: 11, color: t.text2, background: t.bg3, borderRadius: 4, padding: '2px 7px', fontFamily: MONO }}>{filteredTables.length}</span>}
              <kbd style={{ fontSize: 10, color: t.text2, background: t.bg3, border: `1px solid ${t.border}`, borderRadius: 4, padding: '2px 6px', fontFamily: MONO }}>esc</kbd>
            </div>
            <div style={{ overflow: 'auto', flex: 1 }}>
              {filteredTables.length === 0
                ? <div style={{ padding: '28px 18px', textAlign: 'center', color: t.text2, fontSize: 13 }}>No tables match "{paletteSearch}"</div>
                : filteredTables.slice(0, 40).map(tbl => {
                  const parts = tbl.split('.')
                  return (
                    <div key={tbl} onClick={() => { insertTable(tbl); setPalette(false) }}
                      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 18px', cursor: 'pointer', transition: 'background 0.1s', borderBottom: `1px solid ${t.border}28` }}
                      onMouseEnter={e => (e.currentTarget.style.background = t.bg2)}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <IcoTable c={t.text2} />
                      <div style={{ flex: 1 }}>
                        <span style={{ fontFamily: MONO, fontSize: 13, color: t.text0, fontWeight: 600 }}>{parts[2]}</span>
                        <span style={{ fontFamily: MONO, fontSize: 11, color: t.text2, marginLeft: 10 }}>{parts[0]}.{parts[1]}</span>
                      </div>
                      <span style={{ fontSize: 10, color: t.text2, opacity: 0.5 }}>click to query →</span>
                    </div>
                  )
                })
              }
            </div>
          </div>
        </div>
      )}

      {/* ══ GLOBAL CSS ════════════════════════════════════════════════════ */}
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { overflow: hidden; }

        /* ── Scrollable tab container ── */
        .tab-scroll {
          flex: 1;
          display: flex;
          align-items: flex-end;
          overflow-x: auto;
          overflow-y: hidden;
          scrollbar-width: none;
          gap: 2px;
          padding-left: 2px;
        }
        .tab-scroll::-webkit-scrollbar { display: none; }

        /* ── Base Chrome tab — all tabs same height ── */
        .ctab {
          position: relative;
          display: flex;
          align-items: center;
          gap: 6px;
          height: 34px;            /* ← same for ALL tabs */
          min-width: 120px;
          max-width: 210px;
          padding: 0 10px 0 12px;
          flex-shrink: 0;
          cursor: pointer;
          user-select: none;
          white-space: nowrap;
          font-size: 12px;
          font-family: ${SANS};
          color: ${t.text1};
          background: ${t.bg2};   /* inactive bg — clearly different from editor */
          border-radius: 7px 7px 0 0;
          border: 1px solid ${t.border};
          border-bottom: none;
          border-top: 2px solid transparent;   /* slot for the accent line */
          margin-bottom: 0;
          transition: background 0.15s, color 0.15s, border-color 0.15s;
        }
        /* Draw a thin separator line at the bottom of the tray gap below each
           inactive tab, so the editor boundary is still visible where no active
           tab sits. We use a pseudo-element rather than a parent border so it
           does not affect the active tab. */
        .ctab:not(.ctab-active)::after {
          content: '';
          position: absolute;
          bottom: -1px; left: -1px; right: -1px;
          height: 1px;
          background: ${t.border};
          pointer-events: none;
        }
        .ctab:hover:not(.ctab-active) {
          background: ${t.bg3};
          color: ${t.text0};
          border-color: ${t.borderStrong};
        }

        /* ── Active tab:
              • same height (34px — no change)
              • bg matches editor exactly
              • accent top border for futuristic indicator
              • no bottom border → merges with editor
              • margin-bottom: -1px → covers tray bottom border
        ── */
        .ctab-active {
          background: ${t.bg0};               /* matches Monaco editor bg */
          border-color: ${t.borderStrong};
          border-top: 2px solid ${t.accent};  /* accent indicator */
          /* border-bottom is inherited as "none" from .ctab — no override,
             no line, seamless merge with the editor below */
          color: ${t.text0};
          margin-bottom: -1px;               /* overlaps tray border → one piece */
          z-index: 5;
        }

        /* Subtle glow on the active tab top border */
        .ctab-active::before {
          content: '';
          position: absolute;
          top: -2px; left: 0; right: 0; height: 2px;
          background: linear-gradient(90deg, transparent, ${t.accent}80, transparent);
          pointer-events: none;
          border-radius: 7px 7px 0 0;
        }

        /* Curved outer corners — same technique, same height */
        .ctab-active::after {
          content: '';
          position: absolute;
          bottom: 0px; left: -9px;
          width: 9px; height: 9px;
          background: radial-gradient(circle at 100% 0%, transparent 8px, ${t.tabTray} 8px);
          pointer-events: none;
        }

        /* Right curved corner via a sibling-less trick: use box-shadow on :before for right */
        /* We'll use a data attribute approach or just accept no right curve to keep it clean */

        /* ── Tab inner elements ── */
        .ctab-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          flex-shrink: 0;
          transition: background 0.2s, box-shadow 0.2s;
        }
        .ctab-dot-run { animation: pulse-dot 1.2s ease-in-out infinite; }

        .ctab-label {
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .ctab-close {
          font-size: 16px;
          line-height: 1;
          color: ${t.text2};
          border-radius: 4px;
          padding: 2px 3px;
          flex-shrink: 0;
          opacity: 0;
          transition: opacity 0.12s, background 0.12s;
        }
        .ctab:hover .ctab-close,
        .ctab-active .ctab-close { opacity: 0.55; }
        .ctab-close:hover { opacity: 1 !important; color: ${t.text0}; background: ${t.bg3}; }

        /* ── New tab button — shared base ── */
        .ctab-add {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 30px;
          height: 26px;
          flex-shrink: 0;
          cursor: pointer;
          color: ${t.text2};
          font-size: 20px;
          line-height: 1;
          border-radius: 6px;
          transition: all 0.12s;
        }
        .ctab-add:hover { color: ${t.accent}; background: ${t.bg3}; }

        /* Inline variant: scrolls with the tab list, hugs the last tab */
        .ctab-add-inline {
          margin: 0 4px 4px 2px;   /* small gap after last tab, keeps it in the tray */
          align-self: flex-end;
        }

        /* Sticky variant: pinned at the right edge when tabs overflow.
           A left-fade gradient hints that more tabs are hidden behind it. */
        .ctab-add-sticky {
          position: relative;
          margin: 0 4px 4px 0;
          align-self: flex-end;
        }
        .ctab-add-sticky::before {
          content: '';
          position: absolute;
          right: 100%;
          top: 0; bottom: 0;
          width: 28px;
          background: linear-gradient(to right, transparent, ${t.tabTray});
          pointer-events: none;
        }

        /* ── Scrollbars ── */
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${t.border}; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: ${t.text2}; }

        /* ── Animations ── */
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.3; transform: scale(0.7); }
        }
        @keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
        @keyframes progress-sweep {
          0%   { background-position: 200% 0 }
          100% { background-position: -200% 0 }
        }
        @keyframes shimmer {
          0%, 100% { opacity: 0.4 }
          50%       { opacity: 0.8 }
        }

        button { font-family: inherit; }
        input::placeholder { color: ${t.text2}; opacity: 1; }
      `}</style>
    </div>
  )
}

export default QueryStudio
