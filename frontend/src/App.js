import { BrowserRouter, Routes, Route } from "react-router-dom";
import TeacherAssignments from "./pages/TeacherAssignments";

import Login from "./pages/Login";
import LandingPage from "./pages/LandingPage";
import SignupPage from "./pages/SignupPage";
import VerifyEmailPage from "./pages/VerifyEmailPage";
import StudentDashboard from "./pages/StudentDashboard";
import TeacherDashboard from "./pages/TeacherDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import SecurityDashboard from "./pages/SecurityDashboard";
import RequireAuth from "./components/RequireAuth";

import CreateAssignment from "./pages/CreateAssignment";
import StudentAssignments from "./pages/StudentAssignments";
import AttemptAssignment from "./pages/AttemptAssignment";
import AdminTimetable from "./pages/AdminTimetable";
import AdminGatepassPolicy from "./pages/AdminGatepassPolicy";
import AdminCampusGates from "./pages/AdminCampusGates";
import ParentDashboard from "./pages/ParentDashboard";
import ParentRegister from "./pages/ParentRegister";

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* Login */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/parent/register" element={<ParentRegister />} />
        <Route
          path="/parent"
          element={<RequireAuth allowedRoles={["parent"]}><ParentDashboard /></RequireAuth>}
        />

        {/* Student */}
        <Route
          path="/student"
          element={<RequireAuth allowedRoles={["student"]}><StudentDashboard /></RequireAuth>}
        />

        <Route
          path="/student/assignments"
          element={<RequireAuth allowedRoles={["student"]}><StudentAssignments /></RequireAuth>}
        />

        <Route
          path="/student/attempt/:id"
          element={<RequireAuth allowedRoles={["student"]}><AttemptAssignment /></RequireAuth>}
        />

        {/* Teacher / Mentor */}
        <Route
          path="/teacher"
          element={<RequireAuth allowedRoles={["teacher"]}><TeacherDashboard /></RequireAuth>}
        />

        <Route
          path="/mentor"
          element={<RequireAuth allowedRoles={["teacher"]}><TeacherDashboard /></RequireAuth>}
        />

        <Route
  path="/teacher/assignments"
  element={<RequireAuth allowedRoles={["teacher"]}><TeacherAssignments /></RequireAuth>}
/>

<Route
  path="/teacher/create-assignment"
  element={<RequireAuth allowedRoles={["teacher"]}><CreateAssignment /></RequireAuth>}
/>

        {/* Admin */}
        <Route
          path="/admin"
          element={<RequireAuth allowedRoles={["admin"]}><AdminDashboard /></RequireAuth>}
        />
        <Route
          path="/admin/timetable"
          element={<RequireAuth allowedRoles={["admin"]}><AdminTimetable /></RequireAuth>}
        />
        <Route
          path="/admin/gatepass-policy"
          element={<RequireAuth allowedRoles={["admin"]}><AdminGatepassPolicy /></RequireAuth>}
        />
        <Route
          path="/admin/campus-gates"
          element={<RequireAuth allowedRoles={["admin"]}><AdminCampusGates /></RequireAuth>}
        />

        <Route
          path="/security"
          element={<RequireAuth allowedRoles={["security"]}><SecurityDashboard /></RequireAuth>}
        />

      </Routes>
    </BrowserRouter>
  );
}

export default App;
