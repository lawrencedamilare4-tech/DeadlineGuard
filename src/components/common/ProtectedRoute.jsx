import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSupabase } from '../../hooks/useSupabase';
import { Loader2 } from 'lucide-react';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useSupabase();
  const location = useLocation();
  const [wait, setWait] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setWait(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  if (loading || wait) {
    return (
      <div className="min-h-screen bg-shamrock-darkest flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-shamrock animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

export default ProtectedRoute;