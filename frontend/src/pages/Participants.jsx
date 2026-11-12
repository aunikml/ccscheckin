import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  Checkbox,
  MenuItem,
  InputAdornment,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  CircularProgress,
  Snackbar,
  Alert,
  Paper,
  Menu,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import DownloadIcon from '@mui/icons-material/Download';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import BadgeIcon from '@mui/icons-material/Badge';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { participantsService } from '../services/api';
import { ParticipantDialog } from '../components/ParticipantDialog';
import { ParticipantBadgeModal } from '../components/ParticipantBadgeModal';
import { FastCheckinModal } from '../components/FastCheckinModal';

const GUEST_TYPES = [
  { value: 'ALL', label: 'All Guest Types' },
  { value: 'General Participant', label: 'General Participant' },
  { value: 'Guest', label: 'Guest' },
  { value: 'Speaker', label: 'Speaker' },
  { value: 'VIP', label: 'VIP' },
];

const SESSION_FILTERS = [
  { value: 'ALL', label: 'All Sessions' },
  { value: 'DAY_1', label: '📅 Day 1 (Any Session)' },
  { value: 'DAY_2', label: '📅 Day 2 (Any Session)' },
  { value: 'BOTH_DAYS', label: '✨ Both Days (Full Summit)' },
  { value: 'D1S1', label: 'Day 1 - Session 1' },
  { value: 'D1S2', label: 'Day 1 - Session 2' },
  { value: 'D2S1', label: 'Day 2 - Session 1' },
  { value: 'D2S2', label: 'Day 2 - Session 2' },
];

const CHECKIN_FILTERS = [
  { value: 'ALL', label: 'All Check-in States' },
  { value: 'DAY_1_CHECKED_IN', label: '✅ Day 1 Checked In' },
  { value: 'DAY_2_CHECKED_IN', label: '✅ Day 2 Checked In' },
  { value: 'BOTH_CHECKED_IN', label: '🌟 Both Days Checked In' },
  { value: 'ANY_CHECKED_IN', label: 'Checked In (Any Day)' },
  { value: 'NOT_CHECKED_IN', label: '⏳ Not Checked In' },
];

const STATUS_FILTERS = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'CHECKED_IN', label: 'Checked In' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'MAYBE', label: 'Tentative / Maybe' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const GUEST_TYPE_COLORS = {
  'General Participant': { color: '#2d82c6', bg: 'rgba(45, 130, 198, 0.1)' },
  'Guest': { color: '#fab319', bg: 'rgba(250, 179, 25, 0.15)' },
  'Speaker': { color: '#e85d26', bg: 'rgba(232, 93, 38, 0.12)' },
  'VIP': { color: '#50153f', bg: 'rgba(80, 21, 63, 0.12)' },
};

