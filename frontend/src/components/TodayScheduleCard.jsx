import React from "react";

const TodayScheduleCard = ({ title, day, schedule, showBatch = false }) => (
  <div className="mt-6 bg-white p-5 rounded-2xl shadow">
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-4">
      <h3 className="text-lg font-bold text-gray-800">{title}</h3>
      <span className="text-sm font-medium text-indigo-600">{day}</span>
    </div>

    {schedule.length === 0 ? (
      <p className="text-gray-500">No classes scheduled for today.</p>
    ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {schedule.map((entry) => (
          <div
            key={entry._id}
            className="border border-indigo-100 bg-indigo-50 rounded-xl p-4"
          >
            <p className="font-bold text-indigo-700">
              {entry.startTime} - {entry.endTime}
            </p>
            <p className="mt-1 font-semibold text-gray-800">
              {entry.subject?.name}
            </p>
            {showBatch && (
              <p className="text-sm text-gray-600">{entry.batch?.name}</p>
            )}
            {!showBatch && (
              <p className="text-sm text-gray-600">{entry.teacher?.name}</p>
            )}
          </div>
        ))}
      </div>
    )}
  </div>
);

export default TodayScheduleCard;
