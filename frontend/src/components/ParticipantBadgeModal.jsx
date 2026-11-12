import React, { useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Chip,
  Divider,
} from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import ChildCareIcon from '@mui/icons-material/ChildCare';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import QrCode2Icon from '@mui/icons-material/QrCode2';

const GUEST_TYPE_COLORS = {
  'General Participant': { bg: '#2d82c6', text: '#ffffff', label: 'GENERAL PARTICIPANT' },
  'Guest': { bg: '#fab319', text: '#401032', label: 'HONORED GUEST' },
  'Speaker': { bg: '#e85d26', text: '#ffffff', label: 'SPEAKER' },
  'VIP': { bg: '#50153f', text: '#ffffff', label: 'VIP DELEGATE' },
  'Organizer / Crew': { bg: '#1e824c', text: '#ffffff', label: 'SUMMIT CREW' },
};

export const ParticipantBadgeModal = ({ open, onClose, participant }) => {
  const badgeRef = useRef(null);

  if (!participant) return null;

  const guestTypeMeta = GUEST_TYPE_COLORS[participant.guest_type] || {
    bg: '#0f2942',
    text: '#ffffff',
    label: (participant.guest_type || 'PARTICIPANT').toUpperCase(),
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ pb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" fontWeight="700">
          Official Summit Accreditation Badge
        </Typography>
        <Chip
          label={participant.summit_id}
          size="small"
          color="primary"
          variant="outlined"
          sx={{ fontWeight: 700 }}
        />
      </DialogTitle>

      <DialogContent sx={{ display: 'flex', justifyContent: 'center', py: 3, bgcolor: '#f1f5f9' }}>
        {/* Printable Badge Container */}
        <Box
          ref={badgeRef}
          id="printable-summit-badge"
          sx={{
            width: 320,
            minHeight: 460,
            bgcolor: '#ffffff',
            borderRadius: 4,
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
            overflow: 'hidden',
            border: '2px solid #cbd5e1',
            display: 'flex',
            flexDirection: 'column',
            textAlign: 'center',
            position: 'relative',
          }}
        >
          {/* Lanyard Hole Cutout simulation */}
          <Box
            sx={{
              width: 48,
              height: 10,
              bgcolor: '#e2e8f0',
              borderRadius: 5,
              mx: 'auto',
              mt: 1.5,
              mb: 1,
            }}
          />

          {/* Header */}
          <Box sx={{ bgcolor: '#50153f', backgroundImage: 'linear-gradient(135deg, #50153f 0%, #6f1c57 100%)', color: 'white', py: 2, px: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 0.5 }}>
              <ChildCareIcon sx={{ fontSize: 24, color: '#e85d26' }} />
              <Typography variant="subtitle2" fontWeight="800" sx={{ letterSpacing: '0.05em' }}>
                NATIONAL CHILD CARE SUMMIT
              </Typography>
            </Box>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.68rem', letterSpacing: '0.08em' }}>
              OFFICIAL PARTICIPANT PASS • DHAKA
            </Typography>
          </Box>

          {/* Body */}
          <Box sx={{ p: 2.5, flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 1 }}>
            <Typography variant="h5" fontWeight="800" sx={{ color: '#0f172a', lineHeight: 1.2 }}>
              {participant.name || participant.full_name}
            </Typography>

            <Typography variant="body2" fontWeight="600" color="primary.main">
              {participant.guest_type || 'General Participant'}
            </Typography>

            {participant.attends_both_days ? (
              <Chip
                label="📅 Full Summit Pass (Day 1 & Day 2)"
                size="small"
                color="primary"
                variant="outlined"
                sx={{ mx: 'auto', mt: 0.5, fontWeight: 700, fontSize: '0.72rem' }}
              />
            ) : participant.session_badges && participant.session_badges.length > 0 ? (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 0.5, mt: 0.5 }}>
                {participant.session_badges.map((b) => (
                  <Chip
                    key={b}
                    label={b}
                    size="small"
                    sx={{
                      height: 20,
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      bgcolor: b.startsWith('Day 1') ? 'rgba(2, 132, 199, 0.1)' : 'rgba(139, 92, 246, 0.1)',
                      color: b.startsWith('Day 1') ? '#0284c7' : '#8b5cf6',
                    }}
                  />
                ))}
              </Box>
            ) : participant.session ? (
              <Chip
                label={`📅 ${participant.session}`}
                size="small"
                variant="outlined"
                sx={{ mx: 'auto', mt: 0.5, fontWeight: 600, fontSize: '0.72rem' }}
              />
            ) : null}

            <Divider sx={{ my: 1.5 }} />

            {/* QR Code and ID */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
              <Box
                sx={{
                  p: 1,
                  bgcolor: '#f8fafc',
                  border: '1px dashed #cbd5e1',
                  borderRadius: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <QrCode2Icon sx={{ fontSize: 72, color: '#0f2942' }} />
              </Box>

              <Box sx={{ textAlign: 'left' }}>
                <Typography variant="caption" color="text.secondary" display="block">
                  Summit ID:
                </Typography>
                <Typography variant="body2" fontWeight="800" color="#0f2942">
                  {participant.summit_id}
                </Typography>

                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                  Status:
                </Typography>
                <Typography variant="caption" fontWeight="700" color="text.primary">
                  {participant.status_display || participant.status}
                </Typography>

                {participant.status === 'CHECKED_IN' && (
                  <Chip
                    icon={<CheckCircleIcon sx={{ fontSize: '14px !important' }} />}
                    label="Checked In"
                    size="small"
                    color="success"
                    sx={{ mt: 0.8, height: 22, fontSize: '0.68rem', fontWeight: 700 }}
                  />
                )}
              </Box>
            </Box>
          </Box>

          {/* Guest Type Banner Footer */}
          <Box
            sx={{
              bgcolor: guestTypeMeta.bg,
              color: guestTypeMeta.text,
              py: 1.2,
              fontWeight: 800,
              fontSize: '0.85rem',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
            }}
          >
            {guestTypeMeta.label}
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} color="inherit">
          Close
        </Button>
        <Button variant="contained" startIcon={<PrintIcon />} onClick={handlePrint}>
          Print Badge
        </Button>
      </DialogActions>
    </Dialog>
  );
};
