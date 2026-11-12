import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  LinearProgress,
  Chip,
  Paper,
  CircularProgress,
  Menu,
  MenuItem,
  Snackbar,
  Alert,
} from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import HelpOutlineIcon from '@mui/icons-material/HelpOutlined';
import SyncIcon from '@mui/icons-material/Sync';
import AddIcon from '@mui/icons-material/Add';
import DownloadIcon from '@mui/icons-material/Download';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import BadgeIcon from '@mui/icons-material/Badge';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { participantsService, syncService } from '../services/api';
import { ParticipantDialog } from '../components/ParticipantDialog';
import { ParticipantBadgeModal } from '../components/ParticipantBadgeModal';
import { FastCheckinModal } from '../components/FastCheckinModal';

const GUEST_TYPE_COLORS = {
  'General Participant': '#2d82c6',
  'Guest': '#fab319',
  'Speaker': '#e85d26',
  'VIP': '#50153f',
  'Organizer / Crew': '#1e824c',
};

const SESSION_COLORS = [
  '#2d82c6',
  '#50153f',
  '#e85d26',
  '#fab319',
  '#1e824c',
  '#6f1c57',
  '#64748b',
];

export const Dashboard = () => {
  const navigate = useNavigate();
  const { isAdmin, canCheckin, canAddParticipant, canSyncSheet, canAccessParticipants, canExportReports } = useAuth();

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  // Dialogs
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedBadgeParticipant, setSelectedBadgeParticipant] = useState(null);
  const [fastCheckinOpen, setFastCheckinOpen] = useState(false);
  const [exportMenuAnchor, setExportMenuAnchor] = useState(null);
  const [exportLoading, setExportLoading] = useState(false);
  const [exportNotification, setExportNotification] = useState({ open: false, message: '', severity: 'info' });

  const triggerExport = async (url) => {
    setExportMenuAnchor(null);
    setExportLoading(true);
    try {
      await participantsService.downloadExport(url);
      setExportNotification({
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
      setExportNotification({
        open: true,
        message: msg,
        severity: 'error',
      });
    } finally {
      setExportLoading(false);
    }
  };

  const fetchDashboardData = async () => {
    try {
      const statsData = await participantsService.getStats();
      setStats(statsData);
    } catch (err) {
      console.error('Failed to load dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    const handleSyncEvent = () => fetchDashboardData();
    window.addEventListener('participants-synced', handleSyncEvent);
    return () => window.removeEventListener('participants-synced', handleSyncEvent);
  }, []);

  const handleTriggerSync = async () => {
    setSyncing(true);
    try {
      await syncService.triggerSync({ use_sample: true });
      await fetchDashboardData();
    } catch (err) {
      console.error('Sync failed', err);
    } finally {
      setSyncing(false);
    }
  };

  const handleCreateParticipant = async (formData) => {
    const saved = await participantsService.create(formData);
    await fetchDashboardData();
    return saved;
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  const day1CheckedIn = stats?.session_insights?.checkin_summary?.day1_checked_in ?? stats?.day1_checked_in ?? 0;
  const day2CheckedIn = stats?.session_insights?.checkin_summary?.day2_checked_in ?? stats?.day2_checked_in ?? 0;
  const bothDaysCheckedIn = stats?.session_insights?.checkin_summary?.both_checked_in ?? stats?.both_checked_in ?? 0;
  const day1Total = stats?.session_insights?.day1?.total ?? stats?.day1_total ?? 0;
  const day2Total = stats?.session_insights?.day2?.total ?? stats?.day2_total ?? 0;
  const bothDaysTotal = stats?.session_insights?.both_days?.total ?? 0;

  const day1Rate = stats?.session_insights?.checkin_summary?.day1_rate ?? (day1Total > 0 ? Math.round((day1CheckedIn / day1Total) * 100) : 0);
  const day2Rate = stats?.session_insights?.checkin_summary?.day2_rate ?? (day2Total > 0 ? Math.round((day2CheckedIn / day2Total) * 100) : 0);
  const bothDaysRate = bothDaysTotal > 0 ? Math.round((bothDaysCheckedIn / bothDaysTotal) * 100) : 0;

  const CONFIRMATION_META = {
    yes: { label: 'Confirmed', color: '#10b981' },
    maybe: { label: 'Maybe', color: '#f59e0b' },
    no: { label: 'Cancelled / No', color: '#ef4444' },
  };

  const confirmationBreakdown = (stats?.confirmations || [])
    .filter((item) => item.count > 0)
    .map((item) => {
      const key = (item.confirmation || '').trim().toLowerCase();
      const meta = CONFIRMATION_META[key] || {
        label: item.confirmation || 'Not specified',
        color: '#64748b',
      };
      return { label: meta.label, value: item.count, color: meta.color };
    });

  const kpis = [
    {
      label: 'Total Registered',
      value: stats?.total || 0,
      icon: <PeopleIcon sx={{ fontSize: 32, color: '#50153f' }} />,
      bg: 'rgba(80, 21, 63, 0.08)',
      detail: `${day1Total} Day 1 • ${day2Total} Day 2 registered`,
      breakdown: confirmationBreakdown,
    },
    {
      label: 'Day 1 Checked In',
      value: day1CheckedIn,
      icon: <EventAvailableIcon sx={{ fontSize: 32, color: '#2d82c6' }} />,
      bg: 'rgba(45, 130, 198, 0.08)',
      detail: `${day1CheckedIn} of ${day1Total} Day 1 registered (${day1Rate}%)`,
      progress: day1Rate,
      barColor: '#2d82c6',
    },
    {
      label: 'Day 2 Checked In',
      value: day2CheckedIn,
      icon: <EventAvailableIcon sx={{ fontSize: 32, color: '#50153f' }} />,
      bg: 'rgba(80, 21, 63, 0.08)',
      detail: `${day2CheckedIn} of ${day2Total} Day 2 registered (${day2Rate}%)`,
      progress: day2Rate,
      barColor: '#50153f',
    },
    {
      label: 'Both Days Checked In',
      value: bothDaysCheckedIn,
      icon: <VerifiedUserIcon sx={{ fontSize: 32, color: '#e85d26' }} />,
      bg: 'rgba(232, 93, 38, 0.08)',
      detail: `${bothDaysCheckedIn} of ${bothDaysTotal} full summit attendees (${bothDaysRate}%)`,
      progress: bothDaysRate,
      barColor: '#e85d26',
    },
  ];

  return (
    <Box>
      {/* Page Header with Action Buttons */}
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' }, gap: 2, mb: 3.5 }}>
        <Box>
          <Typography variant="h4" fontWeight="800" sx={{ color: '#0f172a' }}>
            Summit Command Center
          </Typography>
          <Typography variant="body2" color="text.secondary">
            National Child Care Summit • Real-time attendee analytics & attendance tracking
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
          {canCheckin && (
            <Button
              variant="outlined"
              startIcon={<QrCodeScannerIcon />}
              onClick={() => setFastCheckinOpen(true)}
              sx={{ fontWeight: 700 }}
            >
              Fast Check-in Desk
            </Button>
          )}

          {/* Export Menu Button (Admin and Registration Host) */}
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
                <MenuItem onClick={() => triggerExport(participantsService.getExportUrl())}>
                  <DownloadIcon fontSize="small" sx={{ mr: 1.5, color: 'text.secondary' }} />
                  Export Full Summit Roster
                </MenuItem>
              </Menu>
            </>
          )}

          {canSyncSheet && (
            <Button
              variant="outlined"
              startIcon={<SyncIcon />}
              onClick={handleTriggerSync}
              disabled={syncing}
            >
              {syncing ? 'Syncing...' : 'Sync Form Sheet'}
            </Button>
          )}

          {canAddParticipant && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setCreateOpen(true)}
            >
              Add Participant
            </Button>
          )}
        </Box>
      </Box>

      {/* KPI Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {kpis.map((kpi, idx) => (
          <Grid item xs={12} sm={6} md={3} key={kpi.label}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: idx * 0.08 }}
            >
              <Card sx={{ height: '100%', position: 'relative', overflow: 'hidden' }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box>
                      <Typography variant="caption" fontWeight="600" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {kpi.label}
                      </Typography>
                      <Typography variant="h3" fontWeight="800" sx={{ color: '#0f172a', mt: 0.5 }}>
                        {kpi.value}
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        p: 1.2,
                        borderRadius: 3,
                        bgcolor: kpi.bg,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {kpi.icon}
                    </Box>
                  </Box>

                  {kpi.progress !== undefined ? (
                    <Box sx={{ mt: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="caption" color="text.secondary">
                          Check-in Attendance
                        </Typography>
                        <Typography variant="caption" fontWeight="700" sx={{ color: kpi.barColor || 'success.main' }}>
                          {kpi.progress}%
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={kpi.progress}
                        sx={{ height: 6, borderRadius: 3, bgcolor: '#e2e8f0', '& .MuiLinearProgress-bar': { bgcolor: kpi.barColor || '#10b981' } }}
                      />
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.8, fontSize: '0.72rem' }}>
                        {kpi.detail}
                      </Typography>
                    </Box>
                  ) : kpi.breakdown?.length > 0 ? (
                    <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 0.6 }}>
                      {kpi.breakdown.map((item) => (
                        <Box key={item.label} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.7 }}>
                            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: item.color }} />
                            <Typography variant="caption" color="text.secondary">
                              {item.label}
                            </Typography>
                          </Box>
                          <Typography variant="caption" fontWeight="800" sx={{ color: item.color }}>
                            {item.value}
                          </Typography>
                        </Box>
                      ))}
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.3, fontSize: '0.7rem' }}>
                        {kpi.detail}
                      </Typography>
                    </Box>
                  ) : (
                    <Typography variant="caption" color="text.secondary">
                      {kpi.detail}
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
        ))}
      </Grid>

      {/* Middle Row: Guest Type Accreditation Breakdown */}
      <Card sx={{ mb: 4, borderRadius: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5, flexWrap: 'wrap', gap: 1 }}>
            <Box>
              <Typography variant="h6" fontWeight="800" sx={{ color: '#0f172a' }}>
                Participants by Guest Type
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Roster breakdown by guest accreditation category
              </Typography>
            </Box>
            <Chip
              label={`${stats?.total || 0} Total Roster`}
              size="small"
              sx={{ fontWeight: 700, bgcolor: 'rgba(80, 21, 63, 0.08)', color: '#50153f' }}
            />
          </Box>

          <Grid container spacing={2.5}>
            {stats?.guest_types?.length > 0 ? (
              stats.guest_types.map((item) => {
                const label = item.guest_type || 'General Participant';
                const color = GUEST_TYPE_COLORS[label] || '#0284c7';
                const pct = stats.total > 0 ? Math.round((item.count / stats.total) * 100) : 0;
                return (
                  <Grid item xs={12} sm={6} md={3} key={item.guest_type}>
                    <Paper
                      elevation={0}
                      sx={{
                        p: 2.2,
                        borderRadius: 2.5,
                        border: '1.5px solid #e2e8f0',
                        bgcolor: '#f8fafc',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          borderColor: color,
                          boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                        },
                      }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: color }} />
                          <Typography variant="subtitle2" fontWeight="700">
                            {label}
                          </Typography>
                        </Box>
                        <Typography variant="h6" fontWeight="800" sx={{ color }}>
                          {item.count}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.8 }}>
                        <Typography variant="caption" color="text.secondary">
                          Share of roster
                        </Typography>
                        <Typography variant="caption" fontWeight="800" sx={{ color }}>
                          {pct}%
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={pct}
                        sx={{
                          height: 7,
                          borderRadius: 3,
                          bgcolor: '#e2e8f0',
                          '& .MuiLinearProgress-bar': { bgcolor: color },
                        }}
                      />
                    </Paper>
                  </Grid>
                );
              })
            ) : (
              <Grid item xs={12}>
                <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
                  No participant guest types recorded yet.
                </Typography>
              </Grid>
            )}
          </Grid>
        </CardContent>
      </Card>

      {/* Summit Sessions Deep Attendance Insights */}
      <Card sx={{ mb: 4 }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, flexWrap: 'wrap', gap: 1 }}>
            <Box>
              <Typography variant="h6" fontWeight="700">
                Summit Sessions & Day-wise Attendance Insights
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Exact participant counts attending Day 1, Day 2, Both Days, and individual morning/afternoon sessions
              </Typography>
            </Box>
            <Chip
              label={`${stats?.session_insights?.both_days?.total || 0} Attending Both Days (${stats?.session_insights?.both_days?.pct || 0}%)`}
              color="primary"
              variant="outlined"
              sx={{ fontWeight: 700 }}
            />
          </Box>

          {/* High-level Day 1 vs Day 2 Cards */}
          <Grid container spacing={2} sx={{ mt: 1, mb: 3 }}>
            {/* Day 1 Overall */}
            <Grid item xs={12} sm={4}>
              <Paper
                elevation={0}
                sx={{
                  p: 2.4,
                  borderRadius: 2.5,
                  bgcolor: 'rgba(45, 130, 198, 0.05)',
                  border: '1.5px solid rgba(45, 130, 198, 0.25)',
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="caption" fontWeight="800" sx={{ color: '#2d82c6', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    📅 Day 1 Attendance
                  </Typography>
                  <Chip
                    label={`${day1CheckedIn} Checked In`}
                    size="small"
                    sx={{
                      fontWeight: 800,
                      fontSize: '0.72rem',
                      bgcolor: day1CheckedIn > 0 ? '#2d82c6' : 'rgba(0,0,0,0.08)',
                      color: day1CheckedIn > 0 ? '#fff' : 'inherit',
                    }}
                  />
                </Box>
                <Grid container spacing={1} sx={{ my: 0.5 }}>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Registered
                    </Typography>
                    <Typography variant="h5" fontWeight="800" sx={{ color: '#0f2942' }}>
                      {day1Total}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {stats?.session_insights?.day1?.pct || 0}% of summit
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Checked In
                    </Typography>
                    <Typography variant="h5" fontWeight="800" sx={{ color: '#2d82c6' }}>
                      {day1CheckedIn}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {day1Rate}% attended
                    </Typography>
                  </Grid>
                </Grid>
                <LinearProgress
                  variant="determinate"
                  value={day1Rate}
                  sx={{ height: 6, borderRadius: 3, bgcolor: 'rgba(45, 130, 198, 0.15)', mt: 1, '& .MuiLinearProgress-bar': { bgcolor: '#2d82c6' } }}
                />
              </Paper>
            </Grid>

            {/* Day 2 Overall */}
            <Grid item xs={12} sm={4}>
              <Paper
                elevation={0}
                sx={{
                  p: 2.4,
                  borderRadius: 2.5,
                  bgcolor: 'rgba(80, 21, 63, 0.05)',
                  border: '1.5px solid rgba(80, 21, 63, 0.25)',
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="caption" fontWeight="800" sx={{ color: '#50153f', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    📅 Day 2 Attendance
                  </Typography>
                  <Chip
                    label={`${day2CheckedIn} Checked In`}
                    size="small"
                    sx={{
                      fontWeight: 800,
                      fontSize: '0.72rem',
                      bgcolor: day2CheckedIn > 0 ? '#50153f' : 'rgba(0,0,0,0.08)',
                      color: day2CheckedIn > 0 ? '#fff' : 'inherit',
                    }}
                  />
                </Box>
                <Grid container spacing={1} sx={{ my: 0.5 }}>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Registered
                    </Typography>
                    <Typography variant="h5" fontWeight="800" sx={{ color: '#0f2942' }}>
                      {day2Total}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {stats?.session_insights?.day2?.pct || 0}% of summit
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Checked In
                    </Typography>
                    <Typography variant="h5" fontWeight="800" sx={{ color: '#50153f' }}>
                      {day2CheckedIn}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {day2Rate}% attended
                    </Typography>
                  </Grid>
                </Grid>
                <LinearProgress
                  variant="determinate"
                  value={day2Rate}
                  sx={{ height: 6, borderRadius: 3, bgcolor: 'rgba(80, 21, 63, 0.15)', mt: 1, '& .MuiLinearProgress-bar': { bgcolor: '#50153f' } }}
                />
              </Paper>
            </Grid>

            {/* Both Days Overall */}
            <Grid item xs={12} sm={4}>
              <Paper
                elevation={0}
                sx={{
                  p: 2.4,
                  borderRadius: 2.5,
                  bgcolor: 'rgba(232, 93, 38, 0.05)',
                  border: '1.5px solid rgba(232, 93, 38, 0.25)',
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="caption" fontWeight="800" sx={{ color: '#e85d26', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    ✨ Full Summit (Both Days)
                  </Typography>
                  <Chip
                    label={`${bothDaysCheckedIn} Checked In`}
                    size="small"
                    sx={{
                      fontWeight: 800,
                      fontSize: '0.72rem',
                      bgcolor: bothDaysCheckedIn > 0 ? '#e85d26' : 'rgba(0,0,0,0.08)',
                      color: bothDaysCheckedIn > 0 ? '#fff' : 'inherit',
                    }}
                  />
                </Box>
                <Grid container spacing={1} sx={{ my: 0.5 }}>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Registered
                    </Typography>
                    <Typography variant="h5" fontWeight="800" sx={{ color: '#0f2942' }}>
                      {bothDaysTotal}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {stats?.session_insights?.both_days?.pct || 0}% of summit
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Checked In
                    </Typography>
                    <Typography variant="h5" fontWeight="800" sx={{ color: '#e85d26' }}>
                      {bothDaysCheckedIn}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {bothDaysRate}% attended
                    </Typography>
                  </Grid>
                </Grid>
                <LinearProgress
                  variant="determinate"
                  value={bothDaysRate}
                  sx={{ height: 6, borderRadius: 3, bgcolor: 'rgba(232, 93, 38, 0.15)', mt: 1, '& .MuiLinearProgress-bar': { bgcolor: '#e85d26' } }}
                />
              </Paper>
            </Grid>
          </Grid>

          {/* Breakdown into Session 1 and Session 2 under each Day */}
          <Grid container spacing={3}>
            {/* Day 1 Sessions */}
            <Grid item xs={12} md={6}>
              <Paper elevation={0} sx={{ p: 2.5, borderRadius: 2.5, border: '1px solid #e2e8f0', bgcolor: '#f8fafc' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="subtitle1" fontWeight="800" color="#0f2942">
                    Day 1 Sessions Breakdown
                  </Typography>
                  <Chip label="Day 1" size="small" color="primary" sx={{ fontWeight: 700 }} />
                </Box>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                  {/* Session 1 */}
                  <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="body2" fontWeight="700">
                        Session 1 (Morning / Opening)
                      </Typography>
                      <Typography variant="body2" fontWeight="800" color="primary.main">
                        {stats?.session_insights?.day1?.session1?.count || 0} attendees ({stats?.session_insights?.day1?.session1?.pct || 0}%)
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={stats?.session_insights?.day1?.session1?.pct || 0}
                      sx={{ height: 7, borderRadius: 3, bgcolor: '#e2e8f0', '& .MuiLinearProgress-bar': { bgcolor: '#0284c7' } }}
                    />
                  </Box>

                  {/* Session 2 */}
                  <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="body2" fontWeight="700">
                        Session 2 (Afternoon / Technical)
                      </Typography>
                      <Typography variant="body2" fontWeight="800" color="primary.main">
                        {stats?.session_insights?.day1?.session2?.count || 0} attendees ({stats?.session_insights?.day1?.session2?.pct || 0}%)
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={stats?.session_insights?.day1?.session2?.pct || 0}
                      sx={{ height: 7, borderRadius: 3, bgcolor: '#e2e8f0', '& .MuiLinearProgress-bar': { bgcolor: '#0ea5e9' } }}
                    />
                  </Box>
                </Box>
              </Paper>
            </Grid>

            {/* Day 2 Sessions */}
            <Grid item xs={12} md={6}>
              <Paper elevation={0} sx={{ p: 2.5, borderRadius: 2.5, border: '1px solid #e2e8f0', bgcolor: '#f8fafc' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="subtitle1" fontWeight="800" color="#0f2942">
                    Day 2 Sessions Breakdown
                  </Typography>
                  <Chip label="Day 2" size="small" sx={{ bgcolor: '#8b5cf6', color: '#fff', fontWeight: 700 }} />
                </Box>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                  {/* Session 1 */}
                  <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="body2" fontWeight="700">
                        Session 1 (Morning / Panels)
                      </Typography>
                      <Typography variant="body2" fontWeight="800" sx={{ color: '#8b5cf6' }}>
                        {stats?.session_insights?.day2?.session1?.count || 0} attendees ({stats?.session_insights?.day2?.session1?.pct || 0}%)
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={stats?.session_insights?.day2?.session1?.pct || 0}
                      sx={{ height: 7, borderRadius: 3, bgcolor: '#e2e8f0', '& .MuiLinearProgress-bar': { bgcolor: '#8b5cf6' } }}
                    />
                  </Box>

                  {/* Session 2 */}
                  <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="body2" fontWeight="700">
                        Session 2 (Closing / Communiqué)
                      </Typography>
                      <Typography variant="body2" fontWeight="800" sx={{ color: '#8b5cf6' }}>
                        {stats?.session_insights?.day2?.session2?.count || 0} attendees ({stats?.session_insights?.day2?.session2?.pct || 0}%)
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={stats?.session_insights?.day2?.session2?.pct || 0}
                      sx={{ height: 7, borderRadius: 3, bgcolor: '#e2e8f0', '& .MuiLinearProgress-bar': { bgcolor: '#a855f7' } }}
                    />
                  </Box>
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Bottom Row: Recent Check-in Activity & Quick Actions */}
      <Card>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box>
              <Typography variant="h6" fontWeight="700">
                Recent On-Site Check-ins
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Latest attendees checked in at the accreditation desk
              </Typography>
            </Box>
            <Button
              variant="outlined"
              size="small"
              endIcon={<ArrowForwardIcon />}
              onClick={() => navigate('/participants')}
            >
              Open Full Directory
            </Button>
          </Box>

          {stats?.recent_checkins?.length > 0 ? (
            <Grid container spacing={2}>
              {stats.recent_checkins.map((p) => (
                <Grid item xs={12} sm={6} md={4} key={p.id}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2,
                      borderRadius: 2.5,
                      border: '1px solid #e2e8f0',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: 1,
                      transition: 'all 0.2s ease',
                      '&:hover': { borderColor: 'primary.main', boxShadow: '0 4px 12px rgba(2, 132, 199, 0.1)' },
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Box>
                        <Typography variant="subtitle2" fontWeight="700">
                          {p.name || p.full_name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block">
                          {p.email}
                        </Typography>
                        {p.mobile && (
                          <Typography variant="caption" color="text.secondary" display="block">
                            📞 {p.mobile}
                          </Typography>
                        )}
                      </Box>
                      <Chip
                        label={p.guest_type || 'General Participant'}
                        size="small"
                        color="primary"
                        variant="outlined"
                        sx={{ fontWeight: 700, fontSize: '0.68rem' }}
                      />
                    </Box>

                    {p.session && (
                      <Typography variant="caption" color="text.secondary">
                        📅 {p.session}
                      </Typography>
                    )}

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1, pt: 1, borderTop: '1px dashed #e2e8f0' }}>
                      <Typography variant="caption" color="success.main" fontWeight="700" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <CheckCircleIcon sx={{ fontSize: 14 }} /> Checked In
                      </Typography>
                      <Button
                        size="small"
                        variant="text"
                        startIcon={<BadgeIcon fontSize="small" />}
                        onClick={() => setSelectedBadgeParticipant(p)}
                      >
                        Badge
                      </Button>
                    </Box>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          ) : (
            <Box sx={{ py: 4, textAlign: 'center', bgcolor: '#f8fafc', borderRadius: 2 }}>
              <Typography variant="body2" color="text.secondary">
                No participants checked in yet today. Use the <strong>Fast Check-in Desk</strong> to scan or search attendees.
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Participant Create Dialog */}
      <ParticipantDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSave={handleCreateParticipant}
        onPrintBadge={(p) => {
          setCreateOpen(false);
          setSelectedBadgeParticipant(p);
        }}
      />

      {/* Badge Modal */}
      <ParticipantBadgeModal
        open={Boolean(selectedBadgeParticipant)}
        onClose={() => setSelectedBadgeParticipant(null)}
        participant={selectedBadgeParticipant}
      />

      {/* Fast Check-in Desk */}
      <FastCheckinModal
        open={fastCheckinOpen}
        onClose={() => setFastCheckinOpen(false)}
        onCheckinSuccess={() => fetchDashboardData()}
        onPrintBadge={(p) => setSelectedBadgeParticipant(p)}
      />

      {/* Export Feedback Notification */}
      <Snackbar
        open={exportNotification.open}
        autoHideDuration={4000}
        onClose={() => setExportNotification((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setExportNotification((prev) => ({ ...prev, open: false }))}
          severity={exportNotification.severity}
          variant="filled"
          sx={{ width: '100%', fontWeight: 700 }}
        >
          {exportNotification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};
