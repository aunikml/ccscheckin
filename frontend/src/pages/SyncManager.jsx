import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Alert,
  CircularProgress,
  Divider,
  Snackbar,
} from '@mui/material';
import SyncIcon from '@mui/icons-material/Sync';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SettingsIcon from '@mui/icons-material/Settings';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import TableChartIcon from '@mui/icons-material/TableChart';
import HelpOutlineIcon from '@mui/icons-material/HelpOutlined';
import { motion } from 'framer-motion';
import { syncService } from '../services/api';

export const SyncManager = () => {
  const [config, setConfig] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form inputs
  const [sheetInput, setSheetInput] = useState('');
  const [tabName, setTabName] = useState('Form Responses 1');
  const [savingConfig, setSavingConfig] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const [toast, setToast] = useState({ open: false, message: '', severity: 'info' });

  const loadData = async () => {
    try {
      const [configData, historyData] = await Promise.all([
        syncService.getConfig(),
        syncService.getHistory(),
      ]);
      setConfig(configData);
      setSheetInput(configData.sheet_url_or_id || '');
      setTabName(configData.tab_name || 'Form Responses 1');
      setHistory(historyData);
    } catch (err) {
      console.error('Failed to load sync configuration', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    setSavingConfig(true);
    try {
      const updated = await syncService.updateConfig({
        sheet_url_or_id: sheetInput.trim(),
        tab_name: tabName.trim(),
      });
      setConfig(updated);
      setToast({ open: true, message: 'Google Sheet configuration updated!', severity: 'success' });
    } catch (err) {
      setToast({ open: true, message: 'Failed to update configuration.', severity: 'error' });
    } finally {
      setSavingConfig(false);
    }
  };

  const handleTriggerLiveSync = async (useSample = false) => {
    setSyncing(true);
    try {
      const res = await syncService.triggerSync({
        sheet_url_or_id: sheetInput.trim() || undefined,
        use_sample: useSample,
      });
      setToast({
        open: true,
        message: res.message || 'Sync completed successfully!',
        severity: 'success',
      });
      await loadData();
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || err.message || 'Sync failed';
      setToast({ open: true, message: msg, severity: 'error' });
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  const columnMappings = [
    { formHeader: 'Guest Type', modelField: 'guest_type', desc: 'Accreditation type (e.g. General Participant, Guest, Speaker, VIP)' },
    { formHeader: 'Time of Registration', modelField: 'registration_time', desc: 'Date/time of Google Form submission (e.g. 12-Oct-2026)' },
    { formHeader: 'Name', modelField: 'name', desc: 'Participant full name' },
    { formHeader: 'Email', modelField: 'email', desc: 'Primary identifier (unique key for upsert)' },
    { formHeader: 'Mobile', modelField: 'mobile', desc: 'Mobile / WhatsApp contact number' },
    { formHeader: 'Confirmation', modelField: 'confirmation', desc: 'Confirmation status (Yes / Maybe / No)' },
    { formHeader: 'Session', modelField: 'session', desc: 'Summit session selected (e.g. Day 1 Session 1, Day 2 Session 2)' },
  ];

  return (
    <Box>
      {/* Page Header */}
      <Box sx={{ mb: 3.5 }}>
        <Typography variant="h4" fontWeight="800" sx={{ color: '#0f172a' }}>
          Google Form & Sheet Integration Hub
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Pull responses from your Google Form spreadsheet directly into the National Child Care Summit database
        </Typography>
      </Box>

      {/* Visual Pipeline Banner */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 4,
          borderRadius: 3,
          background: 'linear-gradient(135deg, #25091e 0%, #3d0e2f 50%, #50153f 100%)',
          color: 'white',
          boxShadow: '0 10px 25px -5px rgba(80, 21, 63, 0.3)',
        }}
      >
        <Typography variant="subtitle2" sx={{ color: '#e85d26', fontWeight: 800, letterSpacing: '0.05em' }}>
          AUTOMATED REGISTRATION PIPELINE
        </Typography>
        <Typography variant="h6" fontWeight="700" sx={{ mt: 0.5, mb: 2 }}>
          Google Form Responses ➔ Google Sheet ➔ Django Database Engine ➔ React Portal
        </Typography>

        <Grid container spacing={2}>
          <Grid item xs={12} sm={4}>
            <Box sx={{ bgcolor: 'rgba(255,255,255,0.08)', p: 2, borderRadius: 2 }}>
              <Typography variant="subtitle2" fontWeight="700">
                1. Google Form Submission
              </Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', display: 'block', mt: 0.5 }}>
                Attendees fill out your summit registration form online. Google stores each answer row in the linked sheet.
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Box sx={{ bgcolor: 'rgba(255,255,255,0.08)', p: 2, borderRadius: 2 }}>
              <Typography variant="subtitle2" fontWeight="700">
                2. Automated Upsert Sync
              </Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', display: 'block', mt: 0.5 }}>
                Our backend pulls the rows, maps form questions to participant records, and creates/updates records by email.
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Box sx={{ bgcolor: 'rgba(255,255,255,0.08)', p: 2, borderRadius: 2 }}>
              <Typography variant="subtitle2" fontWeight="700">
                3. On-Site Operations
              </Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', display: 'block', mt: 0.5 }}>
                Accreditation desk searches participants, views/prints badges with QR codes, and toggles real-time check-ins.
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Configuration & Actions */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Connection Form */}
        <Grid item xs={12} md={7}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                <SettingsIcon color="primary" />
                <Typography variant="h6" fontWeight="700">
                  Google Sheet Source Configuration
                </Typography>
              </Box>

              <form onSubmit={handleSaveConfig}>
                <TextField
                  fullWidth
                  label="Google Sheet URL or ID"
                  value={sheetInput}
                  onChange={(e) => setSheetInput(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5n.../edit"
                  helperText="Paste either the full URL or the spreadsheet ID. Ensure the sheet is shared as 'Anyone with the link can view'."
                  margin="normal"
                />

                <TextField
                  fullWidth
                  label="Sheet Tab Name"
                  value={tabName}
                  onChange={(e) => setTabName(e.target.value)}
                  placeholder="Form Responses 1"
                  helperText="Default Google Form responses tab is usually 'Form Responses 1'."
                  margin="normal"
                />

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 3 }}>
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={savingConfig}
                  >
                    {savingConfig ? 'Saving Settings...' : 'Save Configuration'}
                  </Button>

                  <Button
                    variant="outlined"
                    color="primary"
                    startIcon={syncing ? <CircularProgress size={16} /> : <CloudDownloadIcon />}
                    onClick={() => handleTriggerLiveSync(false)}
                    disabled={syncing || !sheetInput.trim()}
                  >
                    {syncing ? 'Syncing...' : 'Pull Live From Sheet'}
                  </Button>
                </Box>
              </form>

              <Divider sx={{ my: 3 }} />

              {/* Instant Test Mode Helper */}
              <Box sx={{ bgcolor: '#f8fafc', p: 2, borderRadius: 2, border: '1px dashed #cbd5e1' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                  <Box>
                    <Typography variant="subtitle2" fontWeight="700">
                      Need to test without an external Google Sheet?
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Populate database with realistic National Child Care Summit registration responses.
                    </Typography>
                  </Box>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<SyncIcon />}
                    onClick={() => handleTriggerLiveSync(true)}
                    disabled={syncing}
                  >
                    Load Sample Form Data
                  </Button>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* How-To & Status Card */}
        <Grid item xs={12} md={5}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                <HelpOutlineIcon color="primary" />
                <Typography variant="h6" fontWeight="700">
                  Google Sheet Setup Instructions
                </Typography>
              </Box>

              <Typography variant="body2" color="text.secondary" paragraph>
                Follow these simple steps in Google Sheets to connect your form:
              </Typography>

              <Box component="ol" sx={{ pl: 2.5, m: 0, '& li': { mb: 1.2, fontSize: '0.88rem', color: '#334155' } }}>
                <li>
                  Open your <strong>Google Form</strong> and click on the <strong>Responses</strong> tab.
                </li>
                <li>
                  Click <strong>Link to Sheets</strong> to create or open the response spreadsheet.
                </li>
                <li>
                  Click the green <strong>Share</strong> button (top right) in Google Sheets.
                </li>
                <li>
                  Under <em>General access</em>, change from <strong>Restricted</strong> to <strong>"Anyone with the link"</strong> (Viewer).
                </li>
                <li>
                  Copy the sheet URL and paste it in the box on the left, then click <strong>Pull Live From Sheet</strong>!
                </li>
              </Box>

              <Paper elevation={0} sx={{ p: 1.5, mt: 2, bgcolor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 2 }}>
                <Typography variant="caption" color="success.dark" fontWeight="700" display="block">
                  ✓ Idempotent Upsert Guarantee
                </Typography>
                <Typography variant="caption" color="success.dark">
                  Repeated syncs will never duplicate participants. Existing participants with matching email addresses will have their information safely updated.
                </Typography>
              </Paper>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Field Mapping Guide */}
      <Card sx={{ mb: 4 }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
            <TableChartIcon color="primary" />
            <Box>
              <Typography variant="h6" fontWeight="700">
                Form Questions to Database Field Mapping
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Our parsing engine automatically maps these common form headers to participant attributes
              </Typography>
            </Box>
          </Box>

          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Google Form Question Header</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Database Field</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Description</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {columnMappings.map((row) => (
                  <TableRow key={row.modelField} hover>
                    <TableCell>
                      <code>{row.formHeader}</code>
                    </TableCell>
                    <TableCell>
                      <Chip label={row.modelField} size="small" variant="outlined" color="primary" />
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">
                        {row.desc}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Sync History Logs */}
      <Card>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" fontWeight="700" gutterBottom>
            Synchronization History Logs
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
            Audit trail of past sync executions, rows ingested, and changes applied
          </Typography>

          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Timestamp</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Rows Ingested</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>New Added</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Updated</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Triggered By</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Details</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {history.length > 0 ? (
                  history.map((log) => (
                    <TableRow key={log.id} hover>
                      <TableCell>
                        <Typography variant="caption" fontWeight="600">
                          {new Date(log.started_at).toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={log.status}
                          size="small"
                          color={log.status === 'SUCCESS' ? 'success' : 'error'}
                          sx={{ fontWeight: 700, fontSize: '0.7rem' }}
                        />
                      </TableCell>
                      <TableCell>{log.rows_processed}</TableCell>
                      <TableCell>
                        <Typography variant="body2" color="success.main" fontWeight="700">
                          +{log.new_added}
                        </Typography>
                      </TableCell>
                      <TableCell>{log.updated}</TableCell>
                      <TableCell>
                        <Chip label={log.triggered_by} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary" sx={{ maxWidth: 300, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {log.details || '—'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                      <Typography variant="body2" color="text.secondary">
                        No synchronization history recorded yet.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Toast */}
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
