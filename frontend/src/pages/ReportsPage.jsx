import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BarChart3, TrendingUp, Users, DollarSign, Calendar, Download, Filter } from 'lucide-react'
import { Button } from '../components/common/Button'
import { Card } from '../components/common/Card'
import { Spinner } from '../components/common/Spinner'
import { reportsApi } from '../api'
import { formatCurrency, formatDate } from '../utils/formatters'

const ReportsPage = () => {
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  })
  const [reportType, setReportType] = useState('revenue')

  // Fetch revenue report
  const { data: revenueReport, isLoading: revenueLoading } = useQuery({
    queryKey: ['revenue-report', dateRange.start, dateRange.end],
    queryFn: () => reportsApi.getRevenueReport({
      start_date: dateRange.start,
      end_date: dateRange.end
    }).then(res => res?.data || {}),
    enabled: reportType === 'revenue'
  })

  // Fetch visits report
  const { data: visitsReport, isLoading: visitsLoading } = useQuery({
    queryKey: ['visits-report', dateRange.start, dateRange.end],
    queryFn: () => reportsApi.getVisitsReport({
      start_date: dateRange.start,
      end_date: dateRange.end
    }).then(res => res?.data || {}),
    enabled: reportType === 'visits'
  })

  // Fetch doctor shares report
  const { data: doctorSharesReport, isLoading: doctorSharesLoading } = useQuery({
    queryKey: ['doctor-shares-report', dateRange.start, dateRange.end],
    queryFn: () => reportsApi.getDoctorSharesReport({
      start_date: dateRange.start,
      end_date: dateRange.end
    }).then(res => res?.data || {}),
    enabled: reportType === 'doctor-shares'
  })

  const isLoading = revenueLoading || visitsLoading || doctorSharesLoading

  const handleExport = async (format = 'csv') => {
    try {
      const response = await reportsApi.exportReport({
        report_type: reportType,
        start_date: dateRange.start,
        end_date: dateRange.end,
        format
      })
      
      // Create download link
      const blob = new Blob([response.data], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${reportType}-report-${dateRange.start}-to-${dateRange.end}.${format}`
      link.click()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Export failed:', error)
    }
  }

  const renderRevenueReport = () => {
    if (!revenueReport) return null

    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Revenue</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(revenueReport.total_revenue || 0)}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-green-600" />
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Visits</p>
                <p className="text-2xl font-bold text-blue-600">
                  {revenueReport.total_visits || 0}
                </p>
              </div>
              <Users className="w-8 h-8 text-blue-600" />
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Average per Visit</p>
                <p className="text-2xl font-bold text-purple-600">
                  {formatCurrency(revenueReport.average_per_visit || 0)}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-600" />
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Growth Rate</p>
                <p className="text-2xl font-bold text-orange-600">
                  {revenueReport.growth_rate || 0}%
                </p>
              </div>
              <BarChart3 className="w-8 h-8 text-orange-600" />
            </div>
          </Card>
        </div>

        {/* Daily Revenue Chart */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Daily Revenue</h3>
          <div className="space-y-2">
            {revenueReport.daily_revenue?.map((day, index) => (
              <div key={index} className="flex justify-between items-center">
                <span className="text-sm text-gray-600">{formatDate(day.date)}</span>
                <div className="flex items-center gap-4">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full" 
                      style={{ 
                        width: `${(day.revenue / Math.max(...revenueReport.daily_revenue.map(d => d.revenue))) * 100}%` 
                      }}
                    />
                  </div>
                  <span className="text-sm font-medium w-20 text-right">
                    {formatCurrency(day.revenue)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    )
  }

  const renderVisitsReport = () => {
    if (!visitsReport) return null

    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Visits</p>
                <p className="text-2xl font-bold text-blue-600">
                  {visitsReport.total_visits || 0}
                </p>
              </div>
              <Users className="w-8 h-8 text-blue-600" />
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Completed Visits</p>
                <p className="text-2xl font-bold text-green-600">
                  {visitsReport.completed_visits || 0}
                </p>
              </div>
              <Calendar className="w-8 h-8 text-green-600" />
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Completion Rate</p>
                <p className="text-2xl font-bold text-purple-600">
                  {visitsReport.completion_rate || 0}%
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-600" />
            </div>
          </Card>
        </div>

        {/* Visits by Status */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Visits by Status</h3>
          <div className="space-y-2">
            {visitsReport.visits_by_status?.map((status, index) => (
              <div key={index} className="flex justify-between items-center">
                <span className="text-sm text-gray-600 capitalize">
                  {status.status.replace('_', ' ')}
                </span>
                <div className="flex items-center gap-4">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full" 
                      style={{ 
                        width: `${(status.count / visitsReport.total_visits) * 100}%` 
                      }}
                    />
                  </div>
                  <span className="text-sm font-medium w-20 text-right">
                    {status.count}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    )
  }

  const renderDoctorSharesReport = () => {
    if (!doctorSharesReport) return null

    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Doctor Shares</p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(doctorSharesReport.total_doctor_shares || 0)}
                </p>
              </div>
              <Users className="w-8 h-8 text-blue-600" />
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Center Shares</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(doctorSharesReport.total_center_shares || 0)}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-green-600" />
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Average Share %</p>
                <p className="text-2xl font-bold text-purple-600">
                  {doctorSharesReport.average_share_percentage || 0}%
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-600" />
            </div>
          </Card>
        </div>

        {/* Doctor Performance */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Doctor Performance</h3>
          <div className="space-y-4">
            {doctorSharesReport.doctor_performance?.map((doctor, index) => (
              <div key={index} className="border rounded p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-semibold">Dr. {doctor.name}</h4>
                    <p className="text-sm text-gray-500">{doctor.specialty}</p>
                  </div>
                  <span className="text-sm font-medium text-blue-600">
                    {doctor.share_percentage}% share
                  </span>
                </div>
                
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Total Visits</p>
                    <p className="font-semibold">{doctor.total_visits}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Doctor Share</p>
                    <p className="font-semibold text-green-600">
                      {formatCurrency(doctor.doctor_share)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Center Share</p>
                    <p className="font-semibold text-blue-600">
                      {formatCurrency(doctor.center_share)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Reports & Analytics</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => handleExport('csv')}
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="border rounded px-3 py-1"
            />
            <span className="text-gray-500">to</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="border rounded px-3 py-1"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4" />
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="border rounded px-3 py-1"
            >
              <option value="revenue">Revenue Report</option>
              <option value="visits">Visits Report</option>
              <option value="doctor-shares">Doctor Shares Report</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Report Content */}
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Spinner size="lg" />
        </div>
      ) : (
        <>
          {reportType === 'revenue' && renderRevenueReport()}
          {reportType === 'visits' && renderVisitsReport()}
          {reportType === 'doctor-shares' && renderDoctorSharesReport()}
        </>
      )}
    </div>
  )
}

export default ReportsPage