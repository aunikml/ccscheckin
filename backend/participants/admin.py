from django.contrib import admin
from .models import Participant, GoogleSheetConfig, SyncHistory

@admin.register(Participant)
class ParticipantAdmin(admin.ModelAdmin):
    list_display = (
        'summit_id', 'name', 'email', 'mobile', 'guest_type',
        'day1_checked_in', 'day2_checked_in',
        'status', 'checked_in_at'
    )
    list_filter = (
        'status', 'guest_type',
        'day1_checked_in', 'day2_checked_in',
        'day1_session1', 'day1_session2', 'day2_session1', 'day2_session2',
        'created_at'
    )
    search_fields = ('summit_id', 'name', 'email', 'mobile', 'guest_type', 'session')
    ordering = ('-created_at',)

@admin.register(GoogleSheetConfig)
class GoogleSheetConfigAdmin(admin.ModelAdmin):
    list_display = ('name', 'sheet_url_or_id', 'tab_name', 'last_sync_status', 'last_synced_at')

@admin.register(SyncHistory)
class SyncHistoryAdmin(admin.ModelAdmin):
    list_display = ('started_at', 'status', 'rows_processed', 'new_added', 'updated', 'errors_count', 'triggered_by')
    list_filter = ('status', 'started_at')
