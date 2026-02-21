import React, { useEffect, useState } from 'react'
import { Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom'
import AdminLogin from './pages/AdminLogin'
import AdminDashboard from './pages/AdminDashboard'
import StudentList from './pages/StudentList'
import CreateTask from './pages/CreateTask'
import { auth, onAuthState, getUserDoc, signOut } from './firebase/config'

function RequireAdmin({ children }) {
  const [checking, setChecking] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const unsub = onAuthState(async user => {
      if (!user) {
        setIsAdmin(false)
        setChecking(false)
        navigate('/login')
        return
      }
      try {
        const doc = await getUserDoc(user.uid)
        if (!doc || doc.role !== 'admin') {
          await signOut()
          setIsAdmin(false)
          navigate('/login')
          return
        }
        setIsAdmin(true)
      } catch (err) {
        setIsAdmin(false)
      } finally {
        setChecking(false)
      }
    })
    return () => unsub()
  }, [navigate])

  if (checking) return <div className="p-6">Checking access...</div>
  return isAdmin ? children : <Navigate to="/login" />
}

export default function App() {
  const [user, setUser] = useState(null)
  useEffect(() => {
    const unsub = onAuthState(u => setUser(u))
    return () => unsub()
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <header className="p-4 bg-white dark:bg-gray-800 shadow">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="font-bold">PrepLens — Admin</div>
          <nav className="space-x-4">
            <Link to="/admin" className="text-sm">Dashboard</Link>
            <Link to="/students" className="text-sm">Students</Link>
            <Link to="/create-task" className="text-sm">Create Task</Link>
            {user ? <button onClick={() => signOut()} className="text-sm">Sign out</button> : <Link to="/login" className="text-sm">Sign in</Link>}
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto">
        <Routes>
          <Route path="/login" element={<AdminLogin />} />
          <Route path="/admin" element={<RequireAdmin><AdminDashboard /></RequireAdmin>} />
          <Route path="/students" element={<RequireAdmin><StudentList /></RequireAdmin>} />
          <Route path="/create-task" element={<RequireAdmin><CreateTask /></RequireAdmin>} />
          <Route path="/" element={<Navigate to="/admin" replace />} />
        </Routes>
      </main>
    </div>
  )
}
