import React, { useState, useEffect } from 'react';
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
} from '@mui/material';

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

export const ParticipantDialog = ({ open, onClose, onSave, participant }) => {
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
  }, [participant, open]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
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
      await onSave(formData);
      onClose();
    } catch (err) {
      const errorMsg =
        err.response?.data?.email?.[0] ||
        err.response?.data?.detail ||
        err.message ||
        'Failed to save participant.';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const isEditing = Boolean(participant?.id);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ pb: 1, borderBottom: '1px solid #e2e8f0' }}>
        <Typography variant="h6" fontWeight="700">
          {isEditing ? `Edit Participant: ${participant.summit_id}` : 'Register New Summit Participant'}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          National Child Care Summit • Participant Management
        </Typography>
      </DialogTitle>

      <form onSubmit={handleSubmit}>
        <DialogContent sx={{ pt: 3 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2 }}>
              {error}
            </Alert>
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
                onChange={handleChange}
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
                onChange={handleChange}
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
                onChange={handleChange}
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
                onChange={handleChange}
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
                onChange={handleChange}
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
                onChange={handleChange}
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
                label="Internal Admin Notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder="Special notes, badge re-issuance, or remarks..."
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
            sx={{ minWidth: 120, fontWeight: 700 }}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : isEditing ? 'Save Changes' : 'Register'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};
