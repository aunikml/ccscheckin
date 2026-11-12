import uuid
from django.db import models
from django.utils import timezone

class Participant(models.Model):
    STATUS_CHOICES = (
        ('CONFIRMED', 'Confirmed'),
        ('CHECKED_IN', 'Checked In'),
        ('MAYBE', 'Tentative / Maybe'),
        ('CANCELLED', 'Cancelled / No'),
    )

    summit_id = models.CharField(max_length=30, unique=True, db_index=True)
    name = models.CharField(max_length=255, default='', blank=True, help_text='Participant Name')
    email = models.EmailField(unique=True, db_index=True)
    mobile = models.CharField(max_length=100, blank=True, help_text='Mobile / Phone Number')

    guest_type = models.CharField(
        max_length=100,
        default='General Participant',
        db_index=True,
        help_text='Guest Type (e.g. General Participant, Guest, Speaker, VIP)'
    )
    registration_time = models.CharField(
        max_length=100,
        blank=True,
        help_text='Time of Registration from Google Form'
    )
    confirmation = models.CharField(
        max_length=50,
        default='Yes',
        db_index=True,
        help_text='Confirmation response (Yes, Maybe, No)'
    )
    session = models.CharField(
        max_length=255,
        blank=True,
        db_index=True,
        help_text='Summit Session(s) raw selected string'
    )
    day1_session1 = models.BooleanField(default=False, db_index=True, verbose_name="Day 1 Session 1")
    day1_session2 = models.BooleanField(default=False, db_index=True, verbose_name="Day 1 Session 2")
    day2_session1 = models.BooleanField(default=False, db_index=True, verbose_name="Day 2 Session 1")
    day2_session2 = models.BooleanField(default=False, db_index=True, verbose_name="Day 2 Session 2")

    # Day-wise on-site check-in tracking
    day1_checked_in = models.BooleanField(default=False, db_index=True, verbose_name="Day 1 Checked In")
    day1_checked_in_at = models.DateTimeField(null=True, blank=True, verbose_name="Day 1 Check-In Time")
    day2_checked_in = models.BooleanField(default=False, db_index=True, verbose_name="Day 2 Checked In")
    day2_checked_in_at = models.DateTimeField(null=True, blank=True, verbose_name="Day 2 Check-In Time")

    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='CONFIRMED')
    checked_in_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.summit_id} - {self.name} ({self.guest_type})"

    @property
    def full_name(self):
        return self.name

    @property
    def phone(self):
        return self.mobile

    @property
    def attends_day1(self):
        return self.day1_session1 or self.day1_session2

    @property
    def attends_day2(self):
        return self.day2_session1 or self.day2_session2

    @property
    def attends_both_days(self):
        return self.attends_day1 and self.attends_day2

    @property
    def session_badges(self):
        badges = []
        if self.day1_session1:
            badges.append('Day 1: S1')
        if self.day1_session2:
            badges.append('Day 1: S2')
        if self.day2_session1:
            badges.append('Day 2: S1')
        if self.day2_session2:
            badges.append('Day 2: S2')
        return badges

    @property
    def is_checked_in_any(self):
        return self.day1_checked_in or self.day2_checked_in

    @property
    def is_checked_in_both(self):
        return self.day1_checked_in and self.day2_checked_in

    def save(self, *args, **kwargs):
        if not self.summit_id:
            last = Participant.objects.order_by('-id').first()
            next_num = (last.id + 1) if last else 1
            candidate = f"NCCS-2026-{next_num:04d}"
            while Participant.objects.filter(summit_id=candidate).exists():
                next_num += 1
                candidate = f"NCCS-2026-{next_num:04d}"
            self.summit_id = candidate

        # Automatically parse session string into session flags
        if self.session:
            s_lower = self.session.lower()
            self.day1_session1 = 'day 1 session 1' in s_lower or 'd1s1' in s_lower
            self.day1_session2 = 'day 1 session 2' in s_lower or 'd1s2' in s_lower
            self.day2_session1 = 'day 2 session 1' in s_lower or 'd2s1' in s_lower
            self.day2_session2 = 'day 2 session 2' in s_lower or 'd2s2' in s_lower

        # Handle Day-wise check-in timestamps
        if self.day1_checked_in and not self.day1_checked_in_at:
            self.day1_checked_in_at = timezone.now()
        elif not self.day1_checked_in:
            self.day1_checked_in_at = None

        if self.day2_checked_in and not self.day2_checked_in_at:
            self.day2_checked_in_at = timezone.now()
        elif not self.day2_checked_in:
            self.day2_checked_in_at = None

        if self.day1_checked_in or self.day2_checked_in:
            self.status = 'CHECKED_IN'
            self.checked_in_at = self.day2_checked_in_at or self.day1_checked_in_at or timezone.now()
        elif self.status == 'CHECKED_IN':
            # Revert to confirmed or original confirmation
            conf = (self.confirmation or '').strip().lower()
            if conf == 'maybe':
                self.status = 'MAYBE'
            elif conf == 'no':
                self.status = 'CANCELLED'
            else:
                self.status = 'CONFIRMED'
            self.checked_in_at = None

        # Sync confirmation with status if not explicitly checked in
        if self.status != 'CHECKED_IN':
            conf = (self.confirmation or '').strip().lower()
            if conf == 'no':
                self.status = 'CANCELLED'
            elif conf == 'maybe':
                self.status = 'MAYBE'
            elif conf == 'yes':
                self.status = 'CONFIRMED'

        super().save(*args, **kwargs)


