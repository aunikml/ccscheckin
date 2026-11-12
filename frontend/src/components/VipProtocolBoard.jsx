import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  IconButton,
  Tooltip,
  TextField,
  InputAdornment,
} from '@mui/material';
import StarIcon from '@mui/icons-material/Star';
import PhoneIcon from '@mui/icons-material/Phone';
import EmailIcon from '@mui/icons-material/Email';
import BadgeIcon from '@mui/icons-material/Badge';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import SearchIcon from '@mui/icons-material/Search';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';

const ROLE_COLORS = {
  'VIP': { bg: '#fee2e2', text: '#dc2626', border: '#fca5a5' },
  'Speaker': { bg: '#f3e8ff', text: '#8b5cf6', border: '#d8b4fe' },
  'Guest': { bg: '#fef3c7', text: '#d97706', border: '#fcd34d' },
  'Organizer / Crew': { bg: '#d1fae5', text: '#059669', border: '#6ee7b7' },
};

export const VipProtocolBoard = ({ vipData, onToggleCheckin, onPrintBadge }) => {
  const [filter, setFilter] = useState('ALL'); // 'ALL', 'D1_IN', 'D2_IN', 'PENDING'
  const [search, setSearch] = useState('');

  if (!vipData || !vipData.list || vipData.list.length === 0) {
    return null;
  }

  const { list, total, day1_arrived, day2_arrived } = vipData;

  const filteredList = list.filter((p) => {
    const matchesSearch =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.email && p.email.toLowerCase().includes(search.toLowerCase())) ||
      (p.mobile && p.mobile.includes(search)) ||
      (p.summit_id && p.summit_id.toLowerCase().includes(search.toLowerCase()));

    if (!matchesSearch) return false;

    if (filter === 'D1_IN') return p.day1_checked_in;
    if (filter === 'D2_IN') return p.day2_checked_in;
    if (filter === 'PENDING') return !p.day1_checked_in && !p.day2_checked_in;
    return true;
  });

  return (
    <Card sx={{ mb: 4, border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
      <CardContent sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, gap: 2, mb: 2.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ p: 1.2, borderRadius: 2.5, bgcolor: 'rgba(220, 38, 38, 0.1)', color: '#dc2626' }}>
              <StarIcon sx={{ fontSize: 28 }} />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight="800" sx={{ color: '#0f172a' }}>
                VIP & Speaker Protocol Readiness Board
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Live on-site arrival tracking & direct contact directory for Stage and Protocol Leads
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Chip
              label={`${day1_arrived} / ${total} Day 1 On-Site`}
              size="small"
              sx={{ bgcolor: '#0284c7', color: 'white', fontWeight: 800 }}
            />
            <Chip
              label={`${day2_arrived} / ${total} Day 2 On-Site`}
              size="small"
              sx={{ bgcolor: '#8b5cf6', color: 'white', fontWeight: 800 }}
            />
          </Box>
        </Box>

        {/* Filters and Search Bar */}
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'stretch', md: 'center' }, gap: 1.5, mb: 2 }}>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Chip
              label={`All Dignitaries (${total})`}
              clickable
              color={filter === 'ALL' ? 'primary' : 'default'}
              variant={filter === 'ALL' ? 'filled' : 'outlined'}
              onClick={() => setFilter('ALL')}
              sx={{ fontWeight: 700 }}
            />
            <Chip
              label={`Day 1 Arrived (${day1_arrived})`}
              clickable
              color={filter === 'D1_IN' ? 'primary' : 'default'}
              variant={filter === 'D1_IN' ? 'filled' : 'outlined'}
              onClick={() => setFilter('D1_IN')}
              sx={{ fontWeight: 700 }}
            />
            <Chip
              label={`Day 2 Arrived (${day2_arrived})`}
              clickable
              sx={{
                fontWeight: 700,
                bgcolor: filter === 'D2_IN' ? '#8b5cf6' : 'transparent',
                color: filter === 'D2_IN' ? 'white' : 'inherit',
                borderColor: '#8b5cf6',
              }}
              variant={filter === 'D2_IN' ? 'filled' : 'outlined'}
              onClick={() => setFilter('D2_IN')}
            />
            <Chip
              label={`Pending Arrival (${total - Math.max(day1_arrived, day2_arrived)})`}
              clickable
              color={filter === 'PENDING' ? 'warning' : 'default'}
              variant={filter === 'PENDING' ? 'filled' : 'outlined'}
              onClick={() => setFilter('PENDING')}
              sx={{ fontWeight: 700 }}
            />
          </Box>

          <TextField
            size="small"
            placeholder="Search VIP or speaker..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" color="action" />
                </InputAdornment>
              ),
            }}
            sx={{ minWidth: { xs: '100%', md: 240 } }}
          />
        </Box>

        {/* Dignitaries Table */}
        <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 2 }}>
          <Table size="small">
            <TableHead sx={{ bgcolor: '#f8fafc' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 800, color: 'text.secondary' }}>Dignitary / Guest</TableCell>
                <TableCell sx={{ fontWeight: 800, color: 'text.secondary' }}>Role</TableCell>
                <TableCell sx={{ fontWeight: 800, color: 'text.secondary' }}>Day 1 Status</TableCell>
                <TableCell sx={{ fontWeight: 800, color: 'text.secondary' }}>Day 2 Status</TableCell>
                <TableCell sx={{ fontWeight: 800, color: 'text.secondary' }}>Direct Protocol Contact</TableCell>
                <TableCell align="right" sx={{ fontWeight: 800, color: 'text.secondary' }}>Quick Desk Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredList.map((p) => {
                const roleStyle = ROLE_COLORS[p.guest_type] || { bg: '#e0f2fe', text: '#0284c7', border: '#bae6fd' };
                return (
                  <TableRow key={p.id} hover sx={{ '&:hover': { bgcolor: '#f8fafc' } }}>
                    {/* Name & ID */}
                    <TableCell>
                      <Typography variant="body2" fontWeight="700" color="#0f172a">
                        {p.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                        {p.summit_id}
                      </Typography>
                    </TableCell>

                    {/* Role Chip */}
                    <TableCell>
                      <Chip
                        label={p.guest_type}
                        size="small"
                        sx={{
                          bgcolor: roleStyle.bg,
                          color: roleStyle.text,
                          border: `1px solid ${roleStyle.border}`,
                          fontWeight: 800,
                          fontSize: '0.7rem',
                        }}
                      />
                    </TableCell>

                    {/* Day 1 Status */}
                    <TableCell>
                      {p.day1_checked_in ? (
                        <Chip
                          icon={<CheckCircleIcon sx={{ fontSize: '14px !important' }} />}
                          label={
                            p.day1_checked_in_at
                              ? `In (${new Date(p.day1_checked_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`
                              : 'Checked In'
                          }
                          size="small"
                          color="success"
                          sx={{ fontWeight: 700, fontSize: '0.68rem', height: 22 }}
                        />
                      ) : (
                        <Chip
                          icon={<RadioButtonUncheckedIcon sx={{ fontSize: '14px !important' }} />}
                          label="Pending"
                          size="small"
                          variant="outlined"
                          sx={{ fontWeight: 600, fontSize: '0.68rem', height: 22, color: 'text.secondary' }}
                        />
                      )}
                    </TableCell>

                    {/* Day 2 Status */}
                    <TableCell>
                      {p.day2_checked_in ? (
                        <Chip
                          icon={<CheckCircleIcon sx={{ fontSize: '14px !important' }} />}
                          label={
                            p.day2_checked_in_at
                              ? `In (${new Date(p.day2_checked_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`
                              : 'Checked In'
                          }
                          size="small"
                          sx={{ fontWeight: 700, fontSize: '0.68rem', height: 22, bgcolor: '#8b5cf6', color: 'white' }}
                        />
                      ) : (
                        <Chip
                          icon={<RadioButtonUncheckedIcon sx={{ fontSize: '14px !important' }} />}
                          label="Pending"
                          size="small"
                          variant="outlined"
                          sx={{ fontWeight: 600, fontSize: '0.68rem', height: 22, color: 'text.secondary' }}
                        />
                      )}
                    </TableCell>

                    {/* Direct Contact */}
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {p.mobile ? (
                          <Tooltip title={`Call ${p.mobile}`}>
                            <IconButton
                              size="small"
                              component="a"
                              href={`tel:${p.mobile}`}
                              sx={{ color: '#059669', bgcolor: '#d1fae5', '&:hover': { bgcolor: '#a7f3d0' } }}
                            >
                              <PhoneIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        ) : null}
                        {p.email ? (
                          <Tooltip title={`Email ${p.email}`}>
                            <IconButton
                              size="small"
                              component="a"
                              href={`mailto:${p.email}`}
                              sx={{ color: '#0284c7', bgcolor: '#e0f2fe', '&:hover': { bgcolor: '#bae6fd' } }}
                            >
                              <EmailIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        ) : null}
                        <Typography variant="caption" color="text.secondary">
                          {p.mobile || p.email || 'No direct phone'}
                        </Typography>
                      </Box>
                    </TableCell>

                    {/* Quick Desk Action */}
                    <TableCell align="right">
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<BadgeIcon fontSize="small" />}
                          onClick={() => onPrintBadge && onPrintBadge(p)}
                          sx={{ fontSize: '0.72rem', py: 0.3 }}
                        >
                          Badge
                        </Button>
                        <Button
                          size="small"
                          variant="contained"
                          color={p.day1_checked_in ? 'secondary' : 'primary'}
                          onClick={() => onToggleCheckin && onToggleCheckin(p, '1')}
                          sx={{ fontSize: '0.72rem', py: 0.3 }}
                        >
                          {p.day1_checked_in ? 'D1 In' : 'Check D1'}
                        </Button>
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
};

