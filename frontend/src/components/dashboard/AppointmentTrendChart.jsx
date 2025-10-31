import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const data = [
  { name: 'السبت', appointments: 8 },
  { name: 'الأحد', appointments: 12 },
  { name: 'الإثنين', appointments: 15 },
  { name: 'الثلاثاء', appointments: 18 },
  { name: 'الأربعاء', appointments: 14 },
  { name: 'الخميس', appointments: 16 },
  { name: 'الجمعة', appointments: 10 },
]

export function AppointmentTrendChart() {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" />
        <XAxis dataKey="name" stroke="#64748b" />
        <YAxis stroke="#64748b" />
        <Tooltip 
          contentStyle={{
            backgroundColor: 'white',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
          }}
        />
        <Line 
          type="monotone" 
          dataKey="appointments" 
          stroke="#0EA5E9" 
          strokeWidth={3}
          animationDuration={800}
          animationEasing="ease"
          dot={{ fill: '#0EA5E9', strokeWidth: 2, r: 4 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

