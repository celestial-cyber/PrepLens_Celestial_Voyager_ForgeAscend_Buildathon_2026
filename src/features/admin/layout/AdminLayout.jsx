import { Link, Outlet, useNavigate } from 'react-router-dom';
import { logoutStudent } from '../../../services/authService';

export default function AdminLayout() {
  const navigate = useNavigate();

  async function handleLogout() {
    try {
      await logoutStudent();
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      navigate('/login');
    }
  }

  return (
    <div className="admin-shell">
      <nav className="admin-nav">
        <div className="admin-brand">PrepLens Admin</div>
        <div className="admin-nav-links">
          <Link to="/admin/dashboard">Dashboard</Link>
          <Link to="/admin/students">Students</Link>
          <Link to="/admin/create-task">Create Task</Link>
          <button type="button" onClick={handleLogout}>Logout</button>
        </div>
      </nav>

      <div className="admin-body">
        <aside className="admin-sidebar" aria-label="Admin section links">
          <Link to="/admin/dashboard">Dashboard</Link>
          <Link to="/admin/students">Students</Link>
          <Link to="/admin/create-task">Create Task</Link>
        </aside>
        <main className="admin-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
