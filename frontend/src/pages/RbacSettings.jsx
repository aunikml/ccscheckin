import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Paper,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
} from '@mui/material';
import SecurityIcon from '@mui/icons-material/Security';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import SettingsApplicationsIcon from '@mui/icons-material/SettingsApplications';
import CodeIcon from '@mui/icons-material/Code';
import { useAuth } from '../context/AuthContext';

export const RbacSettings = () => {
  const { user } = useAuth();

  return (
    <Box>
      <Box sx={{ mb: 3.5 }}>
        <Typography variant="h4" fontWeight="800" sx={{ color: '#0f172a' }}>
          Role-Based Access Control & System Architecture
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Security policy enforcement, administrator profile, and virtual environment configuration
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Admin User Card */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                <AdminPanelSettingsIcon color="primary" sx={{ fontSize: 28 }} />
                <Box>
                  <Typography variant="h6" fontWeight="700">
                    Current Authenticated Administrator
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Active session identity and permissions
                  </Typography>
                </Box>
              </Box>

              <Paper elevation={0} sx={{ p: 2.5, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0', mb: 2 }}>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      Username
                    </Typography>
                    <Typography variant="body1" fontWeight="700">
                      {user?.username}
                    </Typography>
                  </Grid>

                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      Role
                    </Typography>
                    <Box sx={{ mt: 0.3 }}>
                      <Chip
                        label={user?.role || 'ADMIN'}
                        color="success"
                        size="small"
                        sx={{ fontWeight: 800 }}
                      />
                    </Box>
                  </Grid>

                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">
                      Email Address
                    </Typography>
                    <Typography variant="body2" fontWeight="600">
                      {user?.email || 'admin@childcaresummit.org'}
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>

              <Typography variant="subtitle2" fontWeight="700" gutterBottom>
                Active Admin Privileges:
              </Typography>
              <List dense disablePadding>
                <ListItem sx={{ px: 0 }}>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <CheckCircleIcon color="success" fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Full CRUD Operations"
                    secondary="Create, view, modify, and delete participant accreditation records"
                  />
                </ListItem>
                <ListItem sx={{ px: 0 }}>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <CheckCircleIcon color="success" fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Google Form & Sheet Sync Pipeline"
                    secondary="Configure spreadsheet endpoints and trigger automated imports"
                  />
                </ListItem>
                <ListItem sx={{ px: 0 }}>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <CheckCircleIcon color="success" fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary="On-Site Accreditation & Badge Printing"
                    secondary="Quick check-in desk execution, lanyard pass generation, and QR simulation"
                  />
                </ListItem>
                <ListItem sx={{ px: 0 }}>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <CheckCircleIcon color="success" fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Export & Compliance Reporting"
                    secondary="Generate filtered CSV reports for summit stakeholders and catering"
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* System & Environment Card */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                <SettingsApplicationsIcon color="primary" sx={{ fontSize: 28 }} />
                <Box>
                  <Typography variant="h6" fontWeight="700">
                    System Architecture & Environment
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Isolated virtual environment and .env configuration
                  </Typography>
                </Box>
              </Box>

              <List dense>
                <ListItem sx={{ px: 0 }}>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <CheckCircleIcon color="success" fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Python Virtual Environment (venv)"
                    secondary="backend/venv contains isolated Django 5.x, DRF, SimpleJWT, and Google API client dependencies"
                  />
                </ListItem>

                <Divider sx={{ my: 1 }} />

                <ListItem sx={{ px: 0 }}>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <CheckCircleIcon color="success" fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary=".env Configuration Loading"
                    secondary="Loaded via python-dotenv for SECRET_KEY, ADMIN credentials, and Google Sheet API keys"
                  />
                </ListItem>

                <Divider sx={{ my: 1 }} />

                <ListItem sx={{ px: 0 }}>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <CheckCircleIcon color="success" fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary="JWT Token Authentication"
                    secondary="Stateless JSON Web Tokens with 24-hour access lifetime and Bearer header verification"
                  />
                </ListItem>

                <Divider sx={{ my: 1 }} />

                <ListItem sx={{ px: 0 }}>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <CheckCircleIcon color="success" fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Admin-Only RBAC Policy (Active)"
                    secondary="Strict permission enforcement via IsAdminUserOnly filter on all participant management endpoints"
                  />
                </ListItem>
              </List>

              <Paper elevation={0} sx={{ p: 2, mt: 2, bgcolor: '#f1f5f9', borderRadius: 2, border: '1px dashed #cbd5e1' }}>
                <Typography variant="caption" color="text.secondary" display="block">
                  RBAC Extensibility Note:
                </Typography>
                <Typography variant="caption" color="text.primary">
                  The model architecture includes predefined hooks for <code>STAFF</code> (check-in desk only) and <code>VIEWER</code> (read-only reports) roles that can be unlocked whenever you decide to expand beyond admin-only access.
                </Typography>
              </Paper>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

