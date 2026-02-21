import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { registerStudent } from '../services/authService';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!name || !email || !password) return;
    setError('');
    setIsSubmitting(true);
    try {
      await registerStudent({ name, email, password });
      navigate('/student/dashboard', { replace: true });
    } catch (firebaseError) {
      setError(firebaseError.message || 'Registration failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="auth-page">
      <form onSubmit={handleSubmit} className="auth-form">
        <h2 className="auth-title">Register</h2>
        <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <input placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Creating...' : 'Create Account'}
        </button>
        {error && <p className="auth-error">{error}</p>}
        <p className="auth-subtle">
          Already registered? <Link to="/login">Sign in</Link>
        </p>
      </form>
    </section>
  );
}
