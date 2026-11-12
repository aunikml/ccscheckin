import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Box, CircularProgress, Typography } from '@mui/material';

export const ProtectedRoute = ({ children, adminOnly = false, hostOrAdmin = false }) => {
  const { isAuthenticated, isAdmin, canAccessParticipants, loading, user } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', justifyContent: 'center', alignItems: 'center', gap: 2 }}>
        <CircularProgress color="primary" />
        <Typography color="text.secondary">Authenticating Session...</Typography>
      </Box>
    );
  }

  // Not logged in -> send to login page
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Route requires Admin role only
  if (adminOnly && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  // Route requires Host or Admin role
  if (hostOrAdmin && !canAccessParticipants) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};
