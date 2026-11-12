import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Paper,
  Chip,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  CircularProgress,
  Alert,
  Tooltip,
  Snackbar,
  Divider,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SecurityIcon from '@mui/icons-material/Security';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import BlockIcon from '@mui/icons-material/Block';
import { motion } from 'framer-motion';
import { usersService } from '../services/api';
import { useAuth } from '../context/AuthContext';

const ROLE_CONFIG = {
  ADMIN: {
    label: 'Admin',
    color: '#50153f',
    bg: 'rgba(80, 21, 63, 0.1)',
    border: 'rgba(80, 21, 63, 0.3)',
    icon: <AdminPanelSettingsIcon fontSize="small" />,
    description: 'Full site access (Dashboard, Participant Directory with Full CRUD & Exports, Google Form Sync, User Management)',
  },
  REGISTRATION_HOST: {
    label: 'Registration Host',
    color: '#e85d26',
    bg: 'rgba(232, 93, 38, 0.1)',
    border: 'rgba(232, 93, 38, 0.3)',
    icon: <HowToRegIcon fontSize="small" />,
    description: 'Can check in participants (D1/D2/Fast-track), view dashboard & participant list, add new participants, and print badges',
  },
  VIEWER: {
    label: 'Viewer',
    color: '#2d82c6',
    bg: 'rgba(45, 130, 198, 0.1)',
    border: 'rgba(45, 130, 198, 0.3)',
    icon: <VisibilityIcon fontSize="small" />,
    description: 'Can view real-time summit dashboard analytics and headcounts only',
  },
};

const INITIAL_FORM = {
  username: '',
  password: '',
  first_name: '',
  last_name: '',
  email: '',
  role: 'REGISTRATION_HOST',
  is_active: true,
};

