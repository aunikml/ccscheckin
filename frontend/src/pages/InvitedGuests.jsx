import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  TextField,
  InputAdornment,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Paper,
  Chip,
  Button,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import SyncIcon from '@mui/icons-material/Sync';
import DownloadIcon from '@mui/icons-material/Download';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import FilterAltOffIcon from '@mui/icons-material/FilterAltOff';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import MarkEmailReadIcon from '@mui/icons-material/MarkEmailRead';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';

import { useAuth } from '../context/AuthContext';
import { invitedGuestsService } from '../services/api';

const ROWS_PER_PAGE_OPTIONS = [25, 50, 100];

export const InvitedGuests = () => {
  const { isAdmin } = useAuth();

  const [guests, setGuests] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [registrationStatus, setRegistrationStatus] = useState('ALL');
  const [cohortFilter, setCohortFilter] = useState('ALL');
  const [sessionFilter, setSessionFilter] = useState('ALL');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  // Sync Dialog
  const [syncDialogOpen, setSyncDialogOpen] = useState(false);
  const [syncSheetUrl, setSyncSheetUrl] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Toast
  const [toast, setToast] = useState({ open: false, message: '', severity: 'info' });

  // Load summary stats
  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const data = await invitedGuestsService.getStats();
      setStats(data);
      if (data.config?.sheet_url) {
        setSyncSheetUrl(data.config.sheet_url);
      }
    } catch (err) {
      console.error('Failed to load invited guests stats', err);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // Fetch paginated guest list
  const fetchGuests = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        search: search.trim() || undefined,
        registration_status: registrationStatus !== 'ALL' ? registrationStatus : undefined,
        cohort: cohortFilter !== 'ALL' ? cohortFilter : undefined,
        session: sessionFilter !== 'ALL' ? sessionFilter : undefined,
        page: page + 1,
        page_size: rowsPerPage,
      };

      const data = await invitedGuestsService.getAll(params);
      if (data.results) {
        setGuests(data.results);
        setTotalCount(data.count || 0);
      } else {
        setGuests(data);
        setTotalCount(data.length);
      }
    } catch (err) {
      console.error('Failed to load invited guests', err);
      setToast({ open: true, message: 'Failed to load invited guests.', severity: 'error' });
    } finally {
      setLoading(false);
    }
  }, [search, registrationStatus, cohortFilter, sessionFilter, page, rowsPerPage]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchGuests();
    }, 250);
    return () => clearTimeout(delayDebounce);
  }, [fetchGuests]);

  const handleClearFilters = () => {
    setSearch('');
    setRegistrationStatus('ALL');
    setCohortFilter('ALL');
    setSessionFilter('ALL');
    setPage(0);
  };

  const handleSyncSubmit = async () => {
    setSyncing(true);
    try {
      const res = await invitedGuestsService.syncSheet(syncSheetUrl);
      setToast({
        open: true,
        message: res.message || `Successfully synced ${res.total_imported || ''} invited guests.`,
        severity: 'success',
      });
      setSyncDialogOpen(false);
      fetchStats();
      fetchGuests();
    } catch (err) {
      setToast({
        open: true,
        message: err.response?.data?.error || err.message || 'Failed to sync invited guests sheet.',
        severity: 'error',
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const params = {
        search: search.trim() || undefined,
        registration_status: registrationStatus !== 'ALL' ? registrationStatus : undefined,
        cohort: cohortFilter !== 'ALL' ? cohortFilter : undefined,
        session: sessionFilter !== 'ALL' ? sessionFilter : undefined,
      };
      await invitedGuestsService.exportCsv(params);
      setToast({ open: true, message: 'Invited guests CSV exported successfully.', severity: 'success' });
    } catch (err) {
      setToast({ open: true, message: 'CSV export failed.', severity: 'error' });
    } finally {
      setExporting(false);
    }
  };

  if (!isAdmin) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Alert severity="warning" sx={{ maxWidth: 600, mx: 'auto' }}>
          This page is restricted to administrators only.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', md: 'center' },
          flexDirection: { xs: 'column', md: 'row' },
          gap: 2,
          mb: 3,
        }}
      >
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <MarkEmailReadIcon sx={{ color: '#50153f', fontSize: 32 }} />
            <Typography variant="h4" fontWeight="800" sx={{ color: '#0f172a' }}>
              Invited Guests Reference
            </Typography>
            <Chip
              label="Admin Only"
              size="small"
              sx={{
                bgcolor: 'rgba(80, 21, 63, 0.1)',
                color: '#50153f',
                fontWeight: 800,
                fontSize: '0.7rem',
              }}
            />
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Master reference of contacts invited by email. Cross-referenced in real-time with summit registrations.
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            startIcon={<SyncIcon />}
            onClick={() => setSyncDialogOpen(true)}
            sx={{
              borderColor: '#cbd5e1',
              color: '#334155',
              fontWeight: 700,
              '&:hover': { borderColor: '#50153f', color: '#50153f' },
            }}
          >
            Sync Google Sheet
          </Button>

          <Button
            variant="contained"
            startIcon={exporting ? <CircularProgress size={18} color="inherit" /> : <DownloadIcon />}
            onClick={handleExportCsv}
            disabled={exporting}
            sx={{
              bgcolor: '#50153f',
              fontWeight: 700,
              '&:hover': { bgcolor: '#3d1030' },
            }}
          >
            Export CSV
          </Button>
        </Box>
      </Box>

      {/* KPI Cards */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="caption" fontWeight="700" color="text.secondary">
                  TOTAL INVITATIONS
                </Typography>
                <Box sx={{ p: 0.8, borderRadius: 2, bgcolor: 'rgba(80, 21, 63, 0.08)', color: '#50153f' }}>
                  <PeopleAltIcon fontSize="small" />
                </Box>
              </Box>
              <Typography variant="h4" fontWeight="800" sx={{ color: '#0f172a' }}>
                {stats ? stats.total_invited?.toLocaleString() : '—'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Sent across all cohorts & sessions
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="caption" fontWeight="700" color="text.secondary">
                  REGISTERED RESPONSES
                </Typography>
                <Box sx={{ p: 0.8, borderRadius: 2, bgcolor: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
                  <CheckCircleIcon fontSize="small" />
                </Box>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                <Typography variant="h4" fontWeight="800" sx={{ color: '#10b981' }}>
                  {stats ? stats.total_registered?.toLocaleString() : '—'}
                </Typography>
                {stats?.registration_rate !== undefined && (
                  <Chip
                    label={`${stats.registration_rate}%`}
                    size="small"
                    sx={{
                      bgcolor: 'rgba(16, 185, 129, 0.12)',
                      color: '#10b981',
                      fontWeight: 800,
                      fontSize: '0.72rem',
                      height: 22,
                    }}
                  />
                )}
              </Box>
              <Typography variant="caption" color="text.secondary">
                Matched with active participants
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="caption" fontWeight="700" color="text.secondary">
                  PENDING / NOT REGISTERED
                </Typography>
                <Box sx={{ p: 0.8, borderRadius: 2, bgcolor: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
                  <HourglassEmptyIcon fontSize="small" />
                </Box>
              </Box>
              <Typography variant="h4" fontWeight="800" sx={{ color: '#f59e0b' }}>
                {stats ? stats.total_not_registered?.toLocaleString() : '—'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Invited but no matching form response
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="caption" fontWeight="700" color="text.secondary">
                  LAST SHEET SYNC
                </Typography>
                <Box sx={{ p: 0.8, borderRadius: 2, bgcolor: 'rgba(45, 130, 198, 0.1)', color: '#2d82c6' }}>
                  <SyncIcon fontSize="small" />
                </Box>
              </Box>
              <Typography variant="subtitle1" fontWeight="800" sx={{ color: '#0f172a' }}>
                {stats?.config?.last_synced_at
                  ? new Date(stats.config.last_synced_at).toLocaleString([], {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : 'Not synced yet'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Status:{' '}
                <Box
                  component="span"
                  sx={{
                    fontWeight: 700,
                    color: stats?.config?.last_sync_status === 'SUCCESS' ? '#10b981' : '#64748b',
                  }}
                >
                  {stats?.config?.last_sync_status || 'IDLE'}
                </Box>
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filter and Search Bar */}
      <Paper
        sx={{
          p: 2,
          mb: 3,
          borderRadius: 3,
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
        }}
      >
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search by name, email, phone, or cohort..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: '#94a3b8' }} />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>

          <Grid item xs={12} sm={6} md={2.5}>
            <FormControl fullWidth size="small">
              <InputLabel>Registration Status</InputLabel>
              <Select
                value={registrationStatus}
                label="Registration Status"
                onChange={(e) => {
                  setRegistrationStatus(e.target.value);
                  setPage(0);
                }}
              >
                <MenuItem value="ALL">All ({stats?.total_invited || 0})</MenuItem>
                <MenuItem value="REGISTERED">Registered ({stats?.total_registered || 0})</MenuItem>
                <MenuItem value="NOT_REGISTERED">Not Registered ({stats?.total_not_registered || 0})</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={2.5}>
            <FormControl fullWidth size="small">
              <InputLabel>Cohort</InputLabel>
              <Select
                value={cohortFilter}
                label="Cohort"
                onChange={(e) => {
                  setCohortFilter(e.target.value);
                  setPage(0);
                }}
              >
                <MenuItem value="ALL">All Cohorts</MenuItem>
                {(stats?.cohorts || []).map((c) => (
                  <MenuItem key={c.cohort} value={c.cohort}>
                    {c.cohort} ({c.count})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Invited Session</InputLabel>
              <Select
                value={sessionFilter}
                label="Invited Session"
                onChange={(e) => {
                  setSessionFilter(e.target.value);
                  setPage(0);
                }}
              >
                <MenuItem value="ALL">All Sessions</MenuItem>
                {(stats?.sessions || []).map((s) => (
                  <MenuItem key={s.session} value={s.session}>
                    {s.session} ({s.count})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={1}>
            <Tooltip title="Reset all filters">
              <IconButton onClick={handleClearFilters} sx={{ color: '#64748b' }}>
                <FilterAltOffIcon />
              </IconButton>
            </Tooltip>
          </Grid>
        </Grid>
      </Paper>

      {/* Main Table */}
      <Paper
        sx={{
          borderRadius: 3,
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
          overflow: 'hidden',
        }}
      >
        {loading && <LinearProgress sx={{ bgcolor: 'rgba(80, 21, 63, 0.1)', '& .MuiLinearProgress-bar': { bgcolor: '#50153f' } }} />}

        <TableContainer sx={{ maxHeight: 650 }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow sx={{ bgcolor: '#f8fafc' }}>
                <TableCell sx={{ fontWeight: 800, color: '#334155' }}>#</TableCell>
                <TableCell sx={{ fontWeight: 800, color: '#334155' }}>Invited Guest</TableCell>
                <TableCell sx={{ fontWeight: 800, color: '#334155' }}>Email Address</TableCell>
                <TableCell sx={{ fontWeight: 800, color: '#334155' }}>Mobile</TableCell>
                <TableCell sx={{ fontWeight: 800, color: '#334155' }}>Co-hort</TableCell>
                <TableCell sx={{ fontWeight: 800, color: '#334155' }}>Invited Session</TableCell>
                <TableCell sx={{ fontWeight: 800, color: '#334155' }}>Registration Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {guests.length === 0 && !loading ? (
                <TableRow>
                  <TableCell colSpan={7} sx={{ py: 6, textAlign: 'center' }}>
                    <Typography variant="body1" fontWeight="700" color="text.secondary">
                      No invited guests match your search criteria.
                    </Typography>
                    <Button variant="text" onClick={handleClearFilters} sx={{ mt: 1, color: '#50153f' }}>
                      Clear Filters
                    </Button>
                  </TableCell>
                </TableRow>
              ) : (
                guests.map((g, index) => {
                  const rowNum = page * rowsPerPage + index + 1;
                  return (
                    <TableRow key={g.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                      <TableCell sx={{ color: '#94a3b8', fontSize: '0.8rem', width: 50 }}>
                        {rowNum}
                      </TableCell>

                      <TableCell>
                        <Typography variant="subtitle2" fontWeight="700" sx={{ color: '#0f172a' }}>
                          {g.name || <Box component="span" sx={{ color: '#94a3b8', fontStyle: 'italic' }}>No name provided</Box>}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Typography variant="body2" sx={{ color: '#334155', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                          {g.email || <Box component="span" sx={{ color: '#94a3b8' }}>—</Box>}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                          {g.number || '—'}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        {g.cohort ? (
                          <Chip
                            label={g.cohort}
                            size="small"
                            sx={{
                              bgcolor: 'rgba(45, 130, 198, 0.08)',
                              color: '#2d82c6',
                              fontWeight: 700,
                              fontSize: '0.7rem',
                              border: '1px solid rgba(45, 130, 198, 0.25)',
                            }}
                          />
                        ) : (
                          <Typography variant="caption" color="text.secondary">—</Typography>
                        )}
                      </TableCell>

                      <TableCell>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                          {g.session || '—'}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        {g.is_registered ? (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                            <Chip
                              icon={<CheckCircleIcon sx={{ fontSize: '14px !important' }} />}
                              label="Registered"
                              size="small"
                              sx={{
                                bgcolor: 'rgba(16, 185, 129, 0.1)',
                                color: '#10b981',
                                fontWeight: 800,
                                fontSize: '0.72rem',
                                border: '1px solid rgba(16, 185, 129, 0.3)',
                              }}
                            />
                            {g.registered_summit_id && (
                              <Chip
                                label={g.registered_summit_id}
                                size="small"
                                sx={{
                                  bgcolor: '#f1f5f9',
                                  color: '#334155',
                                  fontWeight: 700,
                                  fontSize: '0.7rem',
                                }}
                              />
                            )}
                            {g.day1_checked_in && (
                              <Chip
                                label="Day 1 In"
                                size="small"
                                sx={{
                                  bgcolor: '#2d82c6',
                                  color: '#ffffff',
                                  fontWeight: 700,
                                  fontSize: '0.65rem',
                                  height: 20,
                                }}
                              />
                            )}
                            {g.day2_checked_in && (
                              <Chip
                                label="Day 2 In"
                                size="small"
                                sx={{
                                  bgcolor: '#50153f',
                                  color: '#ffffff',
                                  fontWeight: 700,
                                  fontSize: '0.65rem',
                                  height: 20,
                                }}
                              />
                            )}
                          </Box>
                        ) : (
                          <Chip
                            label="Not Registered"
                            size="small"
                            sx={{
                              bgcolor: 'rgba(148, 163, 184, 0.1)',
                              color: '#64748b',
                              fontWeight: 700,
                              fontSize: '0.72rem',
                            }}
                          />
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          rowsPerPageOptions={ROWS_PER_PAGE_OPTIONS}
          component="div"
          count={totalCount}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
        />
      </Paper>

      {/* Sync Google Sheet Dialog */}
      <Dialog open={syncDialogOpen} onClose={() => !syncing && setSyncDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 1 }}>
          <SyncIcon sx={{ color: '#50153f' }} />
          Sync Invited Guests from Google Sheet
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Provide the Google Spreadsheet link containing the invited guests roster. The sheet must have general viewer access enabled.
          </Typography>

          <TextField
            fullWidth
            label="Google Spreadsheet URL or ID"
            value={syncSheetUrl}
            onChange={(e) => setSyncSheetUrl(e.target.value)}
            disabled={syncing}
            placeholder="https://docs.google.com/spreadsheets/d/..."
            sx={{ mb: 2 }}
          />

          {syncSheetUrl && (
            <Button
              size="small"
              startIcon={<OpenInNewIcon />}
              href={syncSheetUrl}
              target="_blank"
              rel="noopener noreferrer"
              sx={{ color: '#2d82c6', textTransform: 'none' }}
            >
              Open Google Sheet in new tab
            </Button>
          )}

          {stats?.config?.last_synced_at && (
            <Box sx={{ mt: 2, p: 1.5, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0' }}>
              <Typography variant="caption" color="text.secondary" display="block">
                Last synced:{' '}
                <strong>{new Date(stats.config.last_synced_at).toLocaleString()}</strong>
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                Status: <strong>{stats.config.last_sync_status}</strong> — {stats.config.last_sync_message}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setSyncDialogOpen(false)} disabled={syncing}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSyncSubmit}
            disabled={syncing || !syncSheetUrl.trim()}
            startIcon={syncing ? <CircularProgress size={16} color="inherit" /> : <SyncIcon />}
            sx={{ bgcolor: '#50153f', fontWeight: 700, '&:hover': { bgcolor: '#3d1030' } }}
          >
            {syncing ? 'Syncing Sheet...' : 'Pull Live Sheet'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar Toast */}
      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={() => setToast({ ...toast, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={toast.severity} onClose={() => setToast({ ...toast, open: false })} sx={{ fontWeight: 600 }}>
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};
