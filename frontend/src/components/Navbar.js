import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg">
      <div className="container mx-auto px-4 py-4 max-w-6xl">
        <div className="flex justify-between items-center">
          <Link to="/" className="text-2xl font-bold hover:text-indigo-200 transition-colors">
            🐳 DockerPlatform
          </Link>
          
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <span className="text-sm opacity-90 hidden sm:block">
                  Welcome, {user.username}!
                </span>
                <Link 
                  to="/dashboard" 
                  className="px-3 py-2 rounded-md hover:bg-white hover:bg-opacity-20 transition-colors"
                >
                  Dashboard
                </Link>
                <button 
                  onClick={handleLogout}
                  className="px-4 py-2 bg-white bg-opacity-20 border border-white border-opacity-30 rounded-md hover:bg-opacity-30 transition-colors"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link 
                  to="/login" 
                  className="px-3 py-2 rounded-md hover:bg-white hover:bg-opacity-20 transition-colors"
                >
                  Login
                </Link>
                <Link 
                  to="/register" 
                  className="px-4 py-2 bg-white bg-opacity-20 border border-white border-opacity-30 rounded-md hover:bg-opacity-30 transition-colors"
                >
                  Register
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