import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Divider,
} from '@mui/material';
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu';
import CheckroomIcon from '@mui/icons-material/Checkroom';
import AccessibleIcon from '@mui/icons-material/Accessible';
import PrintIcon from '@mui/icons-material/Print';

export const CateringLogisticsModal = ({ open, onClose, stats }) => {
  if (!stats) return null;

  const handlePrint = () => {
    window.print();
  };

  const dietaryItems = stats.dietary || [];
  const tshirtItems = stats.tshirts || [];
  const accommodations = stats.accommodations || [];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ pb: 1, borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ bgcolor: 'warning.light', color: 'warning.dark', p: 1, borderRadius: 2 }}>
            <RestaurantMenuIcon />
          </Box>
          <Box>
            <Typography variant="h6" fontWeight="700">
              Catering, Swag & Accessibility Logistics
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Summary report for summit meal planning, venue staff, and welcome kits
            </Typography>
          </Box>
        </Box>
        <Button variant="outlined" size="small" startIcon={<PrintIcon />} onClick={handlePrint}>
          Print Report
        </Button>
      </DialogTitle>

      <DialogContent sx={{ pt: 3 }}>
        <Grid container spacing={3}>
          {/* Dietary Breakdown */}
          <Grid item xs={12} md={6}>
            <Paper elevation={0} sx={{ p: 2.5, borderRadius: 2.5, border: '1px solid #e2e8f0', height: '100%' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <RestaurantMenuIcon color="warning" fontSize="small" />
                <Typography variant="subtitle1" fontWeight="700">
                  Meal & Dietary Restrictions
                </Typography>
              </Box>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Dietary Type</TableCell>
                      <TableCell sx={{ fontWeight: 700, textAlign: 'right' }}>Count</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {dietaryItems.length > 0 ? (
                      dietaryItems.map((item) => (
                        <TableRow key={item.dietary_requirements} hover>
                          <TableCell>
                            <Typography variant="body2" fontWeight="600">
                              {item.dietary_requirements}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Chip
                              label={item.count}
                              size="small"
                              color={item.dietary_requirements.toLowerCase() === 'none' ? 'default' : 'warning'}
                              sx={{ fontWeight: 700 }}
                            />
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={2} align="center">
                          No dietary data recorded.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>

          {/* T-Shirt / Kit Sizing */}
          <Grid item xs={12} md={6}>
            <Paper elevation={0} sx={{ p: 2.5, borderRadius: 2.5, border: '1px solid #e2e8f0', height: '100%' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <CheckroomIcon color="primary" fontSize="small" />
                <Typography variant="subtitle1" fontWeight="700">
                  Summit Welcome Kit / T-Shirt Sizes
                </Typography>
              </Box>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Size</TableCell>
                      <TableCell sx={{ fontWeight: 700, textAlign: 'right' }}>Quantity</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {tshirtItems.length > 0 ? (
                      tshirtItems.map((item) => (
                        <TableRow key={item.tshirt_size} hover>
                          <TableCell>
                            <Typography variant="body2" fontWeight="600">
                              Size {item.tshirt_size}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Chip
                              label={item.count}
                              size="small"
                              color="primary"
                              sx={{ fontWeight: 700 }}
                            />
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={2} align="center">
                          No size preferences submitted.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>

          {/* Accessibility & Special Accommodations List */}
          <Grid item xs={12}>
            <Paper elevation={0} sx={{ p: 2.5, borderRadius: 2.5, border: '1px solid #e2e8f0' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <AccessibleIcon color="info" fontSize="small" />
                <Typography variant="subtitle1" fontWeight="700">
                  Special Accommodations & Accessibility Requests ({accommodations.length})
                </Typography>
              </Box>

              {accommodations.length > 0 ? (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700 }}>Participant</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Organization</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Requested Accommodation</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {accommodations.map((acc) => (
                        <TableRow key={acc.id} hover>
                          <TableCell>
                            <Typography variant="body2" fontWeight="700">
                              {acc.full_name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {acc.summit_id}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption" color="text.secondary">
                              {acc.organization || 'Independent'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Paper
                              elevation={0}
                              sx={{
                                p: 1,
                                bgcolor: '#eff6ff',
                                borderRadius: 1.5,
                                border: '1px solid #bfdbfe',
                              }}
                            >
                              <Typography variant="body2" color="#1e40af">
                                {acc.special_accommodations}
                              </Typography>
                            </Paper>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                  No special accessibility accommodations have been requested by participants.
                </Typography>
              )}
            </Paper>
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} color="inherit">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

