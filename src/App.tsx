import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppProvider, useApp } from './context/AppContext'
import Layout from './components/Layout'
import HomePage from './pages/HomePage'
import ComparePage from './pages/ComparePage'
import MessagePage from './pages/MessagePage'
import ProfilePage from './pages/ProfilePage'
import LoginPage from './pages/LoginPage'
import BindPage from './pages/BindPage'
import AchievementsPage from './pages/AchievementsPage'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useApp()
  if (loading) return <div className="app-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>加载中…</div>
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<Layout />}>
        <Route index element={<RequireAuth><HomePage /></RequireAuth>} />
        <Route path="compare" element={<RequireAuth><ComparePage /></RequireAuth>} />
        <Route path="message" element={<RequireAuth><MessagePage /></RequireAuth>} />
        <Route path="profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />
      </Route>
      <Route path="/bind" element={<RequireAuth><BindPage /></RequireAuth>} />
      <Route path="/achievements" element={<RequireAuth><AchievementsPage /></RequireAuth>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <AppRoutes />
      </AppProvider>
    </BrowserRouter>
  )
}
