import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Chip,
  Divider,
  Snackbar,
  Alert,
  CircularProgress,
  Tooltip,
  useTheme,
  useMediaQuery,
  Paper,
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import SyncIcon from '@mui/icons-material/Sync';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import SecurityIcon from '@mui/icons-material/Security';
import LogoutIcon from '@mui/icons-material/Logout';
import ChildCareIcon from '@mui/icons-material/ChildCare';
import MenuIcon from '@mui/icons-material/Menu';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { syncService } from '../services/api';

const DRAWER_WIDTH = 270;

export const Layout = () => {
  const {
    user,
    role,
    isAdmin,
    isRegistrationHost,
    isViewer,
    canAccessParticipants,
    canSyncSheet,
    canManageUsers,
    logout,
  } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [mobileOpen, setMobileOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'info' });

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Role-based Navigation Items
  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: <DashboardIcon />, visible: true },
    { label: 'Participant Directory', path: '/participants', icon: <PeopleIcon />, visible: canAccessParticipants },
    { label: 'Google Form Sync', path: '/sync', icon: <SyncIcon />, visible: canSyncSheet },
    { label: 'User Management', path: '/users', icon: <ManageAccountsIcon />, visible: canManageUsers },
  ].filter((item) => item.visible);

  const handleQuickSync = async () => {
    setSyncing(true);
    try {
      const res = await syncService.triggerSync({ use_sample: true });
      setToast({
        open: true,
        message: res.message || 'Synced successfully with Google Form responses!',
        severity: 'success',
      });
      window.dispatchEvent(new CustomEvent('participants-synced'));
    } catch (err) {
      setToast({
        open: true,
        message: err.response?.data?.message || err.message || 'Sync failed',
        severity: 'error',
      });
    } finally {
      setSyncing(false);
    }
  };

  const drawerContent = (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        bgcolor: '#25091e',
        backgroundImage: 'linear-gradient(180deg, #25091e 0%, #350c2a 50%, #1f0718 100%)',
        color: 'white',
      }}
    >
      {/* Brand Header */}
      <Box
        sx={{
          p: 2.5,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          cursor: 'pointer',
        }}
        onClick={() => {
          navigate('/dashboard');
          if (isMobile) setMobileOpen(false);
        }}
      >
        <Box
          sx={{
            bgcolor: '#e85d26',
            color: 'white',
            p: 1.1,
            borderRadius: 2.2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(232, 93, 38, 0.45)',
          }}
        >
          <ChildCareIcon sx={{ fontSize: 26 }} />
        </Box>
        <Box>
          <Typography variant="subtitle1" fontWeight="900" sx={{ color: 'white', lineHeight: 1.15 }}>
            Child Care Summit
          </Typography>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', letterSpacing: '0.04em', fontSize: '0.68rem', fontWeight: 600 }}>
            PARTICIPANT MANAGEMENT
          </Typography>
        </Box>
      </Box>

      {/* Role Privilege Tag */}
      <Box sx={{ px: 2.5, pt: 2, pb: 1 }}>
        <Chip
          label={`ROLE: ${user?.role === 'REGISTRATION_HOST' ? 'REGISTRATION HOST' : user?.role === 'VIEWER' ? 'VIEWER' : 'ADMIN'}`}
          size="small"
          sx={{
            width: '100%',
            bgcolor: user?.role === 'REGISTRATION_HOST' ? 'rgba(232, 93, 38, 0.18)' : user?.role === 'VIEWER' ? 'rgba(45, 130, 198, 0.18)' : 'rgba(80, 21, 63, 0.35)',
            color: user?.role === 'REGISTRATION_HOST' ? '#ff9d6e' : user?.role === 'VIEWER' ? '#7dd3fc' : '#fbcfe8',
            border: `1px solid ${user?.role === 'REGISTRATION_HOST' ? 'rgba(232, 93, 38, 0.4)' : user?.role === 'VIEWER' ? 'rgba(45, 130, 198, 0.4)' : 'rgba(255, 255, 255, 0.2)'}`,
            fontWeight: 800,
            fontSize: '0.68rem',
            letterSpacing: '0.05em',
          }}
        />
      </Box>

      {/* Main Navigation List */}
      <Box sx={{ flexGrow: 1, px: 1.5, py: 1 }}>
        <List sx={{ gap: 0.8, display: 'flex', flexDirection: 'column' }}>
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <ListItem key={item.path} disablePadding>
                <ListItemButton
                  onClick={() => {
                    navigate(item.path);
                    if (isMobile) setMobileOpen(false);
                  }}
                  sx={{
                    borderRadius: 2,
                    py: 1.2,
                    px: 2,
                    bgcolor: isActive ? '#50153f' : 'transparent',
                    backgroundImage: isActive ? 'linear-gradient(135deg, #50153f 0%, #6f1c57 100%)' : 'none',
                    color: isActive ? 'white' : 'rgba(255, 255, 255, 0.75)',
                    boxShadow: isActive ? '0 4px 14px rgba(80, 21, 63, 0.45)' : 'none',
                    borderLeft: isActive ? '3.5px solid #e85d26' : '3.5px solid transparent',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      bgcolor: isActive ? '#50153f' : 'rgba(255, 255, 255, 0.08)',
                      color: 'white',
                      transform: 'translateX(3px)',
                    },
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: 40,
                      color: isActive ? 'white' : 'rgba(255, 255, 255, 0.65)',
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.label}
                    primaryTypographyProps={{
                      fontWeight: isActive ? 700 : 500,
                      fontSize: '0.9rem',
                    }}
                  />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
      </Box>

      {/* Quick Sync Card in Sidebar (Admin Only) */}
      {canSyncSheet && (
        <Box sx={{ p: 2, m: 1.5, bgcolor: 'rgba(255, 255, 255, 0.04)', borderRadius: 2.5, border: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)', display: 'block', mb: 1, fontSize: '0.72rem' }}>
            GOOGLE FORM PIPELINE
          </Typography>
          <Button
            fullWidth
            variant="contained"
            size="small"
            onClick={handleQuickSync}
            disabled={syncing}
            startIcon={
              syncing ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                <SyncIcon
                  sx={{
                    animation: syncing ? 'spin 1.5s linear infinite' : 'none',
                    '@keyframes spin': {
                      '0%': { transform: 'rotate(0deg)' },
                      '100%': { transform: 'rotate(360deg)' },
                    },
                  }}
                />
              )
            }
            sx={{
              fontWeight: 800,
              fontSize: '0.78rem',
              bgcolor: '#e85d26',
              '&:hover': { bgcolor: '#cf4d1a' },
              boxShadow: '0 4px 12px rgba(232, 93, 38, 0.35)',
            }}
          >
            {syncing ? 'Syncing...' : 'Sync Form Sheet'}
          </Button>
        </Box>
      )}

      <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.08)' }} />

      {/* Bottom User Profile Section */}
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: 'rgba(0, 0, 0, 0.2)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, overflow: 'hidden' }}>
          <Avatar sx={{ width: 38, height: 38, bgcolor: '#e85d26', fontWeight: 800, fontSize: '0.95rem' }}>
            {user?.username?.charAt(0).toUpperCase() || 'A'}
          </Avatar>
          <Box sx={{ overflow: 'hidden' }}>
            <Typography variant="subtitle2" fontWeight="700" color="white" noWrap sx={{ fontSize: '0.85rem' }}>
              {user?.first_name ? `${user.first_name} ${user.last_name}` : user?.username}
            </Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)', display: 'block', fontSize: '0.7rem' }} noWrap>
              {user?.email || 'admin@childcaresummit.org'}
            </Typography>
          </Box>
        </Box>

        <Tooltip title="Logout">
          <IconButton onClick={handleLogout} sx={{ color: 'rgba(255, 255, 255, 0.6)', '&:hover': { color: 'error.main', bgcolor: 'rgba(239, 68, 68, 0.1)' } }}>
            <LogoutIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Mobile Top App Bar */}
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml: { md: `${DRAWER_WIDTH}px` },
          bgcolor: 'background.paper',
          color: 'text.primary',
          borderBottom: '1px solid #e2e8f0',
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 1, display: { md: 'none' } }}
            >
              <MenuIcon />
            </IconButton>
            <Typography variant="subtitle1" fontWeight="900" sx={{ color: '#50153f' }}>
              National Child Care Summit
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Chip
              label="ADMIN PORTAL"
              size="small"
              color="primary"
              variant="outlined"
              sx={{ fontWeight: 700, fontSize: '0.72rem' }}
            />
            <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: '0.85rem', fontWeight: 700 }}>
              {user?.username?.charAt(0).toUpperCase() || 'A'}
            </Avatar>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Navigation Drawer Component */}
      <Box
        component="nav"
        sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}
        aria-label="summit navigation"
      >
        {/* Mobile Temporary Drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_WIDTH, border: 'none' },
          }}
        >
          {drawerContent}
        </Drawer>

        {/* Desktop Permanent Drawer */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: DRAWER_WIDTH,
              border: 'none',
              boxShadow: '4px 0 24px rgba(15, 41, 66, 0.08)',
            },
          }}
          open
        >
          {drawerContent}
        </Drawer>
      </Box>

      {/* Main Content Area */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, sm: 3, md: 4 },
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          mt: '64px', // Offset for the top AppBar
          minHeight: '100vh',
          bgcolor: '#f8fafc',
        }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </Box>

      {/* Global Feedback Toast */}
      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={() => setToast({ ...toast, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setToast({ ...toast, open: false })}
          severity={toast.severity}
          variant="filled"
          sx={{ borderRadius: 2 }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};
