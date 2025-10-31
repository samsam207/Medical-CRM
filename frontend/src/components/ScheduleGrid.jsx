import React from 'react'

const days = [
  { label: 'Sun', value: 0 },
  { label: 'Mon', value: 1 },
  { label: 'Tue', value: 2 },
  { label: 'Wed', value: 3 },
  { label: 'Thu', value: 4 },
  { label: 'Fri', value: 5 },
  { label: 'Sat', value: 6 }
]

const hours = Array.from({ length: 24 }, (_, i) => ({
  hour: i,
  display: i === 0 ? '12 AM' : i < 12 ? `${i} AM` : i === 12 ? '12 PM' : `${i - 12} PM`
}))

const ScheduleGrid = ({ scheduleData = {}, editable = true, onChange }) => {
  const isAvailable = (day, hour) => {
    if (!scheduleData[day]) return false
    return scheduleData[day][hour] === true
  }

  const toggleAvailability = (day, hour) => {
    if (!editable) return

    const newSchedule = { ...scheduleData }
    if (!newSchedule[day]) {
      newSchedule[day] = {}
    }
    newSchedule[day][hour] = !isAvailable(day, hour)

    if (onChange) {
      onChange(newSchedule)
    }
  }

  const selectAllDay = (day) => {
    if (!editable) return

    const newSchedule = { ...scheduleData }
    newSchedule[day] = {}
    for (let i = 0; i < 24; i++) {
      newSchedule[day][i] = true
    }

    if (onChange) {
      onChange(newSchedule)
    }
  }

  const clearDay = (day) => {
    if (!editable) return

    const newSchedule = { ...scheduleData }
    newSchedule[day] = {}
    for (let i = 0; i < 24; i++) {
      newSchedule[day][i] = false
    }

    if (onChange) {
      onChange(newSchedule)
    }
  }

  const selectBusinessHours = () => {
    if (!editable) return

    const newSchedule = {}
    // Mark 8 AM to 6 PM (8-18) for all weekdays (Mon-Fri)
    for (let day = 1; day <= 5; day++) {
      newSchedule[day] = {}
      for (let hour = 8; hour < 18; hour++) {
        newSchedule[day][hour] = true
      }
    }

    if (onChange) {
      onChange({ ...scheduleData, ...newSchedule })
    }
  }

  return (
    <div className="schedule-grid-container">
      {editable && (
        <div className="schedule-grid-actions mb-4 flex gap-2">
          <button
            type="button"
            onClick={selectBusinessHours}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
          >
            Select Business Hours (Mon-Fri 8 AM - 6 PM)
          </button>
        </div>
      )}
      
      <div className="schedule-grid overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="border p-2 bg-gray-100 text-left">Hour</th>
              {days.map(({ label, value }) => (
                <th key={value} className="border p-2 bg-gray-100 text-center">
                  <div className="flex flex-col items-center gap-1">
                    <span>{label}</span>
                    {editable && (
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => selectAllDay(value)}
                          className="text-xs px-1 py-0.5 bg-green-500 text-white rounded hover:bg-green-600"
                          title="Select all"
                        >
                          All
                        </button>
                        <button
                          type="button"
                          onClick={() => clearDay(value)}
                          className="text-xs px-1 py-0.5 bg-red-500 text-white rounded hover:bg-red-600"
                          title="Clear all"
                        >
                          Clear
                        </button>
                      </div>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {hours.map(({ hour, display }) => (
              <tr key={hour}>
                <td className="border p-2 font-medium text-sm bg-gray-50">{display}</td>
                {days.map(({ value: day }) => (
                  <td
                    key={day}
                    className={`border p-1 cursor-pointer transition-colors ${
                      isAvailable(day, hour)
                        ? 'bg-green-100 hover:bg-green-200'
                        : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                    onClick={() => toggleAvailability(day, hour)}
                    style={editable ? {} : { cursor: 'default' }}
                  >
                    {editable && (
                      <div className="w-6 h-6 flex items-center justify-center">
                        {isAvailable(day, hour) ? '✓' : ''}
                      </div>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default ScheduleGrid

