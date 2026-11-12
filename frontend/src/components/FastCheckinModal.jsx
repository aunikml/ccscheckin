import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Chip,
  Alert,
  Paper,
  CircularProgress,
  ToggleButtonGroup,
  ToggleButton,
  Divider,
  List,
  ListItem,
  ListItemButton,
  ListItemAvatar,
  ListItemText,
  Avatar,
  IconButton,
  InputAdornment,
} from '@mui/material';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import PrintIcon from '@mui/icons-material/Print';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import PersonIcon from '@mui/icons-material/Person';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import { motion, AnimatePresence } from 'framer-motion';
import { participantsService } from '../services/api';

const GUEST_TYPE_COLORS = {
  'General Participant': '#2d82c6',
  'Guest': '#fab319',
  'Speaker': '#e85d26',
  'VIP': '#50153f',
  'Organizer / Crew': '#1e824c',
};

export const FastCheckinModal = ({ open, onClose, onCheckinSuccess, onPrintBadge }) => {
  const [query, setQuery] = useState('');
  const [selectedDay, setSelectedDay] = useState('1'); // '1' or '2'
  const [suggestions, setSuggestions] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState(null);
  const [loading, setLoading] = useState(false);
  const [checkinSuccess, setCheckinSuccess] = useState(null);
  const [error, setError] = useState('');
  const inputRef = useRef(null);
  const debounceTimerRef = useRef(null);

  // Reset modal on open
  useEffect(() => {
    if (open) {
      setQuery('');
      setSuggestions([]);
      setSelectedParticipant(null);
      setCheckinSuccess(null);
      setError('');
      setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
    }
  }, [open]);

  // Debounced search lookup as user types
  const handleQueryChange = (val) => {
    setQuery(val);
    setError('');
    setCheckinSuccess(null);

    // If a participant was already selected and user modifies query, unselect
    if (selectedParticipant && val !== selectedParticipant.name && val !== selectedParticipant.summit_id) {
      setSelectedParticipant(null);
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!val.trim()) {
      setSuggestions([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const results = await participantsService.searchLookup(val.trim());
        setSuggestions(results || []);
      } catch (err) {
        console.error('Search lookup failed', err);
        setSuggestions([]);
      } finally {
        setSearching(false);
      }
    }, 200);
  };

  // Choose participant from suggestion list
  const handleSelectParticipant = (participant) => {
    setSelectedParticipant(participant);
    setQuery(participant.name || participant.summit_id);
    setSuggestions([]);
    setError('');
    setCheckinSuccess(null);
  };

  // Clear current selection to search for another
  const handleClearSelection = () => {
    setSelectedParticipant(null);
    setQuery('');
    setSuggestions([]);
    setCheckinSuccess(null);
    setError('');
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  // Check in action
  const handleCheckin = async () => {
    if (!selectedParticipant && !query.trim()) return;

    setLoading(true);
    setError('');

    try {
      const payload = selectedParticipant
        ? { participant_id: selectedParticipant.id, day: selectedDay }
        : { query: query.trim(), day: selectedDay };

      const res = await participantsService.fastCheckin(payload);

      // Update selected participant with fresh checkin state
      setSelectedParticipant(res.participant);
      setCheckinSuccess({
        already_checked_in: res.already_checked_in,
        message: res.message,
        participant: res.participant,
      });

      if (onCheckinSuccess) {
        onCheckinSuccess(res.participant);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to check in participant.');
    } finally {
      setLoading(false);
    }
  };

  // Scan or Enter submit handler
  const handleFormSubmit = async (e) => {
    e?.preventDefault();
    if (selectedParticipant) {
      handleCheckin();
      return;
    }

    if (suggestions.length === 1) {
      handleSelectParticipant(suggestions[0]);
      return;
    }

    if (query.trim()) {
      handleCheckin();
    }
  };

  // Helpers to inspect check-in state for active station
  const isParticipantCheckedInForStation = (p, day) => {
    if (!p) return false;
    return day === '1' ? Boolean(p.day1_checked_in) : Boolean(p.day2_checked_in);
  };

  const getCheckinTimestamp = (p, day) => {
    if (!p) return null;
    const timeStr = day === '1' ? p.day1_checked_in_at : p.day2_checked_in_at;
    if (!timeStr) return null;
    try {
      return new Date(timeStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch (e) {
      return null;
    }
  };

  const isSelectedAlreadyCheckedIn = selectedParticipant
    ? isParticipantCheckedInForStation(selectedParticipant, selectedDay)
    : false;

  const selectedTimestamp = selectedParticipant
    ? getCheckinTimestamp(selectedParticipant, selectedDay)
    : null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ pb: 1.5, borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box sx={{ bgcolor: 'rgba(80, 21, 63, 0.1)', color: '#50153f', p: 1, borderRadius: 2 }}>
          <QrCodeScannerIcon />
        </Box>
        <Box>
          <Typography variant="h6" fontWeight="800" sx={{ color: '#0f172a' }}>
            Fast Check-in & Badge Desk
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Type name, mobile, email, or Summit ID to choose an attendee and check them in
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pt: 2.5 }}>
        {/* Active Station Day Selector */}
        <Box sx={{ mb: 2.5, textAlign: 'center' }}>
          <Typography variant="caption" fontWeight="800" color="text.secondary" sx={{ display: 'block', mb: 1, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Active Check-in Station:
          </Typography>
          <ToggleButtonGroup
            value={selectedDay}
            exclusive
            onChange={(e, newDay) => {
              if (newDay) {
                setSelectedDay(newDay);
                setCheckinSuccess(null);
              }
            }}
            size="small"
            fullWidth
            sx={{
              bgcolor: '#f1f5f9',
              p: 0.5,
              borderRadius: 2,
              '& .MuiToggleButton-root': {
                border: 'none',
                borderRadius: 1.5,
                fontWeight: 800,
                fontSize: '0.85rem',
                py: 0.9,
                '&.Mui-selected': {
                  bgcolor: selectedDay === '1' ? '#2d82c6' : '#50153f',
                  color: 'white',
                  '&:hover': {
                    bgcolor: selectedDay === '1' ? '#236ca7' : '#3b0d2d',
                  },
                },
              },
            }}
          >
            <ToggleButton value="1">
              📅 Day 1 Check-in Station
            </ToggleButton>
            <ToggleButton value="2">
              📅 Day 2 Check-in Station
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {/* Search Input Box */}
        <form onSubmit={handleFormSubmit}>
          <Box sx={{ position: 'relative', mb: 2 }}>
            <TextField
              inputRef={inputRef}
              fullWidth
              autoFocus
              placeholder="Type participant name, mobile, email, or Summit ID..."
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              disabled={loading}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    {searching ? (
                      <CircularProgress size={20} sx={{ color: selectedDay === '1' ? '#2d82c6' : '#50153f' }} />
                    ) : (
                      <SearchIcon sx={{ color: 'text.secondary' }} />
                    )}
                  </InputAdornment>
                ),
                endAdornment: (query || selectedParticipant) ? (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={handleClearSelection}>
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ) : null,
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  bgcolor: '#ffffff',
                  '&.Mui-focused fieldset': {
                    borderColor: selectedDay === '1' ? '#2d82c6' : '#50153f',
                    borderWidth: 2,
                  },
                },
              }}
            />

            {/* Live Search Suggestions Dropdown */}
            {suggestions.length > 0 && !selectedParticipant && (
              <Paper
                elevation={4}
                sx={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  zIndex: 20,
                  mt: 0.8,
                  borderRadius: 2.5,
                  maxHeight: 280,
                  overflowY: 'auto',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
                }}
              >
                <Box sx={{ px: 2, py: 1, bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <Typography variant="caption" fontWeight="800" color="text.secondary">
                    Select matching attendee ({suggestions.length} found):
                  </Typography>
                </Box>
                <List disablePadding>
                  {suggestions.map((p) => {
                    const isCheckedIn = isParticipantCheckedInForStation(p, selectedDay);
                    const timeChecked = getCheckinTimestamp(p, selectedDay);
                    const guestColor = GUEST_TYPE_COLORS[p.guest_type] || '#2d82c6';

                    return (
                      <ListItem key={p.id} disablePadding divider>
                        <ListItemButton
                          onClick={() => handleSelectParticipant(p)}
                          sx={{
                            py: 1.2,
                            px: 2,
                            '&:hover': {
                              bgcolor: 'rgba(80, 21, 63, 0.04)',
                            },
                          }}
                        >
                          <ListItemAvatar sx={{ minWidth: 46 }}>
                            <Avatar
                              sx={{
                                width: 34,
                                height: 34,
                                bgcolor: guestColor,
                                fontSize: '0.85rem',
                                fontWeight: 800,
                              }}
                            >
                              {(p.name || 'P')[0].toUpperCase()}
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                <Typography variant="subtitle2" fontWeight="800" sx={{ color: '#0f172a' }}>
                                  {p.name}
                                </Typography>
                                <Chip
                                  label={p.summit_id}
                                  size="small"
                                  sx={{
                                    height: 20,
                                    fontSize: '0.7rem',
                                    fontWeight: 700,
                                    bgcolor: '#f1f5f9',
                                  }}
                                />
                                <Chip
                                  label={p.guest_type || 'General'}
                                  size="small"
                                  sx={{
                                    height: 20,
                                    fontSize: '0.68rem',
                                    fontWeight: 700,
                                    bgcolor: `${guestColor}15`,
                                    color: guestColor,
                                    border: `1px solid ${guestColor}30`,
                                  }}
                                />
                              </Box>
                            }
                            secondary={
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.3 }}>
                                <Typography variant="caption" color="text.secondary">
                                  {p.mobile ? `📞 ${p.mobile}` : ''} {p.email ? `• ${p.email}` : ''}
                                </Typography>
                                {isCheckedIn ? (
                                  <Chip
                                    size="small"
                                    icon={<CheckCircleIcon sx={{ fontSize: '14px !important' }} />}
                                    label={`Day ${selectedDay}: Already Checked In${timeChecked ? ` (${timeChecked})` : ''}`}
                                    sx={{
                                      height: 22,
                                      fontSize: '0.68rem',
                                      fontWeight: 800,
                                      bgcolor: '#fef3c7',
                                      color: '#92400e',
                                      border: '1px solid #fde68a',
                                    }}
                                  />
                                ) : (
                                  <Chip
                                    size="small"
                                    label={`Day ${selectedDay}: Not Checked In`}
                                    sx={{
                                      height: 22,
                                      fontSize: '0.68rem',
                                      fontWeight: 700,
                                      bgcolor: '#f1f5f9',
                                      color: '#64748b',
                                    }}
                                  />
                                )}
                              </Box>
                            }
                          />
                        </ListItemButton>
                      </ListItem>
                    );
                  })}
                </List>
              </Paper>
            )}

            {/* No match indicator while typing */}
            {query.trim().length >= 2 && !searching && suggestions.length === 0 && !selectedParticipant && (
              <Box sx={{ mt: 1, px: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  No registered participants found matching "<strong>{query}</strong>".
                </Typography>
              </Box>
            )}
          </Box>
        </form>

        {error && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
            {error}
          </Alert>
        )}

        {/* Selected Participant Card */}
        <AnimatePresence>
          {selectedParticipant && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              <Paper
                elevation={0}
                sx={{
                  p: 2.5,
                  borderRadius: 3,
                  bgcolor: isSelectedAlreadyCheckedIn ? '#fffbeb' : '#f8fafc',
                  border: `2px solid ${isSelectedAlreadyCheckedIn ? '#f59e0b' : (selectedDay === '1' ? '#2d82c6' : '#50153f')}`,
                  mb: 2,
                }}
              >
                {/* Header with Name & Actions */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                      <Typography variant="h6" fontWeight="900" sx={{ color: '#0f172a' }}>
                        {selectedParticipant.name || selectedParticipant.full_name}
                      </Typography>
                      <Chip
                        label={selectedParticipant.summit_id}
                        size="small"
                        sx={{ fontWeight: 800, bgcolor: '#ffffff', border: '1px solid #cbd5e1' }}
                      />
                      <Chip
                        label={selectedParticipant.guest_type || 'General Participant'}
                        size="small"
                        sx={{
                          fontWeight: 800,
                          bgcolor: `${GUEST_TYPE_COLORS[selectedParticipant.guest_type] || '#2d82c6'}20`,
                          color: GUEST_TYPE_COLORS[selectedParticipant.guest_type] || '#2d82c6',
                        }}
                      />
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                      {selectedParticipant.email} {selectedParticipant.mobile ? `• 📞 ${selectedParticipant.mobile}` : ''}
                    </Typography>
                  </Box>

                  <Button
                    size="small"
                    variant="text"
                    color="inherit"
                    onClick={handleClearSelection}
                    sx={{ fontSize: '0.75rem', fontWeight: 700 }}
                  >
                    Change
                  </Button>
                </Box>

                <Divider sx={{ my: 1.5 }} />

                {/* Day 1 & Day 2 Badge indicators */}
                <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                  <Chip
                    icon={<EventAvailableIcon />}
                    label={
                      selectedParticipant.day1_checked_in
                        ? `Day 1: Checked In (${getCheckinTimestamp(selectedParticipant, '1') || 'Done'})`
                        : 'Day 1: Not Checked In'
                    }
                    size="small"
                    color={selectedParticipant.day1_checked_in ? 'success' : 'default'}
                    sx={{ fontWeight: 700 }}
                  />
                  <Chip
                    icon={<EventAvailableIcon />}
                    label={
                      selectedParticipant.day2_checked_in
                        ? `Day 2: Checked In (${getCheckinTimestamp(selectedParticipant, '2') || 'Done'})`
                        : 'Day 2: Not Checked In'
                    }
                    size="small"
                    color={selectedParticipant.day2_checked_in ? 'success' : 'default'}
                    sx={{ fontWeight: 700 }}
                  />
                </Box>

                {/* Check-in Status Warning or Ready Prompt */}
                {isSelectedAlreadyCheckedIn ? (
                  <Alert
                    severity="warning"
                    icon={<WarningAmberIcon />}
                    sx={{
                      mb: 2,
                      borderRadius: 2,
                      bgcolor: '#fef3c7',
                      color: '#92400e',
                      border: '1px solid #fde68a',
                      '& .MuiAlert-icon': { color: '#d97706' },
                    }}
                  >
                    <Typography variant="subtitle2" fontWeight="800">
                      Already Checked In for Day {selectedDay}
                    </Typography>
                    <Typography variant="caption">
                      This participant was already accredited on Day {selectedDay}
                      {selectedTimestamp ? ` at ${selectedTimestamp}` : ''}. You may re-print their badge below.
                    </Typography>
                  </Alert>
                ) : (
                  <Alert
                    severity="info"
                    icon={<HowToRegIcon />}
                    sx={{
                      mb: 2,
                      borderRadius: 2,
                      bgcolor: selectedDay === '1' ? 'rgba(45, 130, 198, 0.08)' : 'rgba(80, 21, 63, 0.08)',
                      color: selectedDay === '1' ? '#1e5d8f' : '#50153f',
                      border: `1px solid ${selectedDay === '1' ? 'rgba(45, 130, 198, 0.25)' : 'rgba(80, 21, 63, 0.25)'}`,
                    }}
                  >
                    <Typography variant="subtitle2" fontWeight="800">
                      Participant Chosen — Ready for Day {selectedDay} Check-In
                    </Typography>
                    <Typography variant="caption">
                      Click "Confirm Check-in" below to mark attendance and generate accreditation.
                    </Typography>
                  </Alert>
                )}

                {/* Success Message After Check-in Action */}
                {checkinSuccess && (
                  <Alert
                    severity="success"
                    icon={<CheckCircleIcon />}
                    sx={{ mb: 2, borderRadius: 2 }}
                  >
                    <Typography variant="subtitle2" fontWeight="800">
                      {checkinSuccess.message}
                    </Typography>
                  </Alert>
                )}

                {/* Main Action Buttons */}
                <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'flex-end', flexWrap: 'wrap', mt: 1 }}>
                  {onPrintBadge && (
                    <Button
                      variant="outlined"
                      startIcon={<PrintIcon />}
                      onClick={() => onPrintBadge(selectedParticipant)}
                      sx={{ fontWeight: 700 }}
                    >
                      Print Lanyard Badge
                    </Button>
                  )}

                  <Button
                    variant="contained"
                    startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <HowToRegIcon />}
                    onClick={handleCheckin}
                    disabled={loading}
                    sx={{
                      fontWeight: 800,
                      px: 3,
                      bgcolor: isSelectedAlreadyCheckedIn ? '#d97706' : (selectedDay === '1' ? '#2d82c6' : '#50153f'),
                      '&:hover': {
                        bgcolor: isSelectedAlreadyCheckedIn ? '#b45309' : (selectedDay === '1' ? '#236ca7' : '#3b0d2d'),
                      },
                    }}
                  >
                    {isSelectedAlreadyCheckedIn
                      ? `Re-confirm Day ${selectedDay} Check-In`
                      : `Confirm Day ${selectedDay} Check-In`}
                  </Button>
                </Box>
              </Paper>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, justifyContent: 'space-between' }}>
        <Button
          startIcon={<RestartAltIcon />}
          onClick={handleClearSelection}
          color="inherit"
          disabled={!query && !selectedParticipant}
        >
          Next Attendee (Reset)
        </Button>
        <Button onClick={onClose} color="inherit">
          Close Desk
        </Button>
      </DialogActions>
    </Dialog>
  );
};
