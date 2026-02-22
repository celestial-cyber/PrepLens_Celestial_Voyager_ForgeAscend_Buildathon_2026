import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { loginStudent } from '../services/authService';
import { hasFirebaseConfig } from '../firebase';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from || '/student/dashboard';

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!email || !password) return;
    setError('');
    setIsSubmitting(true);
    try {
      const user = await loginStudent({ email, password });
      const normalized = String(user?.email || email).toLowerCase();
      const target = normalized === 'admin@email.com' ? '/admin/dashboard' : from;
      navigate(target, { replace: true });
    } catch (firebaseError) {
      setError(
        firebaseError.message ||
        'Login failed. Use demo emails: admin@email.com or student@email.com.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="auth-page">
      <form onSubmit={handleSubmit} className="auth-form">
        <h2 className="auth-title">PrepLens Login</h2>
        <p className="auth-subtle">Sign in to continue to your dashboard.</p>
        {hasFirebaseConfig ? (
          <p className="auth-subtle">Firebase auth is enabled for this build.</p>
        ) : (
          <p className="auth-subtle">Demo users: admin@email.com, student@email.com (password: hello)</p>
        )}
        <input placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Signing In...' : 'Sign In'}
        </button>
        {error && <p className="auth-error">{error}</p>}
        <p className="auth-subtle">
          New user? <Link to="/register">Create account</Link>
        </p>
      </form>
    </section>
  );
}
