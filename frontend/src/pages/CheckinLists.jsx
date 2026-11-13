import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  IconButton,
  InputAdornment,
  Snackbar,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography,
  Menu,
  MenuItem,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import DownloadIcon from '@mui/icons-material/Download';
import BadgeIcon from '@mui/icons-material/Badge';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import UndoIcon from '@mui/icons-material/Undo';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import { useAuth } from '../context/AuthContext';
import { participantsService } from '../services/api';
import { ParticipantBadgeModal } from '../components/ParticipantBadgeModal';

const ROWS_PER_PAGE = 25;

const DAY_META = {
  1: {
    label: 'Day 1',
    checkinFilter: 'DAY_1_CHECKED_IN',
    exportDay: '1',
    color: '#2d82c6',
    softBg: 'rgba(45, 130, 198, 0.08)',
    border: 'rgba(45, 130, 198, 0.25)',
  },
  2: {
    label: 'Day 2',
    checkinFilter: 'DAY_2_CHECKED_IN',
    exportDay: '2',
    color: '#50153f',
    softBg: 'rgba(80, 21, 63, 0.08)',
    border: 'rgba(80, 21, 63, 0.25)',
  },
};

const GUEST_TYPE_COLORS = {
  'General Participant': { color: '#2d82c6', bg: 'rgba(45, 130, 198, 0.1)' },
  'Guest': { color: '#fab319', bg: 'rgba(250, 179, 25, 0.15)' },
  'Speaker': { color: '#e85d26', bg: 'rgba(232, 93, 38, 0.12)' },
  'VIP': { color: '#50153f', bg: 'rgba(80, 21, 63, 0.12)' },
};

