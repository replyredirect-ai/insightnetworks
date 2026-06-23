import { Navigate } from 'react-router-dom';
import xceednetApi from '../services/xceednetApi';

export default function ProtectedRoute({ children, requiredType }) {
  const isAuthenticated = xceednetApi.isAuthenticated();
  const userType = xceednetApi.getUserType();

  if (!isAuthenticated) {
    // Redirect to dashboard login page
    return <Navigate to="/dashboard" replace />;
  }

  // Check if user has required type (if specified)
  if (requiredType && userType !== requiredType) {
    // Redirect to appropriate dashboard
    if (userType === 'subscriber') {
      return <Navigate to="/subscriber-dashboard" replace />;
    } else {
      return <Navigate to="/admin-dashboard" replace />;
    }
  }

  return children;
}