export const Participants = () => {
  const navigate = useNavigate();
  const { isAdmin, canAccessParticipants, canDeleteParticipant, canExportReports } = useAuth();

  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  // Filters
  const [search, setSearch] = useState('');
  const [guestType, setGuestType] = useState('ALL');
  const [session, setSession] = useState('ALL');
  const [checkinFilter, setCheckinFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  // Selection
  const [selectedIds, setSelectedIds] = useState([]);

  // Modals & Menus
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingParticipant, setEditingParticipant] = useState(null);
  const [badgeModalParticipant, setBadgeModalParticipant] = useState(null);
  const [fastCheckinOpen, setFastCheckinOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, id: null, name: '' });
  const [exportMenuAnchor, setExportMenuAnchor] = useState(null);
  const [exportLoading, setExportLoading] = useState(false);

  // Notifications
  const [toast, setToast] = useState({ open: false, message: '', severity: 'info' });

  useEffect(() => {
    if (!canAccessParticipants) {
      navigate('/dashboard', { replace: true });
    }
  }, [canAccessParticipants, navigate]);

  const fetchParticipants = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        search: search.trim() || undefined,
        guest_type: guestType !== 'ALL' ? guestType : undefined,
        session_filter: session !== 'ALL' ? session : undefined,
        checkin_filter: checkinFilter !== 'ALL' ? checkinFilter : undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        page: page + 1,
      };
      const data = await participantsService.getAll(params);
      if (data.results) {
        setParticipants(data.results);
        setTotalCount(data.count || 0);
      } else {
        setParticipants(data);
        setTotalCount(data.length);
      }
    } catch (err) {
      console.error('Failed to fetch participants', err);
      setToast({ open: true, message: 'Failed to load participants.', severity: 'error' });
    } finally {
      setLoading(false);
    }
  }, [search, guestType, session, checkinFilter, statusFilter, page, rowsPerPage]);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchParticipants();
    }, 250);
    return () => clearTimeout(delayDebounce);
  }, [fetchParticipants]);

  // Day-wise check-in toggle
  const handleToggleDayCheckin = async (participant, day) => {
    try {
      const res = await participantsService.toggleDayCheckin(participant.id, day);
      setParticipants((prev) =>
        prev.map((p) => (p.id === participant.id ? res.participant : p))
      );
      setToast({
        open: true,
        message: res.message,
        severity: 'success',
      });
    } catch (err) {
      setToast({ open: true, message: `Day ${day} check-in failed.`, severity: 'error' });
    }
  };

  // Create or Update
  const handleSaveParticipant = async (formData) => {
    let saved;
    if (editingParticipant?.id) {
      saved = await participantsService.update(editingParticipant.id, formData);
      setToast({ open: true, message: 'Participant updated successfully!', severity: 'success' });
    } else {
      saved = await participantsService.create(formData);
      setToast({ open: true, message: 'Participant registered successfully!', severity: 'success' });
    }
    fetchParticipants();
    return saved;
  };

  // Delete single
  const handleDeleteConfirm = async () => {
    if (!deleteConfirm.id) return;
    try {
      await participantsService.delete(deleteConfirm.id);
      setToast({ open: true, message: 'Participant removed successfully.', severity: 'success' });
      setSelectedIds((prev) => prev.filter((id) => id !== deleteConfirm.id));
      fetchParticipants();
    } catch (err) {
      setToast({ open: true, message: 'Failed to delete participant.', severity: 'error' });
    } finally {
      setDeleteConfirm({ open: false, id: null, name: '' });
    }
  };

  // Bulk actions
  const handleBulkAction = async (action) => {
    if (selectedIds.length === 0) return;
    try {
      const res = await participantsService.bulkAction(action, selectedIds);
      setToast({ open: true, message: res.message, severity: 'success' });
      setSelectedIds([]);
      fetchParticipants();
    } catch (err) {
      setToast({ open: true, message: 'Bulk action failed.', severity: 'error' });
    }
  };

  // Selection handlers
  const handleSelectAll = (event) => {
    if (event.target.checked) {
      setSelectedIds(participants.map((p) => p.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const triggerExport = async (url) => {
    setExportMenuAnchor(null);
    setExportLoading(true);
    try {
      await participantsService.downloadExport(url);
      setToast({
        open: true,
        message: 'CSV report downloaded successfully.',
        severity: 'success',
      });
    } catch (err) {
      console.error('Export failed', err);
      const msg =
        err.parsedMessage ||
        err.response?.data?.error ||
        err.response?.data?.detail ||
        (err.response?.status === 403
          ? 'Access Denied: Your account role is not authorized to export reports.'
          : err.response?.status === 401
          ? 'Session expired. Please log in again.'
          : 'Failed to download CSV export. Please check connection and try again.');
      setToast({
        open: true,
        message: msg,
        severity: 'error',
      });
    } finally {
      setExportLoading(false);
    }
  };

  return (
    <Box>
      {/* Top Header */}
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' }, gap: 2, mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight="800" sx={{ color: '#0f172a' }}>
            Participant Directory
          </Typography>
          <Typography variant="body2" color="text.secondary">
            National Child Care Summit roster, Day 1 & Day 2 check-ins, badge issuance, and export
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
          <Button
            variant="outlined"
            startIcon={<QrCodeScannerIcon />}
            onClick={() => setFastCheckinOpen(true)}
            sx={{ fontWeight: 700 }}
          >
            Fast Check-in Desk
          </Button>

          {/* Export Dropdown Menu Button (Admin and Registration Host) */}
          {canExportReports && (
            <>
              <Button
                variant="outlined"
                disabled={exportLoading}
                startIcon={exportLoading ? <CircularProgress size={18} /> : <DownloadIcon />}
                endIcon={<ArrowDropDownIcon />}
                onClick={(e) => setExportMenuAnchor(e.currentTarget)}
                sx={{ fontWeight: 700 }}
              >
                {exportLoading ? 'Exporting...' : 'Export CSV Reports'}
              </Button>
              <Menu
                anchorEl={exportMenuAnchor}
                open={Boolean(exportMenuAnchor)}
                onClose={() => setExportMenuAnchor(null)}
                PaperProps={{ sx: { minWidth: 240, borderRadius: 2, mt: 1 } }}
              >
                <MenuItem onClick={() => triggerExport(participantsService.getCheckinExportUrl({ day: '1', only_checked_in: 'true' }))}>
                  <EventAvailableIcon fontSize="small" sx={{ mr: 1.5, color: '#2d82c6' }} />
                  Export Day 1 Check-ins
                </MenuItem>
                <MenuItem onClick={() => triggerExport(participantsService.getCheckinExportUrl({ day: '2', only_checked_in: 'true' }))}>
                  <EventAvailableIcon fontSize="small" sx={{ mr: 1.5, color: '#50153f' }} />
                  Export Day 2 Check-ins
                </MenuItem>
                <MenuItem onClick={() => triggerExport(participantsService.getCheckinExportUrl({ day: 'both', only_checked_in: 'true' }))}>
                  <EventAvailableIcon fontSize="small" sx={{ mr: 1.5, color: '#e85d26' }} />
                  Export Both Days Check-ins
                </MenuItem>
                <MenuItem onClick={() => triggerExport(participantsService.getCheckinExportUrl({ day: 'all' }))}>
                  <DownloadIcon fontSize="small" sx={{ mr: 1.5, color: 'text.secondary' }} />
                  Export All Check-in Data
                </MenuItem>
                <MenuItem onClick={() => triggerExport(participantsService.getExportUrl({ search, guest_type: guestType !== 'ALL' ? guestType : undefined, session_filter: session !== 'ALL' ? session : undefined }))}>
                  <DownloadIcon fontSize="small" sx={{ mr: 1.5, color: 'text.secondary' }} />
                  Export Full Filtered Roster
                </MenuItem>
              </Menu>
            </>
          )}

          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              setEditingParticipant(null);
              setDialogOpen(true);
            }}
          >
            Add Participant
          </Button>
        </Box>
      </Box>

      {/* Filter and Search Bar Card */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 2.5 }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
            <TextField
              sx={{ flexGrow: 1, minWidth: 240 }}
              size="small"
              placeholder="Search by name, email, mobile, summit ID, session..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              select
              size="small"
              sx={{ minWidth: 170 }}
              label="Guest Type"
              value={guestType}
              onChange={(e) => { setGuestType(e.target.value); setPage(0); }}
            >
              {GUEST_TYPES.map((c) => (
                <MenuItem key={c.value} value={c.value}>
                  {c.label}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              size="small"
              sx={{ minWidth: 190 }}
              label="Session"
              value={session}
              onChange={(e) => { setSession(e.target.value); setPage(0); }}
            >
              {SESSION_FILTERS.map((s) => (
                <MenuItem key={s.value} value={s.value}>
                  {s.label}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              size="small"
              sx={{ minWidth: 190 }}
              label="Check-in State"
              value={checkinFilter}
              onChange={(e) => { setCheckinFilter(e.target.value); setPage(0); }}
            >
              {CHECKIN_FILTERS.map((s) => (
                <MenuItem key={s.value} value={s.value}>
                  {s.label}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              size="small"
              sx={{ minWidth: 140 }}
              label="Status"
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
            >
              {STATUS_FILTERS.map((s) => (
                <MenuItem key={s.value} value={s.value}>
                  {s.label}
                </MenuItem>
              ))}
            </TextField>
          </Box>

          {/* Bulk Selection Toolbar */}
          {selectedIds.length > 0 && (
            <Paper
              elevation={0}
              sx={{
                mt: 2,
                p: 1.5,
                bgcolor: '#f1f5f9',
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 1.5,
              }}
            >
              <Typography variant="subtitle2" fontWeight="700" color="primary.main">
                {selectedIds.length} participant{selectedIds.length > 1 ? 's' : ''} selected
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Button
                  size="small"
                  variant="outlined"
                  color="primary"
                  startIcon={<CheckCircleIcon />}
                  onClick={() => handleBulkAction('check_in_day1')}
                >
                  Check In Day 1
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  sx={{ color: '#8b5cf6', borderColor: '#8b5cf6' }}
                  startIcon={<CheckCircleIcon />}
                  onClick={() => handleBulkAction('check_in_day2')}
                >
                  Check In Day 2
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  color="success"
                  startIcon={<CheckCircleIcon />}
                  onClick={() => handleBulkAction('check_in_both')}
                >
                  Check In Both Days
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => handleBulkAction('confirm')}
                >
                  Set Confirmed
                </Button>
                {canDeleteParticipant && (
                  <Button
                    size="small"
                    variant="outlined"
                    color="error"
                    startIcon={<DeleteIcon />}
                    onClick={() => handleBulkAction('delete')}
                  >
                    Delete Selected
                  </Button>
                )}
              </Box>
            </Paper>
          )}
        </CardContent>
      </Card>

      {/* Main Data Table */}
      <Card sx={{ overflow: 'hidden' }}>
        <TableContainer sx={{ maxHeight: 'calc(100vh - 350px)' }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    indeterminate={selectedIds.length > 0 && selectedIds.length < participants.length}
                    checked={participants.length > 0 && selectedIds.length === participants.length}
                    onChange={handleSelectAll}
                  />
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Summit ID</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Full Name</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Email Address</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Mobile</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Guest Type</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Summit Session</TableCell>
                <TableCell sx={{ fontWeight: 700, textAlign: 'center' }}>Day 1 / Day 2 Check-in</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 700, textAlign: 'right' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={10} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={36} />
                    <Typography color="text.secondary" sx={{ mt: 1 }}>
                      Loading participant records...
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : participants.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} align="center" sx={{ py: 6 }}>
                    <Typography variant="subtitle1" fontWeight="600" color="text.secondary">
                      No participants match your query.
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Try clearing filters, or pull responses using the Google Form Sync.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                participants.map((p) => {
                  const isCheckedIn = p.status === 'CHECKED_IN' || p.day1_checked_in || p.day2_checked_in;
                  const isSelected = selectedIds.includes(p.id);
                  const guestTypeStyle = GUEST_TYPE_COLORS[p.guest_type] || GUEST_TYPE_COLORS['General Participant'];

                  return (
                    <TableRow
                      key={p.id}
                      hover
                      selected={isSelected}
                      sx={{
                        transition: 'background-color 0.2s',
                        bgcolor: isCheckedIn ? 'rgba(16, 185, 129, 0.02)' : 'inherit',
                      }}
                    >
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={isSelected}
                          onChange={() => handleSelectRow(p.id)}
                        />
                      </TableCell>

                      {/* Summit ID */}
                      <TableCell>
                        <Chip
                          label={p.summit_id}
                          size="small"
                          color="primary"
                          variant="outlined"
                          onClick={() => setBadgeModalParticipant(p)}
                          sx={{
                            fontWeight: 700,
                            cursor: 'pointer',
                            '&:hover': { bgcolor: 'primary.light', color: 'primary.dark' },
                          }}
                        />
                      </TableCell>

                      {/* Full Name */}
                      <TableCell>
                        <Typography variant="body2" fontWeight="700" sx={{ color: '#0f172a' }}>
                          {p.name || p.full_name}
                        </Typography>
                        {p.registration_time && (
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.72rem' }}>
                            Reg: {p.registration_time}
                          </Typography>
                        )}
                      </TableCell>

                      {/* Email Address */}
                      <TableCell>
                        <Typography
                          variant="body2"
                          sx={{
                            color: '#1e293b',
                            fontFamily: 'Roboto Mono, monospace',
                            fontSize: '0.82rem',
                          }}
                        >
                          {p.email}
                        </Typography>
                      </TableCell>

                      {/* Mobile */}
                      <TableCell>
                        <Typography variant="body2" fontWeight="500">
                          {p.mobile || p.phone || '—'}
                        </Typography>
                      </TableCell>

                      {/* Guest Type */}
                      <TableCell>
                        <Chip
                          label={p.guest_type || 'General Participant'}
                          size="small"
                          sx={{
                            color: guestTypeStyle.color,
                            bgcolor: guestTypeStyle.bg,
                            fontWeight: 700,
                            fontSize: '0.72rem',
                          }}
                        />
                      </TableCell>

                      {/* Summit Session */}
                      <TableCell>
                        {p.session_badges && p.session_badges.length > 0 ? (
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, maxWidth: 220 }}>
                            {p.session_badges.map((b) => (
                              <Chip
                                key={b}
                                label={b}
                                size="small"
                                sx={{
                                  height: 22,
                                  fontSize: '0.68rem',
                                  fontWeight: 700,
                                  bgcolor: b.startsWith('Day 1') ? 'rgba(45, 130, 198, 0.1)' : 'rgba(80, 21, 63, 0.1)',
                                  color: b.startsWith('Day 1') ? '#2d82c6' : '#50153f',
                                  border: `1px solid ${b.startsWith('Day 1') ? 'rgba(45, 130, 198, 0.25)' : 'rgba(80, 21, 63, 0.25)'}`,
                                }}
                              />
                            ))}
                          </Box>
                        ) : (
                          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                            {p.session || '—'}
                          </Typography>
                        )}
                      </TableCell>

                      {/* Separate Day 1 & Day 2 Check-in Toggles */}
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', gap: 0.8, justifyContent: 'center' }}>
                          {/* Day 1 Check-in */}
                          <Tooltip
                            title={
                              p.day1_checked_in
                                ? `Day 1 Checked In at ${p.day1_checked_in_at ? new Date(p.day1_checked_in_at).toLocaleTimeString() : ''} (Click to undo)`
                                : 'Click to check in for Day 1'
                            }
                          >
                            <Chip
                              icon={p.day1_checked_in ? <CheckCircleIcon sx={{ fontSize: '13px !important' }} /> : undefined}
                              label={p.day1_checked_in ? 'D1: In' : '+ Day 1'}
                              size="small"
                              onClick={() => handleToggleDayCheckin(p, 1)}
                              color={p.day1_checked_in ? 'success' : 'default'}
                              variant={p.day1_checked_in ? 'filled' : 'outlined'}
                              sx={{
                                cursor: 'pointer',
                                fontWeight: 700,
                                fontSize: '0.68rem',
                                height: 24,
                                minWidth: 68,
                                transition: 'all 0.15s ease',
                                '&:hover': {
                                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                                },
                              }}
                            />
                          </Tooltip>

                          {/* Day 2 Check-in */}
                          <Tooltip
                            title={
                              p.day2_checked_in
                                ? `Day 2 Checked In at ${p.day2_checked_in_at ? new Date(p.day2_checked_in_at).toLocaleTimeString() : ''} (Click to undo)`
                                : 'Click to check in for Day 2'
                            }
                          >
                            <Chip
                              icon={p.day2_checked_in ? <CheckCircleIcon sx={{ fontSize: '13px !important' }} /> : undefined}
                              label={p.day2_checked_in ? 'D2: In' : '+ Day 2'}
                              size="small"
                              onClick={() => handleToggleDayCheckin(p, 2)}
                              variant={p.day2_checked_in ? 'filled' : 'outlined'}
                              sx={{
                                cursor: 'pointer',
                                fontWeight: 700,
                                fontSize: '0.68rem',
                                height: 24,
                                minWidth: 68,
                                bgcolor: p.day2_checked_in ? '#50153f' : 'transparent',
                                color: p.day2_checked_in ? '#ffffff' : 'inherit',
                                borderColor: p.day2_checked_in ? '#50153f' : undefined,
                                transition: 'all 0.15s ease',
                                '&:hover': {
                                  bgcolor: p.day2_checked_in ? '#3b0d2d' : 'rgba(80, 21, 63, 0.1)',
                                  boxShadow: '0 2px 8px rgba(80, 21, 63, 0.25)',
                                },
                              }}
                            />
                          </Tooltip>
                        </Box>
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        <Chip
                          label={
                            p.day1_checked_in && p.day2_checked_in
                              ? 'Both In'
                              : p.day1_checked_in
                              ? 'Day 1 In'
                              : p.day2_checked_in
                              ? 'Day 2 In'
                              : p.status_display || p.status
                          }
                          size="small"
                          color={
                            isCheckedIn
                              ? 'success'
                              : p.status === 'CONFIRMED'
                              ? 'primary'
                              : p.status === 'CANCELLED'
                              ? 'error'
                              : 'warning'
                          }
                          sx={{ fontWeight: 700, fontSize: '0.72rem' }}
                        />
                      </TableCell>

                      {/* Actions */}
                      <TableCell align="right">
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                          <Tooltip title="View / Print Summit Badge">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => setBadgeModalParticipant(p)}
                            >
                              <BadgeIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>

                          <Tooltip title="Edit Participant">
                            <IconButton
                              size="small"
                              onClick={() => {
                                setEditingParticipant(p);
                                setDialogOpen(true);
                              }}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>

                          {canDeleteParticipant && (
                            <Tooltip title="Delete">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() =>
                                  setDeleteConfirm({
                                    open: true,
                                    id: p.id,
                                    name: p.name || p.full_name,
                                  })
                                }
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          rowsPerPageOptions={[25, 50, 100]}
          component="div"
          count={totalCount}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(e, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
        />
      </Card>

      {/* Participant Edit / Create Dialog */}
      <ParticipantDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSave={handleSaveParticipant}
        participant={editingParticipant}
        onPrintBadge={(p) => {
          setDialogOpen(false);
          setBadgeModalParticipant(p);
        }}
      />

      {/* Accreditation Badge Modal */}
      <ParticipantBadgeModal
        open={Boolean(badgeModalParticipant)}
        onClose={() => setBadgeModalParticipant(null)}
        participant={badgeModalParticipant}
      />

      {/* Fast QR / ID Check-in Desk */}
      <FastCheckinModal
        open={fastCheckinOpen}
        onClose={() => setFastCheckinOpen(false)}
        onCheckinSuccess={(checkedIn) => {
          setParticipants((prev) =>
            prev.map((p) => (p.id === checkedIn.id ? checkedIn : p))
          );
        }}
        onPrintBadge={(p) => {
          setFastCheckinOpen(false);
          setBadgeModalParticipant(p);
        }}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, id: null, name: '' })}
      >
        <DialogTitle fontWeight="700">Confirm Participant Removal</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to remove <strong>{deleteConfirm.name}</strong> from the summit registry? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteConfirm({ open: false, id: null, name: '' })}>
            Cancel
          </Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Delete Participant
          </Button>
        </DialogActions>
      </Dialog>

      {/* Feedback Toast */}
      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          severity={toast.severity}
          variant="filled"
          onClose={() => setToast((prev) => ({ ...prev, open: false }))}
          sx={{ fontWeight: 600 }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};
