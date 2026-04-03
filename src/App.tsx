import { Navigate, Route, Routes } from 'react-router-dom'
import Auth from './Auth.jsx'
import Dashboard from './Dashboard.jsx'
import Admin from './Admin.jsx'
import AdminAnnouncements from './AdminAnnouncements.jsx'
import AdminClasses from './AdminClasses.jsx'
import AdminLayout from './AdminLayout.jsx'
import AdminReservationsOverview from './AdminReservationsOverview.jsx'
import BookClasses from './BookClasses.jsx'
import MyPage from './MyPage.jsx'
import MyReservations from './MyReservations.jsx'
import ProtectedRoute from './ProtectedRoute'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Auth />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/book"
        element={
          <ProtectedRoute>
            <BookClasses />
          </ProtectedRoute>
        }
      />
      <Route
        path="/my-reservations"
        element={
          <ProtectedRoute>
            <MyReservations />
          </ProtectedRoute>
        }
      />
      <Route
        path="/my-page"
        element={
          <ProtectedRoute>
            <MyPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute requireAdmin redirectTo="/">
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Admin />} />
        <Route path="classes" element={<AdminClasses />} />
        <Route path="reservations" element={<AdminReservationsOverview />} />
        <Route path="announcements" element={<AdminAnnouncements />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
