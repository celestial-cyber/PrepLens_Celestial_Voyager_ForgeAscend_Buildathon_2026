import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import Loader from './Loader';
import { getCurrentUserRole, subscribeToStudentAuth } from '../../services/authService';

export default function ProtectedRoute({ children, redirectPath = '/login', allowedRoles = [] }) {
  const location = useLocation();
  const [isChecking, setIsChecking] = useState(true);
  const [student, setStudent] = useState(null);

  useEffect(() => {
    const unsubscribe = subscribeToStudentAuth((user) => {
      setStudent(user);
      setIsChecking(false);
    });
    return unsubscribe;
  }, []);

  if (isChecking) {
    return <Loader label="Checking authentication..." />;
  }

  if (!student) {
    return <Navigate to={redirectPath} replace state={{ from: location.pathname }} />;
  }

  if (allowedRoles.length > 0) {
    const role = getCurrentUserRole();
    if (!role || !allowedRoles.includes(role)) {
      const fallback = role === 'admin'
        ? '/admin/dashboard'
        : role === 'student'
          ? '/student/dashboard'
          : redirectPath;
      return <Navigate to={fallback} replace />;
    }
  }

  return children;
}
