import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Grid,
  Paper,
  LinearProgress,
  Chip,
} from '@mui/material';
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

export const HallCapacityBoard = ({ hallCapacities }) => {
  if (!hallCapacities || hallCapacities.length === 0) {
    return null;
  }

  return (
    <Card sx={{ mb: 4, border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5, flexWrap: 'wrap', gap: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ p: 1.2, borderRadius: 2.5, bgcolor: 'rgba(2, 132, 199, 0.1)', color: '#0284c7' }}>
              <MeetingRoomIcon sx={{ fontSize: 28 }} />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight="800" sx={{ color: '#0f172a' }}>
                Hall Capacity & Seat Utilization Monitor
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Real-time headcount vs. physical auditorium seating to prevent overflow and manage crowd flow
              </Typography>
            </Box>
          </Box>
        </Box>

        <Grid container spacing={2.5}>
          {hallCapacities.map((item) => {
            const isNearCapacity = item.utilization >= 90;
            const isModerate = item.utilization >= 75 && item.utilization < 90;

            const statusColor = isNearCapacity
              ? '#dc2626'
              : isModerate
              ? '#d97706'
              : '#0284c7';

            return (
              <Grid item xs={12} sm={6} md={3} key={item.code}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 2.2,
                    borderRadius: 2.5,
                    border: `1.5px solid ${isNearCapacity ? '#fca5a5' : '#e2e8f0'}`,
                    bgcolor: isNearCapacity ? '#fff1f2' : '#f8fafc',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    height: '100%',
                  }}
                >
                  <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                      <Chip
                        label={item.code}
                        size="small"
                        sx={{
                          fontWeight: 800,
                          bgcolor: item.code.startsWith('D1') ? '#0284c7' : '#8b5cf6',
                          color: 'white',
                          fontSize: '0.7rem',
                        }}
                      />
                      {isNearCapacity ? (
                        <Chip
                          icon={<WarningAmberIcon sx={{ fontSize: '14px !important' }} />}
                          label="High Fill"
                          size="small"
                          color="error"
                          sx={{ fontWeight: 800, fontSize: '0.68rem', height: 22 }}
                        />
                      ) : (
                        <Chip
                          icon={<CheckCircleIcon sx={{ fontSize: '14px !important' }} />}
                          label="Optimal"
                          size="small"
                          color="success"
                          variant="outlined"
                          sx={{ fontWeight: 700, fontSize: '0.68rem', height: 22 }}
                        />
                      )}
                    </Box>

                    <Typography variant="subtitle2" fontWeight="800" sx={{ color: '#0f172a', mb: 0.5 }}>
                      {item.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1.5 }}>
                      📍 {item.hall} ({item.capacity} seats)
                    </Typography>
                  </Box>

                  <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 0.5 }}>
                      <Typography variant="caption" color="text.secondary">
                        {item.checked_in} checked-in / {item.capacity} seats
                      </Typography>
                      <Typography variant="caption" fontWeight="800" sx={{ color: statusColor }}>
                        {item.utilization}% fill
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={Math.min(item.utilization, 100)}
                      sx={{
                        height: 7,
                        borderRadius: 3,
                        bgcolor: '#e2e8f0',
                        '& .MuiLinearProgress-bar': { bgcolor: statusColor },
                      }}
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.8, fontSize: '0.68rem' }}>
                      {item.registered} registered RSVP
                    </Typography>
                  </Box>
                </Paper>
              </Grid>
            );
          })}
        </Grid>
      </CardContent>
    </Card>
  );
};

