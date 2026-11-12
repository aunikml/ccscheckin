from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ParticipantViewSet,
    GoogleSheetConfigView,
    TriggerSyncView,
    SyncHistoryListView
)

router = DefaultRouter()
router.register(r'participants', ParticipantViewSet, basename='participant')

urlpatterns = [
    path('', include(router.urls)),
    path('sync/config/', GoogleSheetConfigView.as_view(), name='sheet_config'),
    path('sync/trigger/', TriggerSyncView.as_view(), name='sheet_sync_trigger'),
    path('sync/history/', SyncHistoryListView.as_view(), name='sheet_sync_history'),
]

