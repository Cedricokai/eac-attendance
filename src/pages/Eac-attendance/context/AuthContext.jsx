import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Check for existing session on initial load
  useEffect(() => {
    async function loadUser() {
      try {
        // In a real app, you would verify the session with your backend
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
      } catch (error) {
        console.error('Failed to load user session', error);
      } finally {
        setLoading(false);
      }
    }
    loadUser();
  }, []);

  const login = async (email, password) => {
    try {
      // In a real app, you would call your authentication API here
      // This is a mock implementation
      const mockUsers = {
        'admin@example.com': {
          id: 1,
          name: 'Admin User',
          email: 'admin@example.com',
          role: 'admin',
          avatar: 'A'
        },
        'manager@example.com': {
          id: 2,
          name: 'Manager User',
          email: 'manager@example.com',
          role: 'manager',
          avatar: 'M'
        },
        'hr@example.com': {
          id: 3,
          name: 'HR User',
          email: 'hr@example.com',
          role: 'hr',
          avatar: 'H'
        }
      };

      if (!mockUsers[email] || password !== 'password123') {
        throw new Error('Invalid credentials');
      }

      const authenticatedUser = mockUsers[email];
      setUser(authenticatedUser);
      localStorage.setItem('user', JSON.stringify(authenticatedUser));
      navigate('/dashboard');
      return authenticatedUser;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    navigate('/login');
  };

  const updateUser = (updatedUserData) => {
    const updatedUser = { ...user, ...updatedUserData };
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  const value = {
    user,
    loading,
    login,
    logout,
    updateUser,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}