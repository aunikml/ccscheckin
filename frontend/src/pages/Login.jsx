import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Chip,
} from '@mui/material';
import SecurityIcon from '@mui/icons-material/Security';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { ThreeBackground } from '../components/ThreeBackground';
import summitSquare from '../assets/summit-square.jpg';

export const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Please provide both username and password.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await login(username, password);
      navigate('/dashboard');
    } catch (err) {
      const msg =
        err.response?.data?.detail ||
        err.response?.data?.non_field_errors?.[0] ||
        'Authentication failed. Please verify your credentials.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        height: '100vh',
        maxHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #200719 0%, #350c29 40%, #461237 80%, #581646 100%)',
        position: 'relative',
        overflow: 'hidden',
        p: { xs: 2, md: 3 },
      }}
    >
      {/* Three.js Interactive Ambient WebGL Canvas */}
      <ThreeBackground />

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        style={{ width: '100%', maxWidth: '900px', position: 'relative', zIndex: 1 }}
      >
        <Card
          sx={{
            borderRadius: 4,
            boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(255, 255, 255, 0.15)',
            overflow: 'hidden',
            bgcolor: '#ffffff',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'stretch',
              width: '100%',
              minHeight: 460,
            }}
          >
            {/* Column 1: Attached Summit Graphic Illustration (Left Side) */}
            <Box
              sx={{
                flex: '0 0 50%',
                width: '50%',
                bgcolor: '#faf6ee',
                p: { xs: 2, sm: 3, md: 3.5 },
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                borderRight: '1.5px solid #ebd9c8',
              }}
            >
              <Box
                component="img"
                src={summitSquare}
                alt="National Child Care Summit 2026 - United for Quality Care"
                sx={{
                  width: '100%',
                  maxWidth: { xs: 260, sm: 320, md: 380 },
                  height: 'auto',
                  aspectRatio: '1 / 1',
                  objectFit: 'contain',
                  borderRadius: 3,
                  boxShadow: '0 8px 24px rgba(80, 21, 63, 0.08)',
                  bgcolor: '#faf6ee',
                  transition: 'transform 0.3s ease',
                  '&:hover': {
                    transform: 'scale(1.02)',
                  },
                }}
              />
              <Box sx={{ mt: 1.5, display: 'flex', alignItems: 'center', gap: 0.8 }}>
                <Box sx={{ p: 0.4, borderRadius: 1, bgcolor: '#50153f', color: '#fff', display: 'flex' }}>
                  <LocationOnIcon sx={{ fontSize: 13 }} />
                </Box>
                <Typography variant="caption" fontWeight="800" sx={{ color: '#50153f', letterSpacing: '0.02em', fontSize: '0.75rem' }}>
                  Bangla Academy, Dhaka
                </Typography>
              </Box>
            </Box>

            {/* Column 2: Authentication Form (Right Side) */}
            <Box
              sx={{
                flex: '0 0 50%',
                width: '50%',
                p: { xs: 2.5, sm: 3.5, md: 4 },
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                bgcolor: '#ffffff',
              }}
            >
              {/* Partner Chips Header */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                  <Chip
                    label="SYNERGOS"
                    size="small"
                    sx={{
                      bgcolor: 'rgba(30, 130, 76, 0.08)',
                      color: '#1e824c',
                      fontWeight: 800,
                      fontSize: '0.65rem',
                      height: 20,
                      border: '1px solid rgba(30, 130, 76, 0.25)',
                    }}
                  />
                  <Chip
                    label="BRAC IED"
                    size="small"
                    sx={{
                      bgcolor: 'rgba(217, 119, 6, 0.08)',
                      color: '#d97706',
                      fontWeight: 800,
                      fontSize: '0.65rem',
                      height: 20,
                      border: '1px solid rgba(217, 119, 6, 0.25)',
                    }}
                  />
                  <Chip
                    label="BRAC"
                    size="small"
                    sx={{
                      bgcolor: 'rgba(209, 27, 109, 0.08)',
                      color: '#d11b6d',
                      fontWeight: 800,
                      fontSize: '0.65rem',
                      height: 20,
                      border: '1px solid rgba(209, 27, 109, 0.25)',
                    }}
                  />
                </Box>

              {/* Form Title & Description */}
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mb: 0.5 }}>
                  <SecurityIcon sx={{ fontSize: 18, color: '#50153f' }} />
                  <Typography variant="h5" fontWeight="900" sx={{ color: '#0f172a', letterSpacing: '-0.02em' }}>
                    Summit Sign In
                  </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary">
                  Participant Management & On-Site Accreditation Desk
                </Typography>
              </Box>

              {error && (
                <Alert severity="error" sx={{ mb: 2, py: 0.5, fontSize: '0.8rem', borderRadius: 2 }}>
                  {error}
                </Alert>
              )}

              {/* Login Form */}
              <form onSubmit={handleSubmit}>
                <TextField
                  fullWidth
                  size="small"
                  margin="dense"
                  label="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoFocus
                  placeholder="admin"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      '&.Mui-focused fieldset': { borderColor: '#50153f', borderWidth: 2 },
                    },
                    '& .MuiInputLabel-root.Mui-focused': { color: '#50153f', fontWeight: 700 },
                  }}
                />

                <TextField
                  fullWidth
                  size="small"
                  margin="dense"
                  label="Password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  sx={{
                    mt: 1.2,
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      '&.Mui-focused fieldset': { borderColor: '#50153f', borderWidth: 2 },
                    },
                    '& .MuiInputLabel-root.Mui-focused': { color: '#50153f', fontWeight: 700 },
                  }}
                />

                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  disabled={loading}
                  endIcon={!loading && <ArrowForwardIcon fontSize="small" />}
                  sx={{
                    mt: 2,
                    mb: 1.8,
                    py: 1,
                    fontSize: '0.9rem',
                    fontWeight: 800,
                    borderRadius: 2,
                    bgcolor: '#50153f',
                    backgroundImage: 'linear-gradient(135deg, #50153f 0%, #6f1c57 100%)',
                    boxShadow: '0 6px 16px rgba(80, 21, 63, 0.3)',
                    '&:hover': {
                      bgcolor: '#3b0d2d',
                      backgroundImage: 'linear-gradient(135deg, #3b0d2d 0%, #581444 100%)',
                    },
                  }}
                >
                  {loading ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CircularProgress size={18} color="inherit" />
                      <span>Authenticating...</span>
                    </Box>
                  ) : (
                    'Sign In to Summit Desk'
                  )}
                </Button>
              </form>
            </Box>
          </Box>
        </Card>
      </motion.div>
    </Box>
  );
};
