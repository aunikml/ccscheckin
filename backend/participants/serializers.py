from rest_framework import serializers
from .models import Participant, GoogleSheetConfig, SyncHistory, InvitedGuest, InvitedGuestConfig

class ParticipantSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    full_name = serializers.CharField(read_only=True)
    phone = serializers.CharField(read_only=True)
    attends_day1 = serializers.BooleanField(read_only=True)
    attends_day2 = serializers.BooleanField(read_only=True)
    attends_both_days = serializers.BooleanField(read_only=True)
    is_checked_in_any = serializers.BooleanField(read_only=True)
    is_checked_in_both = serializers.BooleanField(read_only=True)
    session_badges = serializers.ListField(child=serializers.CharField(), read_only=True)

    class Meta:
        model = Participant
        fields = [
            'id',
            'summit_id',
            'name',
            'full_name',
            'email',
            'mobile',
            'phone',
            'guest_type',
            'registration_time',
            'confirmation',
            'session',
            'day1_session1',
            'day1_session2',
            'day2_session1',
            'day2_session2',
            'attends_day1',
            'attends_day2',
            'attends_both_days',
            'session_badges',
            'day1_checked_in',
            'day1_checked_in_at',
            'day2_checked_in',
            'day2_checked_in_at',
            'is_checked_in_any',
            'is_checked_in_both',
            'status',
            'status_display',
            'checked_in_at',
            'notes',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'summit_id', 'created_at', 'updated_at']


class GoogleSheetConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = GoogleSheetConfig
        fields = [
            'id',
            'name',
            'sheet_url_or_id',
            'tab_name',
            'is_active',
            'last_synced_at',
            'last_sync_status',
            'last_sync_message',
            'column_mapping',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'last_synced_at', 'last_sync_status', 'last_sync_message', 'created_at', 'updated_at']


class SyncHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = SyncHistory
        fields = '__all__'


class InvitedGuestSerializer(serializers.ModelSerializer):
    is_registered = serializers.BooleanField(read_only=True, default=False)
    registered_summit_id = serializers.CharField(read_only=True, allow_null=True)
    registered_status = serializers.CharField(read_only=True, allow_null=True)
    registered_guest_type = serializers.CharField(read_only=True, allow_null=True)
    day1_checked_in = serializers.BooleanField(read_only=True, default=False)
    day2_checked_in = serializers.BooleanField(read_only=True, default=False)

    class Meta:
        model = InvitedGuest
        fields = [
            'id',
            'name',
            'number',
            'email',
            'cohort',
            'session',
            'source_row',
            'is_registered',
            'registered_summit_id',
            'registered_status',
            'registered_guest_type',
            'day1_checked_in',
            'day2_checked_in',
            'created_at',
            'updated_at',
        ]


class InvitedGuestConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = InvitedGuestConfig
        fields = [
            'id',
            'sheet_url',
            'last_synced_at',
            'last_sync_status',
            'last_sync_message',
            'total_records',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'last_synced_at', 'last_sync_status', 'last_sync_message', 'total_records', 'created_at', 'updated_at']
