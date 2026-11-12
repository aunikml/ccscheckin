from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from authentication.models import User
from .models import Participant, GoogleSheetConfig

class ParticipantModelTests(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username='admin_test',
            email='admin@test.com',
            password='password123',
            role='ADMIN',
            is_staff=True
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.admin)

    def test_create_participant_auto_summit_id_and_session_flags(self):
        p = Participant.objects.create(
            name='Test Participant',
            email='test@example.com',
            mobile='+8801700000000',
            guest_type='General Participant',
            session='Day 1 Session 1, Day 2 Session 2'
        )
        self.assertTrue(p.summit_id.startswith('NCCS-2026-'))
        self.assertEqual(p.status, 'CONFIRMED')
        self.assertTrue(p.day1_session1)
        self.assertFalse(p.day1_session2)
        self.assertFalse(p.day2_session1)
        self.assertTrue(p.day2_session2)
        self.assertTrue(p.attends_day1)
        self.assertTrue(p.attends_day2)
        self.assertTrue(p.attends_both_days)
        self.assertEqual(p.session_badges, ['Day 1: S1', 'Day 2: S2'])

    def test_toggle_day_checkin(self):
        p = Participant.objects.create(
            name='Ayesha Khan',
            email='ayesha@example.com',
            mobile='01711111111',
            guest_type='Guest',
            session='Day 1 Session 1, Day 2 Session 2'
        )
        # Check in for Day 1
        res1 = self.client.post(f'/api/participants/{p.id}/toggle_day_checkin/', {'day': 1})
        self.assertEqual(res1.status_code, status.HTTP_200_OK)
        p.refresh_from_db()
        self.assertTrue(p.day1_checked_in)
        self.assertIsNotNone(p.day1_checked_in_at)
        self.assertFalse(p.day2_checked_in)
        self.assertEqual(p.status, 'CHECKED_IN')

        # Check in for Day 2
        res2 = self.client.post(f'/api/participants/{p.id}/toggle_day_checkin/', {'day': 2})
        self.assertEqual(res2.status_code, status.HTTP_200_OK)
        p.refresh_from_db()
        self.assertTrue(p.day1_checked_in)
        self.assertTrue(p.day2_checked_in)
        self.assertIsNotNone(p.day2_checked_in_at)

        # Undo Day 1 check-in
        res3 = self.client.post(f'/api/participants/{p.id}/toggle_day_checkin/', {'day': 1})
        self.assertEqual(res3.status_code, status.HTTP_200_OK)
        p.refresh_from_db()
        self.assertFalse(p.day1_checked_in)
        self.assertTrue(p.day2_checked_in)

    def test_fast_checkin_with_day(self):
        p = Participant.objects.create(
            name='Rahim Uddin',
            email='rahim@example.com',
            mobile='01722222222',
            guest_type='General Participant',
            session='Day 2 Session 1'
        )
        response = self.client.post('/api/participants/fast_checkin/', {'query': 'rahim@example.com', 'day': '2'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        p.refresh_from_db()
        self.assertTrue(p.day2_checked_in)
        self.assertFalse(p.day1_checked_in)

    def test_export_checkin_csv(self):
        Participant.objects.create(
            name='Export Attendee',
            email='export@example.com',
            session='Day 1 Session 1',
            day1_checked_in=True
        )
        res = self.client.get('/api/participants/export_checkin_csv/?day=1&only_checked_in=true')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('text/csv', res['Content-Type'])
        content = res.content.decode('utf-8')
        self.assertIn('Day 1 Check-In Timestamp', content)
        self.assertIn('export@example.com', content)

    def test_stats_and_session_insights(self):
        Participant.objects.create(
            name='Fatima Noor',
            email='fatima@example.com',
            mobile='01733333333',
            guest_type='Guest',
            session='Day 1 Session 1, Day 1 Session 2, Day 2 Session 1, Day 2 Session 2',
            day1_checked_in=True
        )
        response = self.client.get('/api/participants/stats/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('session_insights', response.data)
        insights = response.data['session_insights']
        self.assertIn('day1', insights)
        self.assertIn('day2', insights)
        self.assertIn('checkin_summary', insights)
        self.assertGreaterEqual(insights['day1']['checked_in'], 1)

    def test_search_lookup_and_id_checkin_with_already_checked_in_flag(self):
        host_user = User.objects.create_user(
            username='host_tester',
            email='host_tester@test.com',
            password='password123',
            role='REGISTRATION_HOST'
        )
        self.client.force_authenticate(user=host_user)

        p = Participant.objects.create(
            name='Tasmia Rahman',
            email='tasmia@example.com',
            mobile='01999999999',
            guest_type='VIP',
            session='Day 1 Session 1, Day 2 Session 1'
        )

        # 1. Test search_lookup by partial name
        search_res = self.client.get('/api/participants/search_lookup/?q=Tasmia')
        self.assertEqual(search_res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(search_res.data), 1)
        self.assertEqual(search_res.data[0]['name'], 'Tasmia Rahman')
        self.assertFalse(search_res.data[0]['day1_checked_in'])

        # 2. Check in by participant_id for Day 1
        checkin_res1 = self.client.post('/api/participants/fast_checkin/', {
            'participant_id': p.id,
            'day': '1'
        })
        self.assertEqual(checkin_res1.status_code, status.HTTP_200_OK)
        self.assertFalse(checkin_res1.data['already_checked_in'])
        self.assertTrue(checkin_res1.data['participant']['day1_checked_in'])

        # 3. Check in again for Day 1 -> already_checked_in should be True
        checkin_res2 = self.client.post('/api/participants/fast_checkin/', {
            'participant_id': p.id,
            'day': '1'
        })
        self.assertEqual(checkin_res2.status_code, status.HTTP_200_OK)
        self.assertTrue(checkin_res2.data['already_checked_in'])
        self.assertIn('already checked in', checkin_res2.data['message'].lower())