const formatCheckinTime = (value) => {
  if (!value) return '—';
  return new Date(value).toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const CheckinLists = () => {
  const navigate = useNavigate();
  const { canAccessParticipants, canExportReports } = useAuth();

  const [day, setDay] = useState(1);
  const [search, setSearch] = useState('');
  const [participants, setParticipants] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [stats, setStats] = useState(null);
  const [badgeParticipant, setBadgeParticipant] = useState(null);
  const [exportLoading, setExportLoading] = useState(false);
  const [exportMenuAnchor, setExportMenuAnchor] = useState(null);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'info' });

  const meta = DAY_META[day];
  const checkinTimeKey = day === 1 ? 'day1_checked_in_at' : 'day2_checked_in_at';

  useEffect(() => {
    if (!canAccessParticipants) {
      navigate('/dashboard', { replace: true });
    }
  }, [canAccessParticipants, navigate]);

  const fetchStats = useCallback(async () => {
    try {
      const data = await participantsService.getStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to load check-in stats', err);
    }
  }, []);

  const fetchParticipants = useCallback(async () => {
    setLoading(true);
    try {
      const data = await participantsService.getAll({
        search: search.trim() || undefined,
        checkin_filter: meta.checkinFilter,
        sort_by: `-${checkinTimeKey}`,
        page: page + 1,
      });
      if (data.results) {
        setParticipants(data.results);
        setTotalCount(data.count || 0);
      } else {
        setParticipants(data);
        setTotalCount(data.length);
      }
    } catch (err) {
      console.error('Failed to fetch check-in list', err);
      setToast({ open: true, message: 'Failed to load check-in list.', severity: 'error' });
    } finally {
      setLoading(false);
    }
  }, [checkinTimeKey, meta.checkinFilter, page, search]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchParticipants();
    }, 250);
    return () => clearTimeout(delayDebounce);
  }, [fetchParticipants]);

  const handleTabChange = (_, nextDay) => {
    setDay(nextDay);
    setPage(0);
  };

  const handleUndoCheckin = async (participant) => {
    try {
      const res = await participantsService.toggleDayCheckin(participant.id, day);
      setToast({ open: true, message: res.message, severity: 'success' });
      await Promise.all([fetchParticipants(), fetchStats()]);
    } catch {
      setToast({
        open: true,
        message: `Failed to undo Day ${day} check-in.`,
        severity: 'error',
      });
    }
  };

  const handleExportCheckedIn = async () => {
    setExportMenuAnchor(null);
    if (dayCheckedIn === 0) {
      setToast({
        open: true,
        message: `No participants have checked in for ${meta.label} yet.`,
        severity: 'info',
      });
      return;
    }
    setExportLoading(true);
    try {
      await participantsService.downloadExport(
        participantsService.getCheckinExportUrl({
          day: meta.exportDay,
          only_checked_in: 'true',
          search: search.trim() ? search.trim() : undefined,
        }),
        `summit_day${meta.exportDay}_checkedin_report.csv`
      );
      setToast({
        open: true,
        message: `${meta.label} checked-in report downloaded successfully.`,
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
      setToast({ open: true, message: msg, severity: 'error' });
    } finally {
      setExportLoading(false);
    }
  };

  const handleExportRegistered = async () => {
    setExportMenuAnchor(null);
    setExportLoading(true);
    try {
      await participantsService.downloadExport(
        participantsService.getCheckinExportUrl({
          day: meta.exportDay,
          only_checked_in: 'false',
          search: search.trim() ? search.trim() : undefined,
        }),
        `summit_day${meta.exportDay}_registered_roster.csv`
      );
      setToast({
        open: true,
        message: `${meta.label} registered roster downloaded successfully (${dayRegistered} attendees).`,
        severity: 'success',
      });
    } catch (err) {
      console.error('Export failed', err);
      const msg =
        err.parsedMessage ||
        err.response?.data?.error ||
        err.response?.data?.detail ||
        'Failed to download CSV export. Please check connection and try again.';
      setToast({ open: true, message: msg, severity: 'error' });
    } finally {
      setExportLoading(false);
    }
  };

  const handleExportAllCheckins = async () => {
    setExportMenuAnchor(null);
    setExportLoading(true);
    try {
      await participantsService.downloadExport(
        participantsService.getCheckinExportUrl({ day: 'all' }),
        'summit_all_checkins_report.csv'
      );
      setToast({
        open: true,
        message: 'Full summit check-in report downloaded successfully.',
        severity: 'success',
      });
    } catch (err) {
      console.error('Export failed', err);
      const msg =
        err.parsedMessage ||
        err.response?.data?.error ||
        err.response?.data?.detail ||
        'Failed to download CSV export.';
      setToast({ open: true, message: msg, severity: 'error' });
    } finally {
      setExportLoading(false);
    }
  };

  const checkinSummary = stats?.session_insights?.checkin_summary;
  const day1CheckedIn = checkinSummary?.day1_checked_in ?? stats?.day1_checked_in ?? 0;
  const day2CheckedIn = checkinSummary?.day2_checked_in ?? stats?.day2_checked_in ?? 0;
  const day1Total = stats?.session_insights?.day1?.total ?? stats?.day1_total ?? 0;
  const day2Total = stats?.session_insights?.day2?.total ?? stats?.day2_total ?? 0;
  const dayCheckedIn = day === 1 ? day1CheckedIn : day2CheckedIn;
  const dayRegistered = day === 1 ? day1Total : day2Total;

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', md: 'center' },
          gap: 2,
          mb: 3,
        }}
      >
        <Box>
          <Typography variant="h4" fontWeight="800" sx={{ color: '#0f172a' }}>
            Day 1 & Day 2 Check-ins
          </Typography>
          <Typography variant="body2" color="text.secondary">
            On-site attendance lists for accreditation, badge printing, and CSV reporting
          </Typography>
        </Box>

        {canExportReports && (
          <>
            <Button
              variant="contained"
              disabled={exportLoading}
              startIcon={exportLoading ? <CircularProgress size={18} color="inherit" /> : <DownloadIcon />}
              endIcon={<ArrowDropDownIcon />}
              onClick={(e) => setExportMenuAnchor(e.currentTarget)}
              sx={{
                fontWeight: 700,
                bgcolor: meta.color,
                '&:hover': { bgcolor: meta.color, filter: 'brightness(0.92)' },
              }}
            >
              {exportLoading ? 'Exporting...' : `Export ${meta.label} CSV`}
            </Button>
            <Menu
              anchorEl={exportMenuAnchor}
              open={Boolean(exportMenuAnchor)}
              onClose={() => setExportMenuAnchor(null)}
              PaperProps={{ sx: { minWidth: 260, borderRadius: 2, mt: 1 } }}
            >
              <MenuItem onClick={handleExportCheckedIn}>
                <EventAvailableIcon fontSize="small" sx={{ mr: 1.5, color: meta.color }} />
                Export Checked-In Only ({dayCheckedIn})
              </MenuItem>
              <MenuItem onClick={handleExportRegistered}>
                <DownloadIcon fontSize="small" sx={{ mr: 1.5, color: 'text.secondary' }} />
                Export Full {meta.label} Roster ({dayRegistered})
              </MenuItem>
              <MenuItem onClick={handleExportAllCheckins}>
                <DownloadIcon fontSize="small" sx={{ mr: 1.5, color: 'text.secondary' }} />
                Export All Check-ins (Both Days)
              </MenuItem>
            </Menu>
          </>
        )}
      </Box>

      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 2.5 }}>
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              justifyContent: 'space-between',
              alignItems: { xs: 'stretch', md: 'center' },
              gap: 2,
            }}
          >
            <Tabs
              value={day}
              onChange={handleTabChange}
              sx={{
                minHeight: 44,
                '& .MuiTab-root': { textTransform: 'none', fontWeight: 700, minHeight: 44 },
              }}
            >
              <Tab
                value={1}
                icon={<EventAvailableIcon fontSize="small" />}
                iconPosition="start"
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    Day 1 Check-ins
                    <Chip
                      label={day1CheckedIn}
                      size="small"
                      sx={{ height: 20, fontWeight: 800, bgcolor: DAY_META[1].softBg, color: DAY_META[1].color }}
                    />
                  </Box>
                }
              />
              <Tab
                value={2}
                icon={<EventAvailableIcon fontSize="small" />}
                iconPosition="start"
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    Day 2 Check-ins
                    <Chip
                      label={day2CheckedIn}
                      size="small"
                      sx={{ height: 20, fontWeight: 800, bgcolor: DAY_META[2].softBg, color: DAY_META[2].color }}
                    />
                  </Box>
                }
              />
            </Tabs>

            <TextField
              size="small"
              sx={{ minWidth: { xs: '100%', md: 320 } }}
              placeholder="Search checked-in attendees..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
          </Box>

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 2 }}>
            <Chip
              icon={<CheckCircleIcon sx={{ fontSize: '15px !important' }} />}
              label={`${dayCheckedIn} checked in`}
              size="small"
              sx={{ fontWeight: 700, bgcolor: meta.softBg, color: meta.color }}
            />
            <Chip
              label={`${dayRegistered} registered for ${meta.label}`}
              size="small"
              variant="outlined"
              sx={{ fontWeight: 600, borderColor: meta.border }}
            />
            <Chip
              label={`${totalCount} shown${search.trim() ? ' for search' : ''}`}
              size="small"
              variant="outlined"
              sx={{ fontWeight: 600 }}
            />
          </Box>
        </CardContent>
      </Card>

      <Card sx={{ overflow: 'hidden' }}>
        <TableContainer sx={{ maxHeight: 'calc(100vh - 380px)' }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Summit ID</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Attendee</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Contact</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Guest Type</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Registered Sessions</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Check-in Time</TableCell>
                <TableCell sx={{ fontWeight: 700, textAlign: 'right' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={36} />
                    <Typography color="text.secondary" sx={{ mt: 1 }}>
                      Loading {meta.label} check-ins...
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : participants.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                    <Typography variant="subtitle1" fontWeight="600" color="text.secondary">
                      No {meta.label} check-ins found.
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {search.trim()
                        ? 'Try clearing the search field.'
                        : 'Checked-in attendees will appear here as they arrive.'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                participants.map((p) => {
                  const guestTypeStyle = GUEST_TYPE_COLORS[p.guest_type] || GUEST_TYPE_COLORS['General Participant'];
                  return (
                    <TableRow key={p.id} hover>
                      <TableCell>
                        <Chip
                          label={p.summit_id}
                          size="small"
                          color="primary"
                          variant="outlined"
                          onClick={() => setBadgeParticipant(p)}
                          sx={{
                            fontWeight: 700,
                            cursor: 'pointer',
                            '&:hover': { bgcolor: 'primary.light', color: 'primary.dark' },
                          }}
                        />
                      </TableCell>
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
                      <TableCell>
                        <Typography variant="body2" sx={{ color: '#1e293b', fontSize: '0.82rem' }}>
                          {p.email || '—'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {p.mobile || p.phone || '—'}
                        </Typography>
                      </TableCell>
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
                      <TableCell>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, maxWidth: 220 }}>
                          {p.session_badges?.length > 0 ? (
                            p.session_badges.map((badge) => (
                              <Chip
                                key={badge}
                                label={badge}
                                size="small"
                                sx={{
                                  height: 22,
                                  fontSize: '0.68rem',
                                  fontWeight: 700,
                                  bgcolor: badge.startsWith('Day 1')
                                    ? 'rgba(45, 130, 198, 0.1)'
                                    : 'rgba(80, 21, 63, 0.1)',
                                  color: badge.startsWith('Day 1') ? '#2d82c6' : '#50153f',
                                  border: `1px solid ${
                                    badge.startsWith('Day 1')
                                      ? 'rgba(45, 130, 198, 0.25)'
                                      : 'rgba(80, 21, 63, 0.25)'
                                  }`,
                                }}
                              />
                            ))
                          ) : (
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                              {p.session || '—'}
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="600" sx={{ whiteSpace: 'nowrap' }}>
                          {formatCheckinTime(p[checkinTimeKey])}
                        </Typography>
                        <Chip
                          icon={<CheckCircleIcon sx={{ fontSize: '13px !important' }} />}
                          label={`${meta.label} In`}
                          size="small"
                          sx={{
                            mt: 0.5,
                            height: 21,
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            bgcolor: meta.softBg,
                            color: meta.color,
                          }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                          <Tooltip title="View / Print Summit Badge">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => setBadgeParticipant(p)}
                            >
                              <BadgeIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={`Undo ${meta.label} check-in`}>
                            <IconButton
                              size="small"
                              color="warning"
                              onClick={() => handleUndoCheckin(p)}
                            >
                              <UndoIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
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
          rowsPerPageOptions={[ROWS_PER_PAGE]}
          component="div"
          count={totalCount}
          rowsPerPage={ROWS_PER_PAGE}
          page={page}
          onPageChange={(e, newPage) => setPage(newPage)}
        />
      </Card>

      <ParticipantBadgeModal
        open={Boolean(badgeParticipant)}
        onClose={() => setBadgeParticipant(null)}
        participant={badgeParticipant}
      />

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
