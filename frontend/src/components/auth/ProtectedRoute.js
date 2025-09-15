import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const ProtectedRoute = ({ children, roles = [] }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  console.log('🛡️ ProtectedRoute check:', {
    loading,
    user: user ? { email: user.email, role: user.role } : null,
    requiredRoles: roles,
    currentPath: location.pathname
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Laden...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    console.log('❌ No user found, redirecting to login');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles.length > 0 && !roles.includes(user.role)) {
    console.log(`❌ User role "${user.role}" not in required roles:`, roles);
    return <Navigate to="/jobs" replace />;
  }

  console.log('✅ ProtectedRoute access granted');
  return children;
};

export default ProtectedRoute;
