import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import { AuthProvider, useAuth } from './context/AuthContext';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Navbar />
          <main className="container mx-auto px-4 py-8 max-w-6xl">
            <Routes>
              <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
              <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/" element={<Navigate to="/dashboard" />} />
            </Routes>
          </main>
        </div>
      </Router>
    </AuthProvider>
  );
}

// Protected route component
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  
  if (loading) return (
    <div className="flex justify-center items-center min-h-64">
      <div className="text-lg text-gray-600">Loading...</div>
    </div>
  );
  
  return user ? children : <Navigate to="/login" />;
}

// Public route component (redirect if authenticated)
function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  
  if (loading) return (
    <div className="flex justify-center items-center min-h-64">
      <div className="text-lg text-gray-600">Loading...</div>
    </div>
  );
  
  return user ? <Navigate to="/dashboard" /> : children;
}

export default App;
