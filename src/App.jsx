import { Navigate, Route, Routes } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import StudentLayout from './features/student/layout/StudentLayout';
import StudentDashboard from './features/student/pages/StudentDashboard';
import LogActivity from './features/student/pages/LogActivity';
import StudentNotifications from './features/student/pages/StudentNotifications';
import ProtectedRoute from './components/common/ProtectedRoute';
import AdminDashboard from './features/admin/pages/AdminDashboard';
import StudentList from './features/admin/pages/StudentList';
import CreateTask from './features/admin/pages/CreateTask';
import AdminLayout from './features/admin/layout/AdminLayout';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route
        path="/student"
        element={
          <ProtectedRoute allowedRoles={['student']}>
            <StudentLayout />
          </ProtectedRoute>
        }
      >
        <Route path="dashboard" element={<StudentDashboard />} />
        <Route path="log" element={<LogActivity />} />
        <Route path="log-activity" element={<LogActivity />} />
        <Route path="messages" element={<Navigate to="/student/notifications" replace />} />
        <Route path="notifications" element={<StudentNotifications />} />
      </Route>

      <Route path="/admin/login" element={<Navigate to="/login" replace />} />
      <Route
        path="/admin"
        element={
          <ProtectedRoute redirectPath="/login" allowedRoles={['admin']}>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="students" element={<StudentList />} />
        <Route path="create-task" element={<CreateTask />} />
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
