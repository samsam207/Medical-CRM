import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

const data = [
  { name: 'الأسبوع 1', revenue: 4500 },
  { name: 'الأسبوع 2', revenue: 5200 },
  { name: 'الأسبوع 3', revenue: 4800 },
  { name: 'الأسبوع 4', revenue: 6000 },
]

const colors = ['#10B981', '#2DD4BF', '#14B8A6', '#059669']

export function RevenueChart() {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e0fdf4" />
        <XAxis dataKey="name" stroke="#64748b" />
        <YAxis stroke="#64748b" />
        <Tooltip 
          contentStyle={{
            backgroundColor: 'white',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
          }}
          cursor={{ fill: 'rgba(16, 185, 129, 0.1)' }}
        />
        <Bar dataKey="revenue" radius={[8, 8, 0, 0]} animationDuration={800}>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

