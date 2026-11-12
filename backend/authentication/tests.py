from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from participants.models import Participant

User = get_user_model()

class UserManagementAndRbacTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # 1. Admin user
        self.admin = User.objects.create_user(
            username='admin_test',
            password='password123',
            email='admin@childcaresummit.org',
            role='ADMIN',
            is_staff=True,
            is_superuser=True
        )

        # 2. Registration Host user
        self.host = User.objects.create_user(
            username='host_test',
            password='password123',
            email='host@childcaresummit.org',
            role='REGISTRATION_HOST'
        )

        # 3. Viewer user
        self.viewer = User.objects.create_user(
            username='viewer_test',
            password='password123',
            email='viewer@childcaresummit.org',
            role='VIEWER'
        )

        # Sample Participant
        self.participant = Participant.objects.create(
            summit_id='NCCS-2026-0001',
            name='Test Participant',
            email='participant@test.com',
            guest_type='General Participant',
            day1_session1=True,
            day2_session1=True,
        )

    def test_admin_full_crud_user_management(self):
        self.client.force_authenticate(user=self.admin)

        # List users
        res = self.client.get('/api/auth/users/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        # Verify returned count matches database users count
        self.assertEqual(len(res.data), User.objects.count())

        # Create new Registration Host user
        res_create = self.client.post('/api/auth/users/', {
            'username': 'new_host',
            'password': 'password123',
            'email': 'new_host@test.com',
            'first_name': 'New',
            'last_name': 'Host',
            'role': 'REGISTRATION_HOST'
        })
        self.assertEqual(res_create.status_code, status.HTTP_201_CREATED)
        new_user_id = res_create.data['id']

        # Edit user
        res_update = self.client.patch(f'/api/auth/users/{new_user_id}/', {
            'role': 'VIEWER'
        })
        self.assertEqual(res_update.status_code, status.HTTP_200_OK)
        self.assertEqual(res_update.data['role'], 'VIEWER')

        # Delete user
        res_del = self.client.delete(f'/api/auth/users/{new_user_id}/')
        self.assertEqual(res_del.status_code, status.HTTP_204_NO_CONTENT)

    def test_admin_cannot_delete_self(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.delete(f'/api/auth/users/{self.admin.id}/')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_registration_host_cannot_access_user_management(self):
        self.client.force_authenticate(user=self.host)
        res = self.client.get('/api/auth/users/')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_viewer_cannot_access_user_management(self):
        self.client.force_authenticate(user=self.viewer)
        res = self.client.get('/api/auth/users/')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_registration_host_can_checkin_and_create_but_not_delete(self):
        self.client.force_authenticate(user=self.host)

        # Can see dashboard stats
        res_stats = self.client.get('/api/participants/stats/')
        self.assertEqual(res_stats.status_code, status.HTTP_200_OK)

        # Can see participant directory
        res_list = self.client.get('/api/participants/')
        self.assertEqual(res_list.status_code, status.HTTP_200_OK)

        # Can check in participant
        res_checkin = self.client.post(f'/api/participants/{self.participant.id}/toggle_day_checkin/', {'day': 1})
        self.assertEqual(res_checkin.status_code, status.HTTP_200_OK)
        self.participant.refresh_from_db()
        self.assertTrue(self.participant.day1_checked_in)

        # Can add new participant
        res_create = self.client.post('/api/participants/', {
            'summit_id': 'NCCS-2026-9999',
            'name': 'On-site Walkin',
            'email': 'walkin@test.com',
            'guest_type': 'General Participant',
            'day1_session1': True
        })
        self.assertEqual(res_create.status_code, status.HTTP_201_CREATED)

        # CANNOT delete participant
        res_del = self.client.delete(f'/api/participants/{self.participant.id}/')
        self.assertEqual(res_del.status_code, status.HTTP_403_FORBIDDEN)

        # CANNOT export full CSV
        res_exp = self.client.get('/api/participants/export_csv/')
        self.assertEqual(res_exp.status_code, status.HTTP_403_FORBIDDEN)

    def test_viewer_can_only_see_dashboard_stats(self):
        self.client.force_authenticate(user=self.viewer)

        # Can see dashboard stats
        res_stats = self.client.get('/api/participants/stats/')
        self.assertEqual(res_stats.status_code, status.HTTP_200_OK)

        # CANNOT see participant list
        res_list = self.client.get('/api/participants/')
        self.assertEqual(res_list.status_code, status.HTTP_403_FORBIDDEN)

        # CANNOT check in participant
        res_checkin = self.client.post(f'/api/participants/{self.participant.id}/toggle_day_checkin/', {'day': 1})
        self.assertEqual(res_checkin.status_code, status.HTTP_403_FORBIDDEN)
