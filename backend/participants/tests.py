from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from authentication.models import User
from .models import Participant, GoogleSheetConfig
from .sheet_sync import sync_participants_from_rows

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

    def test_search_lookup_includes_all_participants_sharing_email(self):
        primary = Participant.objects.create(
            name='Tasmia Rahman',
            email='tasmia@example.com',
            mobile='01999999999',
            guest_type='VIP',
        )
        sibling = Participant.objects.create(
            name='Sibling Attendee',
            email='tasmia@example.com',
            mobile='01888888888',
            guest_type='Guest',
        )

        response = self.client.get('/api/participants/search_lookup/?q=Tasmia Rahman')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        returned_ids = {row['id'] for row in response.data}
        self.assertIn(primary.id, returned_ids)
        self.assertIn(sibling.id, returned_ids)

    def test_search_lookup_includes_all_participants_sharing_phone(self):
        primary = Participant.objects.create(
            name='Phone Owner',
            email='owner@example.com',
            mobile='01712345678',
            guest_type='VIP',
        )
        sibling = Participant.objects.create(
            name='Shared Phone Attendee',
            email='shared@example.com',
            mobile='01712345678',
            guest_type='Guest',
        )

        response = self.client.get('/api/participants/search_lookup/?q=01712345678')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        returned_ids = {row['id'] for row in response.data}
        self.assertIn(primary.id, returned_ids)
        self.assertIn(sibling.id, returned_ids)

    def test_search_lookup_by_email_does_not_pull_in_unrelated_phone_siblings(self):
        primary = Participant.objects.create(
            name='Muhtashim Uddin Ahmed',
            email='muhtashim.uddin@bracu.ac.bd',
            mobile='01798598882',
            guest_type='VIP',
        )
        duplicate_email = Participant.objects.create(
            name='Nazmun Naher',
            email='muhtashim.uddin@bracu.ac.bd',
            mobile='01703225099',
            guest_type='Guest',
        )
        # Unrelated attendee who happens to have the coordinator's phone number
        unrelated_vip = Participant.objects.create(
            name='Professor Syed Ferhat Anwar',
            email='vc@bracu.ac.bd',
            mobile='01798598882',
            guest_type='VIP',
        )

        response = self.client.get('/api/participants/search_lookup/?q=muhtashim.uddin@bracu.ac.bd')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        returned_ids = {row['id'] for row in response.data}
        self.assertEqual(len(returned_ids), 2)
        self.assertIn(primary.id, returned_ids)
        self.assertIn(duplicate_email.id, returned_ids)
        self.assertNotIn(unrelated_vip.id, returned_ids)

    def test_fast_checkin_returns_all_matches_for_duplicate_email(self):
        primary = Participant.objects.create(
            name='Tasmia Rahman',
            email='tasmia@example.com',
            mobile='01999999999',
            guest_type='VIP',
        )
        sibling = Participant.objects.create(
            name='Sibling Attendee',
            email='tasmia@example.com',
            mobile='01888888888',
            guest_type='Guest',
        )

        response = self.client.post('/api/participants/fast_checkin/', {
            'query': 'tasmia@example.com',
            'day': '1',
        })

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(len(response.data['matches']), 2)
        returned_ids = {row['id'] for row in response.data['matches']}
        self.assertEqual(returned_ids, {primary.id, sibling.id})

        primary.refresh_from_db()
        sibling.refresh_from_db()
        self.assertFalse(primary.day1_checked_in)
        self.assertFalse(sibling.day1_checked_in)

    def test_sheet_sync_allows_duplicate_emails_and_is_idempotent(self):
        config = GoogleSheetConfig.get_default_config()
        rows = [
            {
                'Name': 'Group Member One',
                'Email': 'group@example.com',
                'Mobile': '01711111111',
                'Guest Type': 'Guest',
                'Session': 'Day 1 Session 1',
            },
            {
                'Name': 'Group Member Two',
                'Email': 'group@example.com',
                'Mobile': '01722222222',
                'Guest Type': 'Guest',
                'Session': 'Day 2 Session 1',
            },
        ]

        first = sync_participants_from_rows(rows, config, triggered_by='test')
        self.assertEqual(first['new_added'], 2)
        self.assertEqual(
            Participant.objects.filter(email='group@example.com').count(), 2
        )

        second = sync_participants_from_rows(rows, config, triggered_by='test')
        self.assertEqual(second['new_added'], 0)
        self.assertEqual(second['updated'], 2)
        self.assertEqual(
            Participant.objects.filter(email='group@example.com').count(), 2
        )

    def test_sheet_sync_preserves_exact_duplicate_rows(self):
        config = GoogleSheetConfig.get_default_config()
        rows = [
            {
                'Name': 'Same Person',
                'Email': 'same@example.com',
                'Mobile': '01711111111',
                'Time of Registration': '1-Nov-2026',
                'Guest Type': 'Guest',
                'Session': 'Day 1 Session 1',
            },
            {
                'Name': 'Same Person',
                'Email': 'same@example.com',
                'Mobile': '01711111111',
                'Time of Registration': '9-Nov-2026',
                'Guest Type': 'Guest',
                'Session': 'Day 1 Session 1',
            },
        ]

        first = sync_participants_from_rows(
            rows, config, triggered_by='test', source_id='sheet-x'
        )
        self.assertEqual(first['new_added'], 2)
        self.assertEqual(
            Participant.objects.filter(email='same@example.com').count(), 2
        )

        second = sync_participants_from_rows(
            rows, config, triggered_by='test', source_id='sheet-x'
        )
        self.assertEqual(second['new_added'], 0)
        self.assertEqual(second['updated'], 2)
        self.assertEqual(
            Participant.objects.filter(email='same@example.com').count(), 2
        )

    def test_sheet_sync_updates_email_and_confirmation_status(self):
        config = GoogleSheetConfig.get_default_config()
        rows = [{
            'Name': 'Mohammad Mahboob Morshed',
            'Email': 'old.email@example.com',
            'Mobile': '01767903624',
            'Guest Type': 'Guest',
            'Confirmation': 'Yes',
            'Session': 'Day 1 Session 1',
        }]

        sync_participants_from_rows(
            rows, config, triggered_by='test', source_id='sheet-email'
        )
        participant = Participant.objects.get(source_key='sheet-email:Form Responses 1:1')
        self.assertEqual(participant.email, 'old.email@example.com')
        self.assertEqual(participant.status, 'CONFIRMED')

        rows[0]['Email'] = 'mahboob.morshed@du.ac.bd'
        rows[0]['Confirmation'] = 'No'
        result = sync_participants_from_rows(
            rows, config, triggered_by='test', source_id='sheet-email'
        )

        self.assertEqual(result['updated'], 1)
        participant.refresh_from_db()
        self.assertEqual(participant.name, 'Mohammad Mahboob Morshed')
        self.assertEqual(participant.email, 'mahboob.morshed@du.ac.bd')
        self.assertEqual(participant.confirmation, 'No')
        self.assertEqual(participant.status, 'CANCELLED')
