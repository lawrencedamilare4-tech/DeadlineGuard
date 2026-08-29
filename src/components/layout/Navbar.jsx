import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CloudLightning, Wallet, LogOut, Settings } from 'lucide-react';
import { useSupabase } from '../../hooks/useSupabase';
import { signOut } from '../../services/supabase/auth';

const Navbar = () => {
  const { user } = useSupabase();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <nav className="bg-white dark:bg-shamrock-darkest border-b border-gray-200 dark:border-shamrock-darker">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center">
            <Link to="/" className="flex items-center">
              <CloudLightning className="h-8 w-8 text-shamrock" />
              <span className="ml-2 text-xl font-bold text-gray-900 dark:text-white">DeadlineGuard</span>
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <Link
                  to="/dashboard"
                  className="text-gray-700 dark:text-gray-300 hover:text-shamrock dark:hover:text-shamrock-light px-3 py-2 rounded-md text-sm font-medium"
                >
                  Dashboard
                </Link>
                <Link
                  to="/settings"
                  className="text-gray-700 dark:text-gray-300 hover:text-shamrock dark:hover:text-shamrock-light px-3 py-2 rounded-md text-sm font-medium flex items-center"
                >
                  <Settings className="h-4 w-4 mr-1" />
                  Settings
                </Link>
                <button
                  onClick={handleSignOut}
                  className="text-gray-700 dark:text-gray-300 hover:text-shamrock dark:hover:text-shamrock-light px-3 py-2 rounded-md text-sm font-medium flex items-center"
                >
                  <LogOut className="h-4 w-4 mr-1" />
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/dashboard/overview"
                  className="btn-primary text-sm"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;