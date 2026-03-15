import React from 'react'
import { Box, styled, alpha, Typography } from '@mui/material'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts'
import { themeTokens } from './theme'

const ChartContainer = styled(Box)({
    height: '100%',
    padding: 16,
    overflow: 'auto',
})

const ChartCard = styled(Box)(({ theme }) => ({
    backgroundColor: themeTokens.colors.bgSecondary,
    borderRadius: 8,
    border: `1px solid ${themeTokens.colors.border}`,
    padding: 16,
    marginBottom: 16,
}))

const ChartTitle = styled(Typography)({
    fontSize: 14,
    fontWeight: 600,
    color: themeTokens.colors.textPrimary,
    marginBottom: 16,
})

const COLORS = [
    themeTokens.colors.primary,
    themeTokens.colors.accent,
    '#ffb347',
    '#f06c6c',
    '#78a9ff',
    '#9178f0',
]

interface DataPoint {
    [key: string]: string | number
}

interface QueryChartsProps {
    columns: DataPoint[]
    rows: DataPoint[]
    height: number
}

// Sample chart data generation
const generateChartData = (columns: string[], rows: DataPoint[]): { barData: any[], lineData: any[], pieData: any[] } => {
    if (rows.length === 0) {
        return { barData: [], lineData: [], pieData: [] }
    }

    // Bar chart - first numeric column
    const numericColumns = columns.filter(col => {
        const value = rows[0]?.[col]
        return typeof value === 'number'
    })

    const barData = numericColumns.length > 0 
        ? numericColumns.map(col => ({
            name: col,
            value: rows.slice(0, 10).reduce((sum, row) => sum + (Number(row[col]) || 0), 0)
          }))
        : rows.slice(0, 5).map((row, idx) => ({
            name: `Row ${idx + 1}`,
            value: idx + 1
          }))

    // Line chart - trend data
    const lineData = rows.slice(0, 20).map((row, idx) => ({
        index: idx + 1,
        ...Object.fromEntries(
            numericColumns.slice(0, 3).map(col => [col, Number(row[col]) || 0])
        )
    }))

    // Pie chart - distribution
    const pieColumn = columns.find(col => {
        const value = rows[0]?.[col]
        return typeof value === 'string'
    }) || columns[0]

    const pieDataMap: Record<string, number> = {}
    for (const row of rows) {
        const key = String(row[pieColumn] || 'Unknown')
        pieDataMap[key] = (pieDataMap[key] || 0) + 1
    }

    const pieData = Object.entries(pieDataMap).map(([name, value]) => ({
        name: name.length > 15 ? name.substring(0, 15) + '...' : name,
        value
    })).slice(0, 6)

    return { barData, lineData, pieData }
}

export const QueryCharts = ({ columns, rows, height }: QueryChartsProps) => {
    const columnNames: string[] = columns.map(c => String(c.name || c.field || 'unknown'))
    const { barData, lineData, pieData } = generateChartData(columnNames, rows)

    if (rows.length === 0) {
        return (
            <ChartContainer>
                <Box sx={{ 
                    height: '100%', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    flexDirection: 'column',
                    gap: 2,
                    opacity: 0.5
                }}>
                    <Typography variant="h6" color="text.secondary">
                        No data to visualize
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Run a query to see charts
                    </Typography>
                </Box>
            </ChartContainer>
        )
    }

    return (
        <ChartContainer>
            {/* Bar Chart */}
            {barData.length > 0 && (
                <ChartCard>
                    <ChartTitle>Bar Chart - Value Distribution</ChartTitle>
                    <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={barData}>
                            <CartesianGrid strokeDasharray="3 3" stroke={themeTokens.colors.border} />
                            <XAxis 
                                dataKey="name" 
                                stroke={themeTokens.colors.textSecondary}
                                tick={{ fill: themeTokens.colors.textSecondary, fontSize: 11 }}
                            />
                            <YAxis 
                                stroke={themeTokens.colors.textSecondary}
                                tick={{ fill: themeTokens.colors.textSecondary, fontSize: 11 }}
                            />
                            <Tooltip 
                                contentStyle={{
                                    backgroundColor: themeTokens.colors.bgSecondary,
                                    border: `1px solid ${themeTokens.colors.border}`,
                                    borderRadius: 6,
                                }}
                            />
                            <Bar 
                                dataKey="value" 
                                fill={themeTokens.colors.primary}
                                radius={[4, 4, 0, 0]}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartCard>
            )}

            {/* Line Chart */}
            {lineData.length > 0 && (
                <ChartCard>
                    <ChartTitle>Line Chart - Trend</ChartTitle>
                    <ResponsiveContainer width="100%" height={200}>
                        <LineChart data={lineData}>
                            <CartesianGrid strokeDasharray="3 3" stroke={themeTokens.colors.border} />
                            <XAxis 
                                dataKey="index" 
                                stroke={themeTokens.colors.textSecondary}
                                tick={{ fill: themeTokens.colors.textSecondary, fontSize: 11 }}
                            />
                            <YAxis 
                                stroke={themeTokens.colors.textSecondary}
                                tick={{ fill: themeTokens.colors.textSecondary, fontSize: 11 }}
                            />
                            <Tooltip 
                                contentStyle={{
                                    backgroundColor: themeTokens.colors.bgSecondary,
                                    border: `1px solid ${themeTokens.colors.border}`,
                                    borderRadius: 6,
                                }}
                            />
                            {Object.keys(lineData[0] || {}).filter(k => k !== 'index').map((key, idx) => (
                                <Line 
                                    key={key}
                                    type="monotone" 
                                    dataKey={key} 
                                    stroke={COLORS[idx % COLORS.length]}
                                    strokeWidth={2}
                                    dot={{ fill: COLORS[idx % COLORS.length], strokeWidth: 0, r: 3 }}
                                />
                            ))}
                        </LineChart>
                    </ResponsiveContainer>
                </ChartCard>
            )}

            {/* Pie Chart */}
            {pieData.length > 0 && (
                <ChartCard>
                    <ChartTitle>Pie Chart - Distribution</ChartTitle>
                    <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                            <Pie
                                data={pieData}
                                cx="50%"
                                cy="50%"
                                innerRadius={40}
                                outerRadius={80}
                                paddingAngle={2}
                                dataKey="value"
                                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                                labelLine={{ stroke: themeTokens.colors.textSecondary }}
                            >
                                {pieData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip 
                                contentStyle={{
                                    backgroundColor: themeTokens.colors.bgSecondary,
                                    border: `1px solid ${themeTokens.colors.border}`,
                                    borderRadius: 6,
                                }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </ChartCard>
            )}
        </ChartContainer>
    )
}

export default QueryCharts
