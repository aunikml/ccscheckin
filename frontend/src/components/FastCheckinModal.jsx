import React, { useState, useRef, useEffect } from 'react';
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
  Grid,
} from '@mui/material';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import PrintIcon from '@mui/icons-material/Print';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import CloseIcon from '@mui/icons-material/Close';
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
      const data = err.response?.data;
      if (data?.matches?.length) {
        setSelectedParticipant(null);
        setSuggestions(data.matches);
        setError(data.error || 'Multiple participants found. Please select the correct attendee.');
      } else {
        setError(data?.error || 'Failed to check in participant.');
      }
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

    // Multiple matches (e.g. duplicate emails): require an explicit choice.
    if (suggestions.length > 1) {
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
    } catch {
      return null;
    }
  };

  const getRegisteredSessionLabels = (p) => {
    if (!p) return [];
    if (Array.isArray(p.session_badges) && p.session_badges.length > 0) {
      return p.session_badges;
    }
    if (p.session) {
      return p.session.split(',').map((item) => item.trim()).filter(Boolean);
    }
    return [];
  };

  const isSelectedAlreadyCheckedIn = selectedParticipant
    ? isParticipantCheckedInForStation(selectedParticipant, selectedDay)
    : false;

  const selectedTimestamp = selectedParticipant
    ? getCheckinTimestamp(selectedParticipant, selectedDay)
    : null;

  const selectedSessionLabels = getRegisteredSessionLabels(selectedParticipant);
  const isRegisteredForSelectedDay = selectedParticipant
    ? Boolean(selectedDay === '1' ? selectedParticipant.attends_day1 : selectedParticipant.attends_day2)
    : false;

  const activeDayColor = selectedDay === '1' ? '#2d82c6' : '#50153f';
  const activeDaySoft = selectedDay === '1' ? 'rgba(45, 130, 198, 0.1)' : 'rgba(80, 21, 63, 0.1)';

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3.5,
          minHeight: { xs: 'auto', sm: 660, md: 700 },
          maxHeight: '94vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        },
      }}
    >
      {/* Header */}
      <DialogTitle
        sx={{
          py: 1.5,
          px: 3,
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ bgcolor: 'rgba(80, 21, 63, 0.08)', color: '#50153f', p: 0.9, borderRadius: 2 }}>
            <QrCodeScannerIcon fontSize="small" />
          </Box>
          <Box>
            <Typography variant="subtitle1" fontWeight="900" sx={{ color: '#0f172a', lineHeight: 1.2 }}>
              Fast-Track Check-in & Badge Desk
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Search attendee or scan Summit ID to accredit immediately
            </Typography>
          </Box>
        </Box>

        <IconButton size="small" onClick={onClose} sx={{ color: '#94a3b8' }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: { xs: 2, sm: 2.5 }, flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        {/* Top Controls: Station Day Selector */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5, gap: 1 }}>
          <Typography
            variant="caption"
            fontWeight="800"
            color="text.secondary"
            sx={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}
          >
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
            sx={{
              bgcolor: '#f1f5f9',
              p: 0.4,
              borderRadius: 2,
              '& .MuiToggleButton-root': {
                border: 'none',
                borderRadius: 1.5,
                fontWeight: 800,
                fontSize: '0.78rem',
                py: 0.5,
                px: 1.8,
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
            <ToggleButton value="1">📅 Day 1 Station</ToggleButton>
            <ToggleButton value="2">📅 Day 2 Station</ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {/* Search Input Box */}
        <form onSubmit={handleFormSubmit}>
          <Box sx={{ position: 'relative', mb: 1.5 }}>
            <TextField
              inputRef={inputRef}
              fullWidth
              size="small"
              autoFocus
              placeholder="Type name, phone, email, or Summit ID..."
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              disabled={loading}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    {searching ? (
                      <CircularProgress size={18} sx={{ color: activeDayColor }} />
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
                    borderColor: activeDayColor,
                    borderWidth: 2,
                  },
                },
              }}
            />

            {/* Live Search Suggestions Dropdown */}
            {suggestions.length > 0 && !selectedParticipant && (
              <Paper
                elevation={6}
                sx={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  zIndex: 30,
                  mt: 0.5,
                  borderRadius: 2,
                  maxHeight: 280,
                  overflowY: 'auto',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 15px 30px -5px rgba(0,0,0,0.15)',
                }}
              >
                <Box sx={{ px: 2, py: 0.8, bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
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
                            py: 1,
                            px: 2,
                            '&:hover': {
                              bgcolor: 'rgba(80, 21, 63, 0.05)',
                            },
                          }}
                        >
                          <ListItemAvatar sx={{ minWidth: 42 }}>
                            <Avatar
                              sx={{
                                width: 32,
                                height: 32,
                                bgcolor: guestColor,
                                fontSize: '0.8rem',
                                fontWeight: 800,
                              }}
                            >
                              {(p.name || 'P')[0].toUpperCase()}
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, flexWrap: 'wrap' }}>
                                <Typography variant="body2" fontWeight="800" sx={{ color: '#0f172a' }}>
                                  {p.name}
                                </Typography>
                                <Chip
                                  label={p.summit_id}
                                  size="small"
                                  sx={{
                                    height: 18,
                                    fontSize: '0.68rem',
                                    fontWeight: 700,
                                    bgcolor: '#f1f5f9',
                                  }}
                                />
                                <Chip
                                  label={p.guest_type || 'General'}
                                  size="small"
                                  sx={{
                                    height: 18,
                                    fontSize: '0.65rem',
                                    fontWeight: 700,
                                    bgcolor: `${guestColor}15`,
                                    color: guestColor,
                                    border: `1px solid ${guestColor}30`,
                                  }}
                                />
                                {isCheckedIn ? (
                                  <Chip
                                    size="small"
                                    icon={<CheckCircleIcon sx={{ fontSize: '12px !important' }} />}
                                    label={`Day ${selectedDay} In${timeChecked ? ` (${timeChecked})` : ''}`}
                                    sx={{
                                      height: 18,
                                      fontSize: '0.65rem',
                                      fontWeight: 800,
                                      bgcolor: '#fef3c7',
                                      color: '#92400e',
                                      border: '1px solid #fde68a',
                                    }}
                                  />
                                ) : (
                                  <Chip
                                    size="small"
                                    label={`Day ${selectedDay} Not In`}
                                    sx={{
                                      height: 18,
                                      fontSize: '0.65rem',
                                      fontWeight: 700,
                                      bgcolor: '#f1f5f9',
                                      color: '#64748b',
                                    }}
                                  />
                                )}
                              </Box>
                            }
                            secondary={
                              <Box sx={{ mt: 0.2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 0.5 }}>
                                <Typography variant="caption" color="text.secondary">
                                  {p.mobile ? `📞 ${p.mobile}` : ''} {p.email ? `• ${p.email}` : ''}
                                </Typography>
                                <Typography variant="caption" fontWeight="700" sx={{ color: activeDayColor }}>
                                  {getRegisteredSessionLabels(p).join(' • ') || 'No sessions'}
                                </Typography>
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
          </Box>
        </form>

        {error && (
          <Alert severity="error" sx={{ mb: 1.5, borderRadius: 2 }}>
            {error}
          </Alert>
        )}

        {/* Selected Participant Card — Compact Single Column Fitting Entirely Without Scrolling */}
        <AnimatePresence mode="wait">
          {selectedParticipant ? (
            <motion.div
              key={selectedParticipant.id}
              initial={{ opacity: 0, y: 8, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.16 }}
            >
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  borderRadius: 2.5,
                  bgcolor: isSelectedAlreadyCheckedIn ? '#fffbeb' : '#f8fafc',
                  border: `2px solid ${isSelectedAlreadyCheckedIn ? '#f59e0b' : activeDayColor}`,
                }}
              >
                {/* Attendee Profile Row */}
                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                    <Avatar
                      sx={{
                        width: 40,
                        height: 40,
                        bgcolor: GUEST_TYPE_COLORS[selectedParticipant.guest_type] || activeDayColor,
                        fontSize: '1rem',
                        fontWeight: 800,
                      }}
                    >
                      {(selectedParticipant.name || 'P')[0].toUpperCase()}
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle1" fontWeight="900" sx={{ color: '#0f172a', lineHeight: 1.2 }}>
                        {selectedParticipant.name || selectedParticipant.full_name}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, mt: 0.3, flexWrap: 'wrap' }}>
                        <Chip
                          label={selectedParticipant.summit_id}
                          size="small"
                          sx={{ fontWeight: 800, bgcolor: '#ffffff', border: '1px solid #cbd5e1', height: 20, fontSize: '0.72rem' }}
                        />
                        <Chip
                          label={selectedParticipant.guest_type || 'General Participant'}
                          size="small"
                          sx={{
                            fontWeight: 800,
                            height: 20,
                            fontSize: '0.7rem',
                            bgcolor: `${GUEST_TYPE_COLORS[selectedParticipant.guest_type] || activeDayColor}20`,
                            color: GUEST_TYPE_COLORS[selectedParticipant.guest_type] || activeDayColor,
                          }}
                        />
                      </Box>
                    </Box>
                  </Box>

                  <Button
                    size="small"
                    variant="text"
                    onClick={handleClearSelection}
                    sx={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', minWidth: 'auto', px: 1 }}
                  >
                    Change
                  </Button>
                </Box>

                {/* Contact Row */}
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.2, fontSize: '0.8rem' }}>
                  {selectedParticipant.email} {selectedParticipant.mobile ? `• 📞 ${selectedParticipant.mobile}` : ''}
                </Typography>

                {/* Registered Sessions Badges */}
                <Box
                  sx={{
                    p: 1.2,
                    mb: 1.5,
                    borderRadius: 2,
                    bgcolor: '#ffffff',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <Typography
                    variant="caption"
                    fontWeight="800"
                    sx={{ color: activeDayColor, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', mb: 0.8, fontSize: '0.7rem' }}
                  >
                    Registered Summit Days & Sessions:
                  </Typography>

                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.6, alignItems: 'center' }}>
                    <Chip
                      icon={selectedParticipant.attends_day1 ? <CheckCircleIcon /> : <EventAvailableIcon />}
                      label="DAY 1"
                      size="small"
                      sx={{
                        height: 24,
                        fontWeight: 900,
                        fontSize: '0.72rem',
                        bgcolor: selectedParticipant.attends_day1 ? '#2d82c6' : 'transparent',
                        color: selectedParticipant.attends_day1 ? '#ffffff' : '#94a3b8',
                        border: `1.5px solid ${selectedParticipant.attends_day1 ? '#2d82c6' : '#cbd5e1'}`,
                        borderStyle: selectedParticipant.attends_day1 ? 'solid' : 'dashed',
                        '& .MuiChip-icon': {
                          color: selectedParticipant.attends_day1 ? '#ffffff' : '#94a3b8',
                          fontSize: 14,
                        },
                      }}
                    />

                    <Chip
                      icon={selectedParticipant.attends_day2 ? <CheckCircleIcon /> : <EventAvailableIcon />}
                      label="DAY 2"
                      size="small"
                      sx={{
                        height: 24,
                        fontWeight: 900,
                        fontSize: '0.72rem',
                        bgcolor: selectedParticipant.attends_day2 ? '#50153f' : 'transparent',
                        color: selectedParticipant.attends_day2 ? '#ffffff' : '#94a3b8',
                        border: `1.5px solid ${selectedParticipant.attends_day2 ? '#50153f' : '#cbd5e1'}`,
                        borderStyle: selectedParticipant.attends_day2 ? 'solid' : 'dashed',
                        '& .MuiChip-icon': {
                          color: selectedParticipant.attends_day2 ? '#ffffff' : '#94a3b8',
                          fontSize: 14,
                        },
                      }}
                    />

                    {selectedSessionLabels.map((session) => (
                      <Chip
                        key={session}
                        label={session}
                        size="small"
                        sx={{
                          height: 24,
                          fontWeight: 700,
                          fontSize: '0.7rem',
                          bgcolor: 'rgba(80, 21, 63, 0.06)',
                          color: '#50153f',
                          border: '1px solid rgba(80, 21, 63, 0.2)',
                        }}
                      />
                    ))}
                  </Box>
                </Box>

                {/* Check-in Status Alert */}
                {isSelectedAlreadyCheckedIn ? (
                  <Alert
                    severity="warning"
                    icon={<WarningAmberIcon fontSize="small" />}
                    sx={{
                      py: 0.5,
                      px: 1.5,
                      mb: 1.5,
                      borderRadius: 2,
                      bgcolor: '#fef3c7',
                      color: '#92400e',
                      border: '1px solid #fde68a',
                      '& .MuiAlert-icon': { color: '#d97706' },
                    }}
                  >
                    <Typography variant="body2" fontWeight="800">
                      Already Checked In for Day {selectedDay}
                    </Typography>
                    <Typography variant="caption" display="block">
                      Accredited{selectedTimestamp ? ` at ${selectedTimestamp}` : ''}. You may re-confirm or re-print badge below.
                    </Typography>
                  </Alert>
                ) : (
                  <Alert
                    severity="info"
                    icon={<HowToRegIcon fontSize="small" />}
                    sx={{
                      py: 0.5,
                      px: 1.5,
                      mb: 1.5,
                      borderRadius: 2,
                      bgcolor: activeDaySoft,
                      color: selectedDay === '1' ? '#1e5d8f' : '#50153f',
                      border: `1px solid ${selectedDay === '1' ? 'rgba(45, 130, 198, 0.3)' : 'rgba(80, 21, 63, 0.3)'}`,
                    }}
                  >
                    <Typography variant="body2" fontWeight="800">
                      Ready for Day {selectedDay} Check-In
                    </Typography>
                    <Typography variant="caption" display="block">
                      {isRegisteredForSelectedDay
                        ? `Attendee is registered for Day ${selectedDay}.`
                        : `⚠️ Notice: Attendee did not register for Day ${selectedDay}.`}
                    </Typography>
                  </Alert>
                )}

                {/* Success Alert Banner After Check-In */}
                {checkinSuccess && (
                  <Alert
                    severity="success"
                    icon={<CheckCircleIcon fontSize="small" />}
                    sx={{ py: 0.5, px: 1.5, mb: 1.5, borderRadius: 2 }}
                  >
                    <Typography variant="body2" fontWeight="800">
                      {checkinSuccess.message}
                    </Typography>
                  </Alert>
                )}

                {/* Primary Action Button: Large Confirm Check-In */}
                <Button
                  fullWidth
                  variant="contained"
                  size="large"
                  startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <HowToRegIcon />}
                  onClick={handleCheckin}
                  disabled={loading}
                  sx={{
                    py: 1.4,
                    fontWeight: 900,
                    fontSize: '0.98rem',
                    borderRadius: 2.5,
                    boxShadow: '0 4px 14px 0 rgba(0,0,0,0.15)',
                    bgcolor: isSelectedAlreadyCheckedIn ? '#d97706' : activeDayColor,
                    '&:hover': {
                      bgcolor: isSelectedAlreadyCheckedIn ? '#b45309' : (selectedDay === '1' ? '#1e68a3' : '#3b0d2d'),
                    },
                  }}
                >
                  {isSelectedAlreadyCheckedIn
                    ? `Re-confirm Day ${selectedDay} Check-In`
                    : `Confirm Day ${selectedDay} Check-In`}
                </Button>

                {/* Secondary Action Row: Print Badge + Next Attendee */}
                <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                  {onPrintBadge && (
                    <Button
                      fullWidth
                      variant="outlined"
                      size="small"
                      startIcon={<PrintIcon fontSize="small" />}
                      onClick={() => onPrintBadge(selectedParticipant)}
                      sx={{
                        py: 0.8,
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        borderColor: '#cbd5e1',
                        color: '#334155',
                        '&:hover': { borderColor: '#50153f', color: '#50153f' },
                      }}
                    >
                      Print Badge
                    </Button>
                  )}

                  <Button
                    fullWidth
                    variant="outlined"
                    size="small"
                    startIcon={<RestartAltIcon fontSize="small" />}
                    onClick={handleClearSelection}
                    sx={{
                      py: 0.8,
                      fontWeight: 700,
                      fontSize: '0.8rem',
                      borderColor: '#cbd5e1',
                      color: '#64748b',
                      '&:hover': { borderColor: '#94a3b8', color: '#334155' },
                    }}
                  >
                    Next Attendee
                  </Button>
                </Box>
              </Paper>
            </motion.div>
          ) : (
            /* Idle Placeholder when no participant is selected */
            <Box
              sx={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                p: 3,
                textAlign: 'center',
                borderRadius: 2.5,
                bgcolor: '#f8fafc',
                border: '1.5px dashed #e2e8f0',
              }}
            >
              <Box
                sx={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  bgcolor: activeDaySoft,
                  color: activeDayColor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mb: 1.5,
                }}
              >
                <QrCodeScannerIcon sx={{ fontSize: 28 }} />
              </Box>
              <Typography variant="subtitle1" fontWeight="800" sx={{ color: '#1e293b', mb: 0.5 }}>
                Ready to Check In
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 360, fontSize: '0.82rem' }}>
                Type an attendee name, phone number, email, or Summit ID above, or scan a badge barcode to look up immediately.
              </Typography>
              <Chip
                label={`Desk Active: Day ${selectedDay}`}
                size="small"
                sx={{
                  mt: 2,
                  fontWeight: 800,
                  fontSize: '0.72rem',
                  bgcolor: activeDaySoft,
                  color: activeDayColor,
                }}
              />
            </Box>
          )}
        </AnimatePresence>
      </DialogContent>

      {/* Footer */}
      <DialogActions sx={{ px: 3, py: 1.5, borderTop: '1px solid #e2e8f0', justifyContent: 'space-between' }}>
        <Typography variant="caption" color="text.secondary">
          Station shortcut: Press <strong>Enter</strong> to check in top match
        </Typography>
        <Button onClick={onClose} color="inherit" sx={{ fontWeight: 700, fontSize: '0.82rem' }}>
          Close Desk
        </Button>
      </DialogActions>
    </Dialog>
  );
};