class GoogleSheetConfig(models.Model):
    name = models.CharField(max_length=100, default='National Child Care Summit Google Form Responses')
    sheet_url_or_id = models.CharField(
        max_length=500,
        blank=True,
        help_text='Full Google Sheet URL or Sheet ID'
    )
    tab_name = models.CharField(
        max_length=100,
        default='Form Responses 1',
        help_text='The sheet tab title'
    )
    is_active = models.BooleanField(default=True)
    last_synced_at = models.DateTimeField(null=True, blank=True)
    last_sync_status = models.CharField(
        max_length=30,
        default='IDLE',
        choices=(
            ('IDLE', 'Idle'),
            ('RUNNING', 'Running'),
            ('SUCCESS', 'Success'),
            ('ERROR', 'Error'),
        )
    )
    last_sync_message = models.TextField(blank=True)

    column_mapping = models.JSONField(
        default=dict,
        blank=True,
        help_text='Maps Google Sheet header texts to Participant model fields'
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

    @classmethod
    def get_default_config(cls):
        obj, created = cls.objects.get_or_create(id=1, defaults={
            'name': 'National Child Care Summit Google Form Responses',
            'tab_name': 'Form Responses 1',
            'column_mapping': {
                'Guest Type': 'guest_type',
                'Time of Registration': 'registration_time',
                'Name': 'name',
                'Email': 'email',
                'Mobile': 'mobile',
                'Confirmation': 'confirmation',
                'Session': 'session',
            }
        })
        return obj


class SyncHistory(models.Model):
    STATUS_CHOICES = (
        ('SUCCESS', 'Success'),
        ('FAILED', 'Failed'),
        ('PARTIAL', 'Partial'),
    )

    started_at = models.DateTimeField(auto_now_add=True)
    finished_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='SUCCESS')
    rows_processed = models.IntegerField(default=0)
    new_added = models.IntegerField(default=0)
    updated = models.IntegerField(default=0)
    errors_count = models.IntegerField(default=0)
    details = models.TextField(blank=True)
    triggered_by = models.CharField(max_length=100, default='admin')

    class Meta:
        ordering = ['-started_at']

    def __str__(self):
        return f"Sync on {self.started_at.strftime('%Y-%m-%d %H:%M:%S')} - {self.status} (+{self.new_added})"
