import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSupabase } from '../../hooks/useSupabase'; // <-- Fixed path
import { Loader2 } from 'lucide-react';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useSupabase();
  const location = useLocation();
  const [showLoading, setShowLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowLoading(false);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);

  console.log('[ProtectedRoute] User:', user?.id, 'Loading:', loading, 'ShowLoading:', showLoading);

  if (loading || showLoading) {
    return (
      <div className="min-h-screen bg-shamrock-darkest flex items-center justify-center text-gray-400">
        <div className="text-center">
          <Loader2 className="h-8 w-8 text-shamrock animate-spin mx-auto mb-3" />
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    console.log('[ProtectedRoute] No user, redirecting to login');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

export default ProtectedRoute;