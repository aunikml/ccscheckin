import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  MenuItem,
  Typography,
  CircularProgress,
  Alert,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Paper,
  Box,
  Chip,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Avatar,
  IconButton,
  Tooltip,
  Divider,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import BadgeIcon from '@mui/icons-material/Badge';
import CloseIcon from '@mui/icons-material/Close';
import MarkEmailReadIcon from '@mui/icons-material/MarkEmailRead';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';

import { invitedGuestsService, participantsService } from '../services/api';

const GUEST_TYPES = [
  'General Participant',
  'Guest',
  'Speaker',
  'VIP',
  'Organizer / Crew',
];

const STATUSES = [
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'CHECKED_IN', label: 'Checked In' },
  { value: 'MAYBE', label: 'Tentative / Maybe' },
  { value: 'CANCELLED', label: 'Cancelled / No' },
];

const INITIAL_FORM = {
  name: '',
  email: '',
  mobile: '',
  guest_type: 'General Participant',
  day1_session1: true,
  day1_session2: false,
  day2_session1: false,
  day2_session2: false,
  session: 'Day 1 Session 1',
  registration_time: '',
  status: 'CONFIRMED',
  notes: '',
};

const parseSessionToCheckboxes = (sessionStr) => {
  const s = (sessionStr || '').toLowerCase();
  const d1s1 = s.includes('day 1 session 1') || s.includes('d1s1');
  const d1s2 = s.includes('day 1 session 2') || s.includes('d1s2');
  const d2s1 = s.includes('day 2 session 1') || s.includes('d2s1');
  const d2s2 = s.includes('day 2 session 2') || s.includes('d2s2');

  const hasAny = d1s1 || d1s2 || d2s1 || d2s2;
  return {
    day1_session1: d1s1 || (!hasAny && (s.includes('day 1') || s.includes('both'))),
    day1_session2: d1s2,
    day2_session1: d2s1 || (!hasAny && (s.includes('day 2') || s.includes('both'))),
    day2_session2: d2s2,
  };
};

