import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import './studentLayout.css';

export default function StudentLayout() {
  return (
    <div className="student-shell">
      <Navbar />
      <main className="student-main">
        <Outlet />
      </main>
    </div>
  );
}