export const UserManagement = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Delete confirmation
  const [deleteDialog, setDeleteDialog] = useState({ open: false, user: null });
  const [deleting, setDeleting] = useState(false);

  // Toast
  const [toast, setToast] = useState({ open: false, message: '', severity: 'info' });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await usersService.getAll();
      setUsers(Array.isArray(data) ? data : data.results || []);
    } catch (err) {
      console.error('Failed to load users', err);
      setToast({ open: true, message: 'Failed to load user directory.', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleOpenCreate = () => {
    setEditingUser(null);
    setFormData(INITIAL_FORM);
    setFormError('');
    setDialogOpen(true);
  };

  const handleOpenEdit = (user) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      password: '',
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      email: user.email || '',
      role: user.role || 'VIEWER',
      is_active: user.is_active !== undefined ? user.is_active : true,
    });
    setFormError('');
    setDialogOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formData.username.trim()) {
      setFormError('Username is required.');
      return;
    }
    if (!editingUser && !formData.password.trim()) {
      setFormError('Password is required for new accounts.');
      return;
    }

    setSubmitting(true);
    setFormError('');

    try {
      if (editingUser) {
        const payload = { ...formData };
        if (!payload.password.trim()) {
          delete payload.password; // Do not overwrite password if blank
        }
        await usersService.patch(editingUser.id, payload);
        setToast({ open: true, message: `Updated user '${formData.username}' successfully!`, severity: 'success' });
      } else {
        await usersService.create(formData);
        setToast({ open: true, message: `Created new user '${formData.username}'!`, severity: 'success' });
      }
      setDialogOpen(false);
      fetchUsers();
    } catch (err) {
      const msg = err.response?.data?.username?.[0] || err.response?.data?.detail || err.response?.data?.error || 'Failed to save user account.';
      setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.user) return;
    setDeleting(true);
    try {
      await usersService.delete(deleteDialog.user.id);
      setToast({ open: true, message: `User '${deleteDialog.user.username}' deleted.`, severity: 'success' });
      setDeleteDialog({ open: false, user: null });
      fetchUsers();
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.detail || 'Failed to delete user.';
      setToast({ open: true, message: msg, severity: 'error' });
    } finally {
      setDeleting(false);
    }
  };

  // Metrics
  const totalUsers = users.length;
  const adminCount = users.filter((u) => u.role === 'ADMIN').length;
  const hostCount = users.filter((u) => u.role === 'REGISTRATION_HOST').length;
  const viewerCount = users.filter((u) => u.role === 'VIEWER').length;

  return (
    <Box>
      {/* Page Header */}
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, gap: 2, mb: 3.5 }}>
        <Box>
          <Typography variant="h4" fontWeight="800" sx={{ color: '#0f172a' }}>
            User Management
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Role-Based Access Control (RBAC) • Manage Registration Hosts, Viewers, and Administrators
          </Typography>
        </Box>

        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpenCreate}
          sx={{ fontWeight: 800, borderRadius: 2.5, px: 2.5 }}
        >
          Add New User
        </Button>
      </Box>

      {/* Role Counts Summary Cards */}
      <Grid container spacing={2.5} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: '1px solid #e2e8f0', bgcolor: '#ffffff' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="caption" fontWeight="700" color="text.secondary" sx={{ textTransform: 'uppercase' }}>
                Total Accounts
              </Typography>
              <Box sx={{ p: 1, borderRadius: 2, bgcolor: '#f1f5f9', color: '#0f172a' }}>
                <ManageAccountsIcon fontSize="small" />
              </Box>
            </Box>
            <Typography variant="h4" fontWeight="900" sx={{ mt: 1, color: '#0f172a' }}>
              {totalUsers}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Active registered users
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: '1.5px solid rgba(80, 21, 63, 0.25)', bgcolor: 'rgba(80, 21, 63, 0.04)' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="caption" fontWeight="800" sx={{ color: '#50153f', textTransform: 'uppercase' }}>
                Administrators
              </Typography>
              <Box sx={{ p: 1, borderRadius: 2, bgcolor: 'rgba(80, 21, 63, 0.1)', color: '#50153f' }}>
                <AdminPanelSettingsIcon fontSize="small" />
              </Box>
            </Box>
            <Typography variant="h4" fontWeight="900" sx={{ mt: 1, color: '#50153f' }}>
              {adminCount}
            </Typography>
            <Typography variant="caption" sx={{ color: '#50153f', fontWeight: 600 }}>
              Full site & database access
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: '1.5px solid rgba(232, 93, 38, 0.25)', bgcolor: 'rgba(232, 93, 38, 0.04)' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="caption" fontWeight="800" sx={{ color: '#e85d26', textTransform: 'uppercase' }}>
                Registration Hosts
              </Typography>
              <Box sx={{ p: 1, borderRadius: 2, bgcolor: 'rgba(232, 93, 38, 0.1)', color: '#e85d26' }}>
                <HowToRegIcon fontSize="small" />
              </Box>
            </Box>
            <Typography variant="h4" fontWeight="900" sx={{ mt: 1, color: '#e85d26' }}>
              {hostCount}
            </Typography>
            <Typography variant="caption" sx={{ color: '#e85d26', fontWeight: 600 }}>
              Check-in & participant entry
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: '1.5px solid rgba(45, 130, 198, 0.25)', bgcolor: 'rgba(45, 130, 198, 0.04)' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="caption" fontWeight="800" sx={{ color: '#2d82c6', textTransform: 'uppercase' }}>
                Viewers
              </Typography>
              <Box sx={{ p: 1, borderRadius: 2, bgcolor: 'rgba(45, 130, 198, 0.1)', color: '#2d82c6' }}>
                <VisibilityIcon fontSize="small" />
              </Box>
            </Box>
            <Typography variant="h4" fontWeight="900" sx={{ mt: 1, color: '#2d82c6' }}>
              {viewerCount}
            </Typography>
            <Typography variant="caption" sx={{ color: '#2d82c6', fontWeight: 600 }}>
              Read-only dashboard view
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* User Directory Table Card */}
      <Card sx={{ borderRadius: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box>
              <Typography variant="h6" fontWeight="800" sx={{ color: '#0f172a' }}>
                User Accounts Directory
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Manage accounts, assign roles, and grant on-site permissions
              </Typography>
            </Box>
          </Box>

          {loading ? (
            <Box sx={{ py: 6, display: 'flex', justifyContent: 'center' }}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 2 }}>
              <Table>
                <TableHead sx={{ bgcolor: '#faf6ee' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 800 }}>User / Identity</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Role</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Email Address</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Created Date</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800 }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {users.map((u) => {
                    const roleCfg = ROLE_CONFIG[u.role] || ROLE_CONFIG.VIEWER;
                    const isSelf = currentUser && currentUser.id === u.id;
                    const fullName = `${u.first_name || ''} ${u.last_name || ''}`.trim();

                    return (
                      <TableRow key={u.id} hover sx={{ '&:hover': { bgcolor: '#f8fafc' } }}>
                        {/* Identity */}
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Avatar
                              sx={{
                                width: 36,
                                height: 36,
                                bgcolor: roleCfg.color,
                                fontWeight: 800,
                                fontSize: '0.85rem',
                              }}
                            >
                              {u.username.charAt(0).toUpperCase()}
                            </Avatar>
                            <Box>
                              <Typography variant="body2" fontWeight="700" color="#0f172a">
                                {fullName || u.username}
                                {isSelf && (
                                  <Chip
                                    label="You"
                                    size="small"
                                    sx={{ ml: 1, height: 18, fontSize: '0.65rem', fontWeight: 800, bgcolor: '#e2e8f0' }}
                                  />
                                )}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                                @{u.username}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>

                        {/* Role Chip */}
                        <TableCell>
                          <Chip
                            icon={roleCfg.icon}
                            label={roleCfg.label}
                            size="small"
                            sx={{
                              bgcolor: roleCfg.bg,
                              color: roleCfg.color,
                              border: `1px solid ${roleCfg.border}`,
                              fontWeight: 800,
                              fontSize: '0.72rem',
                            }}
                          />
                        </TableCell>

                        {/* Email */}
                        <TableCell>
                          <Typography variant="body2" color="text.primary">
                            {u.email || '—'}
                          </Typography>
                        </TableCell>

                        {/* Status */}
                        <TableCell>
                          {u.is_active !== false ? (
                            <Chip
                              icon={<CheckCircleIcon sx={{ fontSize: '13px !important' }} />}
                              label="Active"
                              size="small"
                              color="success"
                              variant="outlined"
                              sx={{ fontWeight: 700, fontSize: '0.68rem', height: 22 }}
                            />
                          ) : (
                            <Chip
                              icon={<BlockIcon sx={{ fontSize: '13px !important' }} />}
                              label="Inactive"
                              size="small"
                              color="error"
                              variant="outlined"
                              sx={{ fontWeight: 700, fontSize: '0.68rem', height: 22 }}
                            />
                          )}
                        </TableCell>

                        {/* Date Joined */}
                        <TableCell>
                          <Typography variant="caption" color="text.secondary">
                            {u.date_joined ? new Date(u.date_joined).toLocaleDateString() : '—'}
                          </Typography>
                        </TableCell>

                        {/* Actions */}
                        <TableCell align="right">
                          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                            <Tooltip title="Edit User">
                              <IconButton
                                size="small"
                                onClick={() => handleOpenEdit(u)}
                                sx={{ color: '#50153f', bgcolor: 'rgba(80, 21, 63, 0.08)', '&:hover': { bgcolor: 'rgba(80, 21, 63, 0.15)' } }}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>

                            <Tooltip title={isSelf ? 'Cannot delete your own account' : 'Delete User'}>
                              <span>
                                <IconButton
                                  size="small"
                                  disabled={isSelf}
                                  onClick={() => setDeleteDialog({ open: true, user: u })}
                                  sx={{ color: '#dc2626', bgcolor: 'rgba(220, 38, 38, 0.08)', '&:hover': { bgcolor: 'rgba(220, 38, 38, 0.15)' } }}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </span>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit User Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ pb: 1, borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ p: 1, borderRadius: 2, bgcolor: 'rgba(80, 21, 63, 0.1)', color: '#50153f' }}>
            <ManageAccountsIcon />
          </Box>
          <Box>
            <Typography variant="h6" fontWeight="800">
              {editingUser ? `Edit User: @${editingUser.username}` : 'Create New Summit User'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Configure credentials and role permissions
            </Typography>
          </Box>
        </DialogTitle>

        <form onSubmit={handleFormSubmit}>
          <DialogContent sx={{ pt: 2.5 }}>
            {formError && (
              <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
                {formError}
              </Alert>
            )}

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  size="small"
                  label="Username"
                  required
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  disabled={Boolean(editingUser)} // Username is immutable
                  placeholder="e.g. host_desk1"
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  size="small"
                  label={editingUser ? 'New Password (Optional)' : 'Password'}
                  type="password"
                  required={!editingUser}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder={editingUser ? 'Leave blank to keep' : '••••••••'}
                  helperText={editingUser ? 'Leave blank to keep existing password' : ''}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  size="small"
                  label="First Name"
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  placeholder="e.g. Ayesha"
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  size="small"
                  label="Last Name"
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  placeholder="e.g. Rahman"
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  size="small"
                  label="Email Address"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="user@childcaresummit.org"
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="Summit Role"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                >
                  <MenuItem value="ADMIN">
                    <Box sx={{ py: 0.5 }}>
                      <Typography variant="body2" fontWeight="700" color="#50153f">
                        Admin
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Full site access (Dashboard, Directory, Google Sheet Sync, User Management)
                      </Typography>
                    </Box>
                  </MenuItem>
                  <MenuItem value="REGISTRATION_HOST">
                    <Box sx={{ py: 0.5 }}>
                      <Typography variant="body2" fontWeight="700" color="#e85d26">
                        Registration Host
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Can check in participants, view dashboard & participant list, add new participants
                      </Typography>
                    </Box>
                  </MenuItem>
                  <MenuItem value="VIEWER">
                    <Box sx={{ py: 0.5 }}>
                      <Typography variant="body2" fontWeight="700" color="#2d82c6">
                        Viewer
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Can view live summit dashboard analytics and headcounts only
                      </Typography>
                    </Box>
                  </MenuItem>
                </TextField>
              </Grid>
            </Grid>
          </DialogContent>

          <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #e2e8f0' }}>
            <Button onClick={() => setDialogOpen(false)} color="inherit" disabled={submitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={submitting}
              sx={{ fontWeight: 800, minWidth: 120 }}
            >
              {submitting ? <CircularProgress size={20} color="inherit" /> : editingUser ? 'Save Changes' : 'Create User'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Delete User Confirmation Dialog */}
      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, user: null })} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 800, color: '#dc2626' }}>
          Delete User Account?
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Are you sure you want to permanently delete user <strong>@{deleteDialog.user?.username}</strong> ({deleteDialog.user?.role})?
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 2.5, py: 2 }}>
          <Button onClick={() => setDeleteDialog({ open: false, user: null })} color="inherit" disabled={deleting}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDeleteConfirm}
            disabled={deleting}
            sx={{ fontWeight: 800 }}
          >
            {deleting ? 'Deleting...' : 'Confirm Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Toast notifications */}
      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={() => setToast({ ...toast, open: false })}
      >
        <Alert severity={toast.severity} sx={{ borderRadius: 2 }}>
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

