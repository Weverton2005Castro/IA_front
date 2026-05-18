import { Navigate, Route, Routes } from 'react-router-dom';
import Login from '../pages/auth/Login.jsx';
import ProtectedRoute from '../pages/auth/ProtectedRoute.jsx';
import Home from '../pages/windows/Home.jsx';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route
        path="/home"
        element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        }
      />
      <Route path="/Home" element={<Navigate to="/home" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