export const ParticipantDialog = ({ open, onClose, onSave, participant, onPrintBadge }) => {
  const isEditing = Boolean(participant?.id);

  const [formData, setFormData] = useState(INITIAL_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Invited guest search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchingInvited, setSearchingInvited] = useState(false);
  const [invitedMatches, setInvitedMatches] = useState([]);
  const [selectedInvitedGuest, setSelectedInvitedGuest] = useState(null);

  // Post-save check-in prompt state
  const [createdParticipant, setCreatedParticipant] = useState(null);
  const [checkinPromptOpen, setCheckinPromptOpen] = useState(false);
  const [checkingInDay, setCheckingInDay] = useState(null);
  const [checkinStatus, setCheckinStatus] = useState({ day1: false, day2: false, message: '' });

  const debounceTimerRef = useRef(null);

  useEffect(() => {
    if (participant) {
      setFormData({
        name: participant.name || participant.full_name || '',
        email: participant.email || '',
        mobile: participant.mobile || participant.phone || '',
        guest_type: participant.guest_type || 'General Participant',
        day1_session1: Boolean(participant.day1_session1),
        day1_session2: Boolean(participant.day1_session2),
        day2_session1: Boolean(participant.day2_session1),
        day2_session2: Boolean(participant.day2_session2),
        session: participant.session || '',
        registration_time: participant.registration_time || '',
        status: participant.status || 'CONFIRMED',
        notes: participant.notes || '',
      });
    } else {
      setFormData(INITIAL_FORM);
    }

    setError('');
    setSearchQuery('');
    setInvitedMatches([]);
    setSelectedInvitedGuest(null);
    setCreatedParticipant(null);
    setCheckinPromptOpen(false);
    setCheckinStatus({ day1: false, day2: false, message: '' });
  }, [participant, open]);

  // Search invited guests when typing in query or individual inputs
  const performInvitedSearch = useCallback((queryText) => {
    const q = (queryText || '').trim();
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!q || q.length < 2) {
      setInvitedMatches([]);
      setSearchingInvited(false);
      return;
    }

    setSearchingInvited(true);
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const results = await invitedGuestsService.lookup(q);
        setInvitedMatches(results || []);
      } catch (err) {
        console.error('Invited guest lookup failed', err);
        setInvitedMatches([]);
      } finally {
        setSearchingInvited(false);
      }
    }, 200);
  }, []);

  const handleSearchQueryChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    performInvitedSearch(val);
  };

  const handleFieldChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // If adding new participant and not yet autofilled, typing in name/email/mobile also looks up invited guest
    if (!isEditing && !selectedInvitedGuest && ['name', 'email', 'mobile'].includes(name)) {
      if (value.trim().length >= 3) {
        setSearchQuery(value);
        performInvitedSearch(value);
      }
    }
  };

  const handleSelectInvitedGuest = (guest) => {
    const sessions = parseSessionToCheckboxes(guest.session);
    const selectedSessionLabels = [];
    if (sessions.day1_session1) selectedSessionLabels.push('Day 1 Session 1');
    if (sessions.day1_session2) selectedSessionLabels.push('Day 1 Session 2');
    if (sessions.day2_session1) selectedSessionLabels.push('Day 2 Session 1');
    if (sessions.day2_session2) selectedSessionLabels.push('Day 2 Session 2');

    setFormData((prev) => ({
      ...prev,
      name: guest.name || prev.name,
      email: guest.email || prev.email,
      mobile: guest.number || prev.mobile,
      ...sessions,
      session: selectedSessionLabels.join(', ') || prev.session,
      notes: guest.cohort ? `Invited Cohort: ${guest.cohort}` : prev.notes,
    }));

    setSelectedInvitedGuest(guest);
    setInvitedMatches([]);
    setSearchQuery('');
  };

  const handleClearAutofill = () => {
    setSelectedInvitedGuest(null);
    setSearchQuery('');
    setInvitedMatches([]);
  };

  const handleCheckboxChange = (name) => (e) => {
    const checked = e.target.checked;
    setFormData((prev) => {
      const next = { ...prev, [name]: checked };
      const selected = [];
      if (next.day1_session1) selected.push('Day 1 Session 1');
      if (next.day1_session2) selected.push('Day 1 Session 2');
      if (next.day2_session1) selected.push('Day 2 Session 1');
      if (next.day2_session2) selected.push('Day 2 Session 2');
      next.session = selected.join(', ');
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) {
      setError('Name and Email Address are required.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const saved = await onSave(formData);

      if (isEditing) {
        // If editing existing participant, finish normally
        onClose();
      } else {
        // If newly created, prompt host to check them in right away
        setCreatedParticipant(saved || { name: formData.name, email: formData.email });
        setCheckinPromptOpen(true);
      }
    } catch (err) {
      const errorMsg =
        err.response?.data?.email?.[0] ||
        err.response?.data?.detail ||
        err.response?.data?.error ||
        err.message ||
        'Failed to save participant.';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Perform immediate check-in from prompt
  const handlePerformCheckin = async (day) => {
    if (!createdParticipant?.id) return;
    setCheckingInDay(day);

    try {
      if (day === 'both') {
        const res1 = await participantsService.toggleDayCheckin(createdParticipant.id, 1);
        const res2 = await participantsService.toggleDayCheckin(createdParticipant.id, 2);
        setCreatedParticipant(res2.participant || res1.participant);
        setCheckinStatus({
          day1: true,
          day2: true,
          message: `${createdParticipant.name} is now checked in for Day 1 and Day 2!`,
        });
      } else {
        const res = await participantsService.toggleDayCheckin(createdParticipant.id, day);
        setCreatedParticipant(res.participant);
        setCheckinStatus((prev) => ({
          ...prev,
          [day === '1' ? 'day1' : 'day2']: true,
          message: `${createdParticipant.name} is now checked in for Day ${day}!`,
        }));
      }
    } catch (err) {
      console.error('Check-in failed from prompt', err);
    } finally {
      setCheckingInDay(null);
    }
  };

  // ==========================================
  // RENDER: Check-in Prompt View (Post-Save)
  // ==========================================
  if (checkinPromptOpen && createdParticipant) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ pb: 1, borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ bgcolor: 'rgba(16, 185, 129, 0.1)', color: '#10b981', p: 1, borderRadius: 2 }}>
            <CheckCircleIcon />
          </Box>
          <Box>
            <Typography variant="h6" fontWeight="800" sx={{ color: '#0f172a' }}>
              Participant Registered Successfully!
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Check in attendee now or print their summit accreditation badge
            </Typography>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ pt: 3 }}>
          {/* Participant summary card */}
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              mb: 3,
              bgcolor: '#f8fafc',
              borderRadius: 2.5,
              border: '1px solid #e2e8f0',
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
              <Box>
                <Typography variant="h6" fontWeight="800" sx={{ color: '#0f172a' }}>
                  {createdParticipant.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {createdParticipant.email} {createdParticipant.mobile ? `• ${createdParticipant.mobile}` : ''}
                </Typography>
              </Box>
              <Chip
                label={createdParticipant.summit_id || 'REGISTERED'}
                sx={{
                  bgcolor: 'rgba(80, 21, 63, 0.1)',
                  color: '#50153f',
                  fontWeight: 800,
                  fontSize: '0.75rem',
                }}
              />
            </Box>

            <Box sx={{ display: 'flex', gap: 1, mt: 1.5, flexWrap: 'wrap' }}>
              <Chip
                label={createdParticipant.guest_type || 'General Participant'}
                size="small"
                sx={{ bgcolor: '#e2e8f0', fontWeight: 700, fontSize: '0.7rem' }}
              />
              {createdParticipant.session && (
                <Chip
                  label={createdParticipant.session}
                  size="small"
                  sx={{ bgcolor: 'rgba(45, 130, 198, 0.1)', color: '#2d82c6', fontWeight: 700, fontSize: '0.7rem' }}
                />
              )}
            </Box>
          </Paper>

          {/* Success Banner if checked in */}
          {checkinStatus.message && (
            <Alert severity="success" icon={<CheckCircleIcon />} sx={{ mb: 3, borderRadius: 2, fontWeight: 700 }}>
              {checkinStatus.message}
            </Alert>
          )}

          {/* Prompt Section */}
          <Typography variant="subtitle2" fontWeight="800" color="#334155" sx={{ mb: 1.5 }}>
            Check In Attendee:
          </Typography>

          <Grid container spacing={2}>
            {/* Day 1 Check-in */}
            <Grid item xs={12} sm={6}>
              <Button
                fullWidth
                variant={checkinStatus.day1 || createdParticipant.day1_checked_in ? 'outlined' : 'contained'}
                size="large"
                startIcon={
                  checkingInDay === '1' ? (
                    <CircularProgress size={18} color="inherit" />
                  ) : checkinStatus.day1 || createdParticipant.day1_checked_in ? (
                    <CheckCircleIcon sx={{ color: '#10b981' }} />
                  ) : (
                    <HowToRegIcon />
                  )
                }
                onClick={() => handlePerformCheckin('1')}
                disabled={Boolean(checkingInDay)}
                sx={{
                  py: 1.5,
                  fontWeight: 800,
                  bgcolor: checkinStatus.day1 || createdParticipant.day1_checked_in ? 'rgba(16, 185, 129, 0.08)' : '#2d82c6',
                  color: checkinStatus.day1 || createdParticipant.day1_checked_in ? '#10b981' : '#ffffff',
                  borderColor: checkinStatus.day1 || createdParticipant.day1_checked_in ? '#10b981' : 'transparent',
                  '&:hover': {
                    bgcolor: checkinStatus.day1 || createdParticipant.day1_checked_in ? 'rgba(16, 185, 129, 0.15)' : '#1e68a3',
                  },
                }}
              >
                {checkinStatus.day1 || createdParticipant.day1_checked_in ? 'Day 1 Checked In ✓' : 'Check In Day 1'}
              </Button>
            </Grid>

            {/* Day 2 Check-in */}
            <Grid item xs={12} sm={6}>
              <Button
                fullWidth
                variant={checkinStatus.day2 || createdParticipant.day2_checked_in ? 'outlined' : 'contained'}
                size="large"
                startIcon={
                  checkingInDay === '2' ? (
                    <CircularProgress size={18} color="inherit" />
                  ) : checkinStatus.day2 || createdParticipant.day2_checked_in ? (
                    <CheckCircleIcon sx={{ color: '#10b981' }} />
                  ) : (
                    <HowToRegIcon />
                  )
                }
                onClick={() => handlePerformCheckin('2')}
                disabled={Boolean(checkingInDay)}
                sx={{
                  py: 1.5,
                  fontWeight: 800,
                  bgcolor: checkinStatus.day2 || createdParticipant.day2_checked_in ? 'rgba(16, 185, 129, 0.08)' : '#50153f',
                  color: checkinStatus.day2 || createdParticipant.day2_checked_in ? '#10b981' : '#ffffff',
                  borderColor: checkinStatus.day2 || createdParticipant.day2_checked_in ? '#10b981' : 'transparent',
                  '&:hover': {
                    bgcolor: checkinStatus.day2 || createdParticipant.day2_checked_in ? 'rgba(16, 185, 129, 0.15)' : '#3d1030',
                  },
                }}
              >
                {checkinStatus.day2 || createdParticipant.day2_checked_in ? 'Day 2 Checked In ✓' : 'Check In Day 2'}
              </Button>
            </Grid>

            {/* Check in Both Days */}
            {(!createdParticipant.day1_checked_in || !createdParticipant.day2_checked_in) &&
              (!checkinStatus.day1 || !checkinStatus.day2) && (
                <Grid item xs={12}>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={
                      checkingInDay === 'both' ? (
                        <CircularProgress size={16} color="inherit" />
                      ) : (
                        <EventAvailableIcon />
                      )
                    }
                    onClick={() => handlePerformCheckin('both')}
                    disabled={Boolean(checkingInDay)}
                    sx={{
                      borderColor: '#cbd5e1',
                      color: '#475569',
                      fontWeight: 700,
                      py: 1,
                      '&:hover': { borderColor: '#50153f', color: '#50153f' },
                    }}
                  >
                    Check In for Both Days
                  </Button>
                </Grid>
              )}
          </Grid>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #e2e8f0', justifyContent: 'space-between' }}>
          {onPrintBadge ? (
            <Button
              variant="outlined"
              startIcon={<BadgeIcon />}
              onClick={() => onPrintBadge(createdParticipant)}
              sx={{
                borderColor: '#50153f',
                color: '#50153f',
                fontWeight: 700,
                '&:hover': { bgcolor: 'rgba(80, 21, 63, 0.05)' },
              }}
            >
              Print Lanyard Badge
            </Button>
          ) : (
            <Box />
          )}

          <Button
            variant="contained"
            onClick={onClose}
            sx={{
              bgcolor: '#0f172a',
              fontWeight: 700,
              minWidth: 100,
              '&:hover': { bgcolor: '#1e293b' },
            }}
          >
            Done
          </Button>
        </DialogActions>
      </Dialog>
    );
  }

  // ==========================================
  // RENDER: Main Form Dialog
  // ==========================================
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ pb: 1, borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ bgcolor: 'rgba(80, 21, 63, 0.08)', color: '#50153f', p: 1, borderRadius: 2 }}>
            <PersonAddIcon />
          </Box>
          <Box>
            <Typography variant="h6" fontWeight="700">
              {isEditing ? `Edit Participant: ${participant.summit_id}` : 'Register Summit Participant'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              National Child Care Summit • Participant Management
            </Typography>
          </Box>
        </Box>
        <IconButton size="small" onClick={onClose} sx={{ color: '#94a3b8' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <form onSubmit={handleSubmit}>
        <DialogContent sx={{ pt: 2.5 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2 }}>
              {error}
            </Alert>
          )}

          {/* Invited Guest Search Bar (When Adding New Participant) */}
          {!isEditing && (
            <Box sx={{ mb: 3 }}>
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  bgcolor: selectedInvitedGuest ? 'rgba(16, 185, 129, 0.06)' : 'rgba(80, 21, 63, 0.03)',
                  borderRadius: 2.5,
                  border: selectedInvitedGuest ? '1.5px solid #10b981' : '1.5px dashed rgba(80, 21, 63, 0.3)',
                  position: 'relative',
                }}
              >
                {selectedInvitedGuest ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Avatar sx={{ bgcolor: '#10b981', width: 34, height: 34 }}>
                        <AutoAwesomeIcon sx={{ fontSize: 18 }} />
                      </Avatar>
                      <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="subtitle2" fontWeight="800" sx={{ color: '#0f172a' }}>
                            {selectedInvitedGuest.name}
                          </Typography>
                          <Chip
                            label="Autofilled from Invited List"
                            size="small"
                            sx={{
                              bgcolor: 'rgba(16, 185, 129, 0.15)',
                              color: '#10b981',
                              fontWeight: 800,
                              fontSize: '0.68rem',
                              height: 20,
                            }}
                          />
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                          {selectedInvitedGuest.email} {selectedInvitedGuest.number ? `• 📞 ${selectedInvitedGuest.number}` : ''}{' '}
                          {selectedInvitedGuest.cohort ? `• Cohort: ${selectedInvitedGuest.cohort}` : ''}
                        </Typography>
                      </Box>
                    </Box>

                    <Button
                      size="small"
                      color="inherit"
                      onClick={handleClearAutofill}
                      sx={{ fontSize: '0.75rem', textTransform: 'none', color: '#64748b' }}
                    >
                      Clear Autofill
                    </Button>
                  </Box>
                ) : (
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                      <MarkEmailReadIcon sx={{ color: '#50153f', fontSize: 20 }} />
                      <Typography variant="subtitle2" fontWeight="800" sx={{ color: '#0f172a' }}>
                        Search Invited Guests Roster:
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        (Type name, email, or mobile to autofill)
                      </Typography>
                    </Box>

                    <TextField
                      fullWidth
                      size="small"
                      value={searchQuery}
                      onChange={handleSearchQueryChange}
                      placeholder="e.g. Type attendee name, email address, or mobile number..."
                      InputProps={{
                        startAdornment: (
                          <SearchIcon sx={{ color: '#94a3b8', mr: 1, fontSize: 20 }} />
                        ),
                        endAdornment: searchingInvited ? (
                          <CircularProgress size={18} sx={{ color: '#50153f' }} />
                        ) : searchQuery ? (
                          <IconButton size="small" onClick={() => { setSearchQuery(''); setInvitedMatches([]); }}>
                            <CloseIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        ) : null,
                      }}
                      sx={{ bgcolor: '#ffffff', borderRadius: 2 }}
                    />

                    {/* Suggestions Dropdown Card */}
                    {invitedMatches.length > 0 && (
                      <Paper
                        elevation={4}
                        sx={{
                          mt: 1,
                          maxHeight: 260,
                          overflowY: 'auto',
                          borderRadius: 2,
                          border: '1px solid #e2e8f0',
                        }}
                      >
                        <Box sx={{ px: 2, py: 1, bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                          <Typography variant="caption" fontWeight="800" color="text.secondary">
                            Invited Guests Matches ({invitedMatches.length} found) — Click to Autofill:
                          </Typography>
                        </Box>
                        <List disablePadding>
                          {invitedMatches.map((guest) => (
                            <ListItem key={guest.id} disablePadding divider>
                              <ListItemButton
                                onClick={() => handleSelectInvitedGuest(guest)}
                                sx={{
                                  py: 1,
                                  px: 2,
                                  '&:hover': { bgcolor: 'rgba(80, 21, 63, 0.05)' },
                                }}
                              >
                                <ListItemIcon sx={{ minWidth: 38 }}>
                                  <Avatar sx={{ width: 28, height: 28, bgcolor: '#50153f', fontSize: '0.75rem', fontWeight: 800 }}>
                                    {(guest.name || 'G')[0].toUpperCase()}
                                  </Avatar>
                                </ListItemIcon>
                                <ListItemText
                                  primary={
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                      <Typography variant="subtitle2" fontWeight="700" sx={{ color: '#0f172a' }}>
                                        {guest.name}
                                      </Typography>
                                      {guest.cohort && (
                                        <Chip
                                          label={guest.cohort}
                                          size="small"
                                          sx={{ height: 18, fontSize: '0.65rem', fontWeight: 700, bgcolor: 'rgba(45, 130, 198, 0.1)', color: '#2d82c6' }}
                                        />
                                      )}
                                      {guest.is_registered && (
                                        <Chip
                                          label={`Registered (${guest.registered_summit_id || 'ID'})`}
                                          size="small"
                                          sx={{ height: 18, fontSize: '0.65rem', fontWeight: 700, bgcolor: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}
                                        />
                                      )}
                                    </Box>
                                  }
                                  secondary={
                                    <Typography variant="caption" color="text.secondary">
                                      {guest.email} {guest.number ? `• 📞 ${guest.number}` : ''}{' '}
                                      {guest.session ? `• Invited: ${guest.session}` : ''}
                                    </Typography>
                                  }
                                />
                                <Button size="small" variant="text" sx={{ color: '#50153f', fontWeight: 700, fontSize: '0.75rem' }}>
                                  Autofill
                                </Button>
                              </ListItemButton>
                            </ListItem>
                          ))}
                        </List>
                      </Paper>
                    )}
                  </Box>
                )}
              </Paper>
            </Box>
          )}

          <Grid container spacing={2}>
            {/* Name */}
            <Grid item xs={12} sm={6}>
              <TextField
                required
                fullWidth
                label="Full Name"
                name="name"
                value={formData.name}
                onChange={handleFieldChange}
                placeholder="e.g. Samiya Ummey Habiba"
              />
            </Grid>

            {/* Email */}
            <Grid item xs={12} sm={6}>
              <TextField
                required
                fullWidth
                type="email"
                label="Email Address"
                name="email"
                value={formData.email}
                onChange={handleFieldChange}
                placeholder="name@organization.org"
              />
            </Grid>

            {/* Mobile */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Mobile / Contact Number"
                name="mobile"
                value={formData.mobile}
                onChange={handleFieldChange}
                placeholder="+8801700000000"
              />
            </Grid>

            {/* Guest Type */}
            <Grid item xs={12} sm={6}>
              <TextField
                select
                fullWidth
                label="Guest Type"
                name="guest_type"
                value={formData.guest_type}
                onChange={handleFieldChange}
              >
                {GUEST_TYPES.map((type) => (
                  <MenuItem key={type} value={type}>
                    {type}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            {/* Summit Sessions Opt-in */}
            <Grid item xs={12}>
              <Paper elevation={0} sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0' }}>
                <Typography variant="subtitle2" fontWeight="700" color="#0f2942" gutterBottom>
                  Summit Sessions Registration (Multi-select)
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                  Select which day(s) and session(s) the participant is opting into:
                </Typography>

                <Grid container spacing={2}>
                  {/* Day 1 */}
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ p: 1.5, bgcolor: 'rgba(2, 132, 199, 0.05)', borderRadius: 2, border: '1px solid rgba(2, 132, 199, 0.15)' }}>
                      <Typography variant="caption" fontWeight="800" color="primary.main">
                        📅 DAY 1 SESSIONS
                      </Typography>
                      <FormGroup>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={formData.day1_session1}
                              onChange={handleCheckboxChange('day1_session1')}
                              color="primary"
                            />
                          }
                          label={<Typography variant="body2" fontWeight="600">Day 1 Session 1 (Opening / Morning)</Typography>}
                        />
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={formData.day1_session2}
                              onChange={handleCheckboxChange('day1_session2')}
                              color="primary"
                            />
                          }
                          label={<Typography variant="body2" fontWeight="600">Day 1 Session 2 (Afternoon Technical)</Typography>}
                        />
                      </FormGroup>
                    </Box>
                  </Grid>

                  {/* Day 2 */}
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ p: 1.5, bgcolor: 'rgba(139, 92, 246, 0.05)', borderRadius: 2, border: '1px solid rgba(139, 92, 246, 0.15)' }}>
                      <Typography variant="caption" fontWeight="800" sx={{ color: '#8b5cf6' }}>
                        📅 DAY 2 SESSIONS
                      </Typography>
                      <FormGroup>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={formData.day2_session1}
                              onChange={handleCheckboxChange('day2_session1')}
                              sx={{ color: '#8b5cf6', '&.Mui-checked': { color: '#8b5cf6' } }}
                            />
                          }
                          label={<Typography variant="body2" fontWeight="600">Day 2 Session 1 (Morning Panels)</Typography>}
                        />
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={formData.day2_session2}
                              onChange={handleCheckboxChange('day2_session2')}
                              sx={{ color: '#8b5cf6', '&.Mui-checked': { color: '#8b5cf6' } }}
                            />
                          }
                          label={<Typography variant="body2" fontWeight="600">Day 2 Session 2 (Closing Communiqué)</Typography>}
                        />
                      </FormGroup>
                    </Box>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>

            {/* Time of Registration */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Time of Registration"
                name="registration_time"
                value={formData.registration_time}
                onChange={handleFieldChange}
                placeholder="e.g. 12-Oct-2026"
              />
            </Grid>

            {/* Status */}
            <Grid item xs={12} sm={6}>
              <TextField
                select
                fullWidth
                label="Accreditation Status"
                name="status"
                value={formData.status}
                onChange={handleFieldChange}
              >
                {STATUSES.map((s) => (
                  <MenuItem key={s.value} value={s.value}>
                    {s.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            {/* Notes */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Internal Notes"
                name="notes"
                value={formData.notes}
                onChange={handleFieldChange}
                placeholder="Special notes, badge remarks, or cohort information..."
              />
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #e2e8f0' }}>
          <Button onClick={onClose} color="inherit" disabled={loading}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={loading}
            sx={{
              minWidth: 130,
              fontWeight: 800,
              bgcolor: '#50153f',
              '&:hover': { bgcolor: '#3d1030' },
            }}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : isEditing ? 'Save Changes' : 'Register Attendee'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};
