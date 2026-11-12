import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('access_token');
      const savedUser = localStorage.getItem('user_info');

      if (token) {
        if (savedUser) {
          try {
            setUser(JSON.parse(savedUser));
          } catch (e) {
            console.error('Failed to parse saved user', e);
          }
        }
        try {
          const freshUser = await authService.getCurrentUser();
          setUser(freshUser);
          localStorage.setItem('user_info', JSON.stringify(freshUser));
        } catch (err) {
          console.warn('Token validation failed, logging out', err);
          authService.logout();
          setUser(null);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (username, password) => {
    const data = await authService.login(username, password);
    setUser(data.user);
    return data;
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  const role = user?.role || 'VIEWER';
  const isAdmin = Boolean(user && (user.role === 'ADMIN' || user.is_admin));
  const isRegistrationHost = Boolean(user && user.role === 'REGISTRATION_HOST');
  const isViewer = Boolean(user && user.role === 'VIEWER');

  const canAccessParticipants = isAdmin || isRegistrationHost;
  const canCheckin = isAdmin || isRegistrationHost;
  const canAddParticipant = isAdmin || isRegistrationHost;
  const canDeleteParticipant = isAdmin;
  const canSyncSheet = isAdmin;
  const canManageUsers = isAdmin;
  const canExportReports = isAdmin || isRegistrationHost;

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        loading,
        isAuthenticated: Boolean(user),
        isAdmin,
        isRegistrationHost,
        isViewer,
        canAccessParticipants,
        canCheckin,
        canAddParticipant,
        canDeleteParticipant,
        canSyncSheet,
        canManageUsers,
        canExportReports,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

