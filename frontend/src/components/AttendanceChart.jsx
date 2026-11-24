import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function AttendanceChart() {
  // dummy data for now (we will connect backend later)
  const data = [
    { month: "Jan", attendance: 85 },
    { month: "Feb", attendance: 90 },
    { month: "Mar", attendance: 78 },
    { month: "Apr", attendance: 92 },
  ];

  return (
    <div className="bg-white p-4 rounded-xl shadow">
      <h2 className="text-lg font-semibold mb-4">Attendance</h2>

      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data}>
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="attendance" fill="#3b82f6" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}