import csv
from django.http import HttpResponse
from django.db.models import Count, Q, Exists, OuterRef
from django.utils import timezone
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from authentication.permissions import IsAdminUserOnly, ParticipantCustomPermission, IsRegistrationHostOrAdmin
from .models import Participant, GoogleSheetConfig, SyncHistory, InvitedGuest, InvitedGuestConfig
from .serializers import (
    ParticipantSerializer,
    GoogleSheetConfigSerializer,
    SyncHistorySerializer,
    InvitedGuestSerializer,
    InvitedGuestConfigSerializer,
)
from .sheet_sync import (
    execute_google_sheet_sync,
    sync_participants_from_rows,
    fetch_sheet_csv_rows,
    extract_sheet_id,
    sync_invited_guests_from_sheet,
)

class ParticipantViewSet(viewsets.ModelViewSet):
    """
    Full CRUD ViewSet for National Child Care Summit Participants with search, filtering,
    batch actions, on-site Day 1 & Day 2 check-ins, statistics, and CSV export.
    Protected by RBAC: Admin and Registration Host.
    """
    queryset = Participant.objects.all()
    serializer_class = ParticipantSerializer
    permission_classes = [permissions.IsAuthenticated, ParticipantCustomPermission]

    def get_queryset(self):
        qs = Participant.objects.all()
        search = self.request.query_params.get('search', '').strip()
        guest_type = self.request.query_params.get('guest_type', '').strip()
        confirmation = self.request.query_params.get('confirmation', '').strip()
        session = self.request.query_params.get('session', '').strip()
        session_filter = self.request.query_params.get('session_filter', '').strip().upper()
        checkin_filter = self.request.query_params.get('checkin_filter', '').strip().upper()
        status_param = self.request.query_params.get('status', '').strip()

        # Sanitize against frontend passing 'undefined' or 'null' as string
        if search.lower() in ('undefined', 'null'):
            search = ''
        if guest_type.lower() in ('undefined', 'null', 'all'):
            guest_type = ''
        if confirmation.lower() in ('undefined', 'null', 'all'):
            confirmation = ''
        if session.lower() in ('undefined', 'null', 'all'):
            session = ''
        if session_filter in ('UNDEFINED', 'NULL', 'ALL'):
            session_filter = ''
        if checkin_filter in ('UNDEFINED', 'NULL', 'ALL'):
            checkin_filter = ''
        if status_param.lower() in ('undefined', 'null', 'all'):
            status_param = ''

        if search:
            qs = qs.filter(
                Q(name__icontains=search) |
                Q(email__icontains=search) |
                Q(mobile__icontains=search) |
                Q(summit_id__icontains=search) |
                Q(guest_type__icontains=search) |
                Q(session__icontains=search)
            )

        if guest_type and guest_type != 'ALL':
            qs = qs.filter(guest_type=guest_type)

        if confirmation and confirmation != 'ALL':
            qs = qs.filter(confirmation=confirmation)

        # Precise session filtering based on boolean flags or session string
        active_session_filter = session_filter or session.upper()
        if active_session_filter and active_session_filter != 'ALL':
            if active_session_filter in ('DAY_1', 'DAY 1'):
                qs = qs.filter(Q(day1_session1=True) | Q(day1_session2=True))
            elif active_session_filter in ('DAY_2', 'DAY 2'):
                qs = qs.filter(Q(day2_session1=True) | Q(day2_session2=True))
            elif active_session_filter in ('BOTH_DAYS', 'BOTH DAYS', 'BOTH'):
                qs = qs.filter(
                    Q(day1_session1=True) | Q(day1_session2=True)
                ).filter(
                    Q(day2_session1=True) | Q(day2_session2=True)
                )
            elif active_session_filter in ('D1S1', 'DAY 1 SESSION 1'):
                qs = qs.filter(day1_session1=True)
            elif active_session_filter in ('D1S2', 'DAY 1 SESSION 2'):
                qs = qs.filter(day1_session2=True)
            elif active_session_filter in ('D2S1', 'DAY 2 SESSION 1'):
                qs = qs.filter(day2_session1=True)
            elif active_session_filter in ('D2S2', 'DAY 2 SESSION 2'):
                qs = qs.filter(day2_session2=True)
            else:
                qs = qs.filter(session__icontains=session)

        # Check-in state filtering (Day 1 / Day 2 / Both)
        if checkin_filter and checkin_filter != 'ALL':
            if checkin_filter == 'DAY_1_CHECKED_IN':
                qs = qs.filter(day1_checked_in=True)
            elif checkin_filter == 'DAY_2_CHECKED_IN':
                qs = qs.filter(day2_checked_in=True)
            elif checkin_filter == 'BOTH_CHECKED_IN':
                qs = qs.filter(day1_checked_in=True, day2_checked_in=True)
            elif checkin_filter == 'ANY_CHECKED_IN':
                qs = qs.filter(Q(day1_checked_in=True) | Q(day2_checked_in=True))
            elif checkin_filter == 'NOT_CHECKED_IN':
                qs = qs.filter(day1_checked_in=False, day2_checked_in=False)

        if status_param and status_param != 'ALL':
            qs = qs.filter(status=status_param)

        sort_by = self.request.query_params.get('sort_by', '-created_at')
        return qs.order_by(sort_by)

    @action(detail=True, methods=['post'])
    def toggle_day_checkin(self, request, pk=None):
        """
        Independent on-site check-in toggle for Day 1 or Day 2.
        Payload: { "day": 1 } or { "day": 2 }
        """
        participant = self.get_object()
        day = str(request.data.get('day', '1')).strip()

        if day == '1':
            participant.day1_checked_in = not participant.day1_checked_in
            participant.day1_checked_in_at = timezone.now() if participant.day1_checked_in else None
            state = 'checked in' if participant.day1_checked_in else 'undone check-in'
            msg = f"{participant.name} is now {state} for Day 1."
        elif day == '2':
            participant.day2_checked_in = not participant.day2_checked_in
            participant.day2_checked_in_at = timezone.now() if participant.day2_checked_in else None
            state = 'checked in' if participant.day2_checked_in else 'undone check-in'
            msg = f"{participant.name} is now {state} for Day 2."
        else:
            return Response({'error': 'Invalid day parameter. Must be 1 or 2.'}, status=status.HTTP_400_BAD_REQUEST)

        participant.save()
        serializer = self.get_serializer(participant)
        return Response({
            'participant': serializer.data,
            'message': msg,
            'day': int(day),
            'day1_checked_in': participant.day1_checked_in,
            'day2_checked_in': participant.day2_checked_in,
        })

    @action(detail=True, methods=['post'])
    def toggle_checkin(self, request, pk=None):
        """
        Legacy quick toggle: toggles Day 1 check-in if neither is checked in, or toggles both.
        """
        participant = self.get_object()
        if participant.day1_checked_in or participant.day2_checked_in:
            participant.day1_checked_in = False
            participant.day1_checked_in_at = None
            participant.day2_checked_in = False
            participant.day2_checked_in_at = None
            msg = f"{participant.name} check-in undone."
        else:
            # Check in for whichever day(s) participant is registered for
            now = timezone.now()
            if participant.attends_day1 or not participant.attends_day2:
                participant.day1_checked_in = True
                participant.day1_checked_in_at = now
            if participant.attends_day2 and not participant.attends_day1:
                participant.day2_checked_in = True
                participant.day2_checked_in_at = now
            msg = f"{participant.name} checked in successfully."

        participant.save()
        serializer = self.get_serializer(participant)
        return Response({
            'status': participant.status,
            'checked_in_at': participant.checked_in_at,
            'participant': serializer.data,
            'message': msg,
        })

    @action(detail=False, methods=['post'])
    def bulk_action(self, request):
        """
        Perform bulk operations: check_in_day1, check_in_day2, check_in_both, undo_day1, undo_day2, confirm, cancel, delete.
        """
        action_type = request.data.get('action')
        ids = request.data.get('ids', [])

        if not ids:
            return Response({'error': 'No participant IDs provided.'}, status=status.HTTP_400_BAD_REQUEST)

        participants = Participant.objects.filter(id__in=ids)
        count = participants.count()
        now = timezone.now()

        if action_type in ('check_in', 'check_in_day1'):
            participants.update(day1_checked_in=True, day1_checked_in_at=now, status='CHECKED_IN', checked_in_at=now)
            msg = f"Successfully checked in {count} participants for Day 1."
        elif action_type == 'check_in_day2':
            participants.update(day2_checked_in=True, day2_checked_in_at=now, status='CHECKED_IN', checked_in_at=now)
            msg = f"Successfully checked in {count} participants for Day 2."
        elif action_type == 'check_in_both':
            participants.update(
                day1_checked_in=True, day1_checked_in_at=now,
                day2_checked_in=True, day2_checked_in_at=now,
                status='CHECKED_IN', checked_in_at=now
            )
            msg = f"Successfully checked in {count} participants for Both Days."
        elif action_type == 'undo_day1':
            participants.update(day1_checked_in=False, day1_checked_in_at=None)
            # Update overall status if day2 is also not checked in
            participants.filter(day2_checked_in=False).update(status='CONFIRMED', checked_in_at=None)
            msg = f"Undone Day 1 check-in for {count} participants."
        elif action_type == 'undo_day2':
            participants.update(day2_checked_in=False, day2_checked_in_at=None)
            participants.filter(day1_checked_in=False).update(status='CONFIRMED', checked_in_at=None)
            msg = f"Undone Day 2 check-in for {count} participants."
        elif action_type == 'confirm':
            participants.update(
                status='CONFIRMED', checked_in_at=None,
                day1_checked_in=False, day1_checked_in_at=None,
                day2_checked_in=False, day2_checked_in_at=None
            )
            msg = f"Successfully set {count} participants as Confirmed."
        elif action_type == 'cancel':
            participants.update(status='CANCELLED')
            msg = f"Cancelled registration for {count} participants."
        elif action_type == 'delete':
            if not getattr(request.user, 'is_admin_role', False):
                return Response({'error': 'Deleting participants requires Admin privileges.'}, status=status.HTTP_403_FORBIDDEN)
            participants.delete()
            return Response({'message': f"Successfully removed {count} participants.", 'count': count})
        else:
            return Response({'error': f"Unknown action: {action_type}"}, status=status.HTTP_400_BAD_REQUEST)

        return Response({'message': msg, 'count': count})

    @action(detail=False, methods=['get'])
    def search_lookup(self, request):
        """
        Fast typeahead search lookup for check-in desk.
        Returns matching participants matching query against name, summit_id, email, or mobile.
        When searching by name, Summit ID, or email, duplicate registrations sharing the
        same email are also surfaced together.
        Phone numbers are NOT used to bridge siblings across different emails, because
        coordinators / focal persons often use their mobile number for distinct attendees.
        """
        q = request.query_params.get('q', '').strip()
        if not q or len(q) < 1:
            return Response([])

        base_matches = list(Participant.objects.filter(
            Q(name__icontains=q) |
            Q(summit_id__icontains=q) |
            Q(email__icontains=q) |
            Q(mobile__icontains=q)
        ).order_by('name')[:50])

        results = base_matches
        matched_ids = {p.id for p in base_matches}

        # Expand email duplicates for group registrations, but do NOT bridge
        # across mobile numbers (which causes unrelated attendees to be grouped),
        # and do not expand email siblings if the user is explicitly searching a phone number.
        is_phone_query = q.replace('+', '').replace('-', '').replace(' ', '').isdigit()

        if not is_phone_query:
            matched_emails = {
                p.email.strip().lower()
                for p in base_matches
                if p.email and '@' in p.email and p.email.strip()
            }
            if matched_emails:
                sibling_query = Q()
                for email in matched_emails:
                    sibling_query |= Q(email__iexact=email)

                siblings = Participant.objects.filter(sibling_query).exclude(
                    id__in=matched_ids
                ).order_by('name')
                results = results + list(siblings)

        serializer = self.get_serializer(results, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def fast_checkin(self, request):
        """
        Fast lookup and check-in for Day 1, Day 2, or Both Days by participant_id, Summit ID, email, mobile, or QR scan.
        Payload: { "participant_id": 123, "day": "1" | "2" } or { "query": "...", "day": "1" | "2" }
        """
        participant_id = request.data.get('participant_id')
        query = request.data.get('query', '').strip()
        day = str(request.data.get('day', '1')).strip()

        participant = None
        if participant_id:
            participant = Participant.objects.filter(id=participant_id).first()
        elif query:
            exact_matches = Participant.objects.filter(
                Q(summit_id__iexact=query) |
                Q(email__iexact=query) |
                Q(mobile__iexact=query)
            )

            if exact_matches.count() > 1:
                # Duplicate emails/mobiles: never guess the attendee, return all matches.
                return Response({
                    'error': f"Multiple participants found matching '{query}'. Please select from suggestions.",
                    'matches': self.get_serializer(exact_matches, many=True).data,
                }, status=status.HTTP_400_BAD_REQUEST)

            participant = exact_matches.first()

            if not participant:
                # Fuzzy match by name if only 1 match
                fuzzy_matches = Participant.objects.filter(name__icontains=query)
                if fuzzy_matches.count() == 1:
                    participant = fuzzy_matches.first()
                elif fuzzy_matches.count() > 1:
                    return Response({
                        'error': f"Multiple participants found matching '{query}'. Please select from suggestions.",
                        'matches': self.get_serializer(fuzzy_matches[:10], many=True).data,
                    }, status=status.HTTP_400_BAD_REQUEST)
        else:
            return Response({'error': 'Please provide a Participant ID or search query.'}, status=status.HTTP_400_BAD_REQUEST)

        if not participant:
            return Response({'error': f"No participant found matching '{query or participant_id}'."}, status=status.HTTP_404_NOT_FOUND)

        now = timezone.now()
        already_checked_in = False

        if day == '2':
            already_checked_in = participant.day2_checked_in
            checked_time = participant.day2_checked_in_at or now
            participant.day2_checked_in = True
            participant.day2_checked_in_at = checked_time
            if already_checked_in:
                msg = f"{participant.name} was already checked in for Day 2."
            else:
                msg = f"{participant.name} ({participant.summit_id}) checked in for Day 2!"
        elif day == 'both':
            already_checked_in = participant.day1_checked_in and participant.day2_checked_in
            participant.day1_checked_in = True
            participant.day1_checked_in_at = participant.day1_checked_in_at or now
            participant.day2_checked_in = True
            participant.day2_checked_in_at = participant.day2_checked_in_at or now
            if already_checked_in:
                msg = f"{participant.name} was already checked in for Both Days."
            else:
                msg = f"{participant.name} ({participant.summit_id}) checked in for Both Days!"
        else:
            already_checked_in = participant.day1_checked_in
            checked_time = participant.day1_checked_in_at or now
            participant.day1_checked_in = True
            participant.day1_checked_in_at = checked_time
            if already_checked_in:
                msg = f"{participant.name} was already checked in for Day 1."
            else:
                msg = f"{participant.name} ({participant.summit_id}) checked in for Day 1!"

        participant.save()
        serializer = self.get_serializer(participant)

        return Response({
            'already_checked_in': already_checked_in,
            'message': msg,
            'day': day,
            'participant': serializer.data
        })

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """
        Overview analytics for dashboard KPI cards, Guest Types, Sessions, and Day-wise Check-ins.
        """
        total = Participant.objects.count()
        checked_in = Participant.objects.filter(status='CHECKED_IN').count()
        confirmed = Participant.objects.filter(status='CONFIRMED').count()
        maybe = Participant.objects.filter(status='MAYBE').count()
        cancelled = Participant.objects.filter(status='CANCELLED').count()

        guest_type_counts = Participant.objects.values('guest_type').annotate(count=Count('id')).order_by('-count')
        session_counts = Participant.objects.exclude(session='').values('session').annotate(count=Count('id')).order_by('-count')
        confirmation_counts = Participant.objects.values('confirmation').annotate(count=Count('id')).order_by('-count')

        # Overall check-in rate percentage
        check_in_rate = round((checked_in / total * 100), 1) if total > 0 else 0

        # Detailed Session & Day Attendance Breakdown
        day1_total = Participant.objects.filter(Q(day1_session1=True) | Q(day1_session2=True)).count()
        day2_total = Participant.objects.filter(Q(day2_session1=True) | Q(day2_session2=True)).count()
        both_days_total = Participant.objects.filter(
            Q(day1_session1=True) | Q(day1_session2=True)
        ).filter(
            Q(day2_session1=True) | Q(day2_session2=True)
        ).count()

        d1_s1 = Participant.objects.filter(day1_session1=True).count()
        d1_s2 = Participant.objects.filter(day1_session2=True).count()
        d2_s1 = Participant.objects.filter(day2_session1=True).count()
        d2_s2 = Participant.objects.filter(day2_session2=True).count()

        # Day-wise check-in counts
        d1_checked_in = Participant.objects.filter(day1_checked_in=True).count()
        d2_checked_in = Participant.objects.filter(day2_checked_in=True).count()
        both_checked_in = Participant.objects.filter(day1_checked_in=True, day2_checked_in=True).count()

        def calc_pct(c, base=total):
            return round((c / base * 100), 1) if base > 0 else 0

        session_insights = {
            'day1': {
                'total': day1_total,
                'pct': calc_pct(day1_total),
                'checked_in': d1_checked_in,
                'checkin_rate': calc_pct(d1_checked_in, base=day1_total),
                'session1': {'count': d1_s1, 'pct': calc_pct(d1_s1)},
                'session2': {'count': d1_s2, 'pct': calc_pct(d1_s2)},
            },
            'day2': {
                'total': day2_total,
                'pct': calc_pct(day2_total),
                'checked_in': d2_checked_in,
                'checkin_rate': calc_pct(d2_checked_in, base=day2_total),
                'session1': {'count': d2_s1, 'pct': calc_pct(d2_s1)},
                'session2': {'count': d2_s2, 'pct': calc_pct(d2_s2)},
            },
            'both_days': {
                'total': both_days_total,
                'pct': calc_pct(both_days_total),
                'checked_in': both_checked_in,
            },
            'checkin_summary': {
                'day1_checked_in': d1_checked_in,
                'day1_rate': calc_pct(d1_checked_in, base=day1_total),
                'day2_checked_in': d2_checked_in,
                'day2_rate': calc_pct(d2_checked_in, base=day2_total),
                'both_checked_in': both_checked_in,
            },
            'sessions_breakdown': [
                {'code': 'D1S1', 'label': 'Day 1 - Session 1', 'day': 1, 'session': 1, 'count': d1_s1, 'pct': calc_pct(d1_s1)},
                {'code': 'D1S2', 'label': 'Day 1 - Session 2', 'day': 1, 'session': 2, 'count': d1_s2, 'pct': calc_pct(d1_s2)},
                {'code': 'D2S1', 'label': 'Day 2 - Session 1', 'day': 2, 'session': 1, 'count': d2_s1, 'pct': calc_pct(d2_s1)},
                {'code': 'D2S2', 'label': 'Day 2 - Session 2', 'day': 2, 'session': 2, 'count': d2_s2, 'pct': calc_pct(d2_s2)},
            ]
        }

        # VIP and Keynote Speaker Protocol List
        protocol_types = ['VIP', 'Speaker', 'Guest', 'Organizer / Crew']
        vip_qs = Participant.objects.filter(guest_type__in=protocol_types).order_by('guest_type', 'name')
        vip_list = []
        for p in vip_qs:
            vip_list.append({
                'id': p.id,
                'name': p.name,
                'email': p.email,
                'mobile': p.mobile,
                'guest_type': p.guest_type,
                'summit_id': p.summit_id,
                'day1_checked_in': p.day1_checked_in,
                'day1_checked_in_at': p.day1_checked_in_at.isoformat() if p.day1_checked_in_at else None,
                'day2_checked_in': p.day2_checked_in,
                'day2_checked_in_at': p.day2_checked_in_at.isoformat() if p.day2_checked_in_at else None,
                'attends_day1': p.attends_day1,
                'attends_day2': p.attends_day2,
            })
        vip_summary = {
            'total': len(vip_list),
            'day1_arrived': sum(1 for v in vip_list if v['day1_checked_in']),
            'day2_arrived': sum(1 for v in vip_list if v['day2_checked_in']),
            'list': vip_list,
        }

        # Hall capacities & seat utilization monitoring
        hall_capacities = [
            {'code': 'D1S1', 'title': 'Day 1 Session 1 (Opening Plenary)', 'hall': 'Main Auditorium', 'capacity': 450, 'registered': d1_s1, 'checked_in': d1_checked_in, 'utilization': round((d1_checked_in / 450 * 100), 1) if d1_checked_in else 0},
            {'code': 'D1S2', 'title': 'Day 1 Session 2 (Technical Breakouts)', 'hall': 'Hall B & Breakouts', 'capacity': 400, 'registered': d1_s2, 'checked_in': d1_checked_in, 'utilization': round((d1_checked_in / 400 * 100), 1) if d1_checked_in else 0},
            {'code': 'D2S1', 'title': 'Day 2 Session 1 (Panels & Strategic Dialogue)', 'hall': 'Main Auditorium', 'capacity': 450, 'registered': d2_s1, 'checked_in': d2_checked_in, 'utilization': round((d2_checked_in / 450 * 100), 1) if d2_checked_in else 0},
            {'code': 'D2S2', 'title': 'Day 2 Session 2 (Closing Communiqué)', 'hall': 'Grand Ballroom', 'capacity': 450, 'registered': d2_s2, 'checked_in': d2_checked_in, 'utilization': round((d2_checked_in / 450 * 100), 1) if d2_checked_in else 0},
        ]

        # Recent 5 check-ins
        recent_checkins = Participant.objects.filter(status='CHECKED_IN').order_by('-checked_in_at')[:5]
        recent_serializer = ParticipantSerializer(recent_checkins, many=True)

        return Response({
            'total': total,
            'checked_in': checked_in,
            'day1_checked_in': d1_checked_in,
            'day2_checked_in': d2_checked_in,
            'day1_total': day1_total,
            'day2_total': day2_total,
            'both_checked_in': both_checked_in,
            'confirmed': confirmed,
            'maybe': maybe,
            'cancelled': cancelled,
            'check_in_rate': check_in_rate,
            'guest_types': list(guest_type_counts),
            'sessions': list(session_counts),
            'session_insights': session_insights,
            'vip_protocol': vip_summary,
            'hall_capacities': hall_capacities,
            'confirmations': list(confirmation_counts),
            'recent_checkins': recent_serializer.data,
        })

    @action(detail=False, methods=['get'])
    def export_csv(self, request):
        """
        Export filtered participants roster to CSV download. (Admin only)
        """
        # Check permissions: Admin or Registration Host
        if not (getattr(request.user, 'is_admin_role', False) or getattr(request.user, 'is_registration_host', False)):
            return Response({'error': 'Exporting full roster reports requires Admin or Registration Host privileges.'}, status=status.HTTP_403_FORBIDDEN)

        queryset = self.get_queryset()
        response = HttpResponse(content_type='text/csv; charset=utf-8')
        response['Content-Disposition'] = f'attachment; filename="childcare_summit_participants_{timezone.now().strftime("%Y%m%d_%H%M%S")}.csv"'

        writer = csv.writer(response)
        writer.writerow([
            'Summit ID', 'Guest Type', 'Time of Registration', 'Name',
            'Email', 'Mobile', 'Confirmation', 'Day 1 S1', 'Day 1 S2',
            'Day 2 S1', 'Day 2 S2', 'Raw Sessions',
            'Day 1 Checked In', 'Day 1 Check-In Time',
            'Day 2 Checked In', 'Day 2 Check-In Time',
            'Overall Status', 'Notes'
        ])

        for p in queryset:
            writer.writerow([
                p.summit_id,
                p.guest_type,
                p.registration_time,
                p.name,
                p.email,
                p.mobile,
                p.confirmation,
                'Yes' if p.day1_session1 else 'No',
                'Yes' if p.day1_session2 else 'No',
                'Yes' if p.day2_session1 else 'No',
                'Yes' if p.day2_session2 else 'No',
                p.session,
                'Yes' if p.day1_checked_in else 'No',
                p.day1_checked_in_at.strftime("%Y-%m-%d %H:%M:%S") if p.day1_checked_in_at else '',
                'Yes' if p.day2_checked_in else 'No',
                p.day2_checked_in_at.strftime("%Y-%m-%d %H:%M:%S") if p.day2_checked_in_at else '',
                p.get_status_display(),
                p.notes,
            ])

        return response

    @action(detail=False, methods=['get'])
    def export_checkin_csv(self, request):
        """
        Specialized export for On-Site Check-in Data. (Admin only)
        Filterable by Day: ?day=1 or ?day=2 or ?day=both or ?day=all
        Filterable by Checked-in status: ?only_checked_in=true
        """
        # Check permissions: Admin or Registration Host
        if not (getattr(request.user, 'is_admin_role', False) or getattr(request.user, 'is_registration_host', False)):
            return Response({'error': 'Exporting check-in reports requires Admin or Registration Host privileges.'}, status=status.HTTP_403_FORBIDDEN)

        day_param = request.query_params.get('day', 'all').lower()
        if day_param in ('undefined', 'null'):
            day_param = 'all'

        only_checked_in = request.query_params.get('only_checked_in', 'false').lower() in ('true', '1', 'yes')

        queryset = self.get_queryset()

        if day_param == '1':
            if only_checked_in:
                queryset = queryset.filter(day1_checked_in=True)
            else:
                queryset = queryset.filter(Q(day1_session1=True) | Q(day1_session2=True))
            filename = f"summit_day1_checkin_report_{timezone.now().strftime('%Y%m%d_%H%M%S')}.csv"
        elif day_param == '2':
            if only_checked_in:
                queryset = queryset.filter(day2_checked_in=True)
            else:
                queryset = queryset.filter(Q(day2_session1=True) | Q(day2_session2=True))
            filename = f"summit_day2_checkin_report_{timezone.now().strftime('%Y%m%d_%H%M%S')}.csv"
        elif day_param == 'both':
            if only_checked_in:
                queryset = queryset.filter(day1_checked_in=True, day2_checked_in=True)
            else:
                queryset = queryset.filter(
                    Q(day1_session1=True) | Q(day1_session2=True)
                ).filter(
                    Q(day2_session1=True) | Q(day2_session2=True)
                )
            filename = f"summit_both_days_checkin_report_{timezone.now().strftime('%Y%m%d_%H%M%S')}.csv"
        else:
            if only_checked_in:
                queryset = queryset.filter(Q(day1_checked_in=True) | Q(day2_checked_in=True))
            filename = f"summit_all_checkins_report_{timezone.now().strftime('%Y%m%d_%H%M%S')}.csv"

        response = HttpResponse(content_type='text/csv; charset=utf-8')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'

        writer = csv.writer(response)
        writer.writerow([
            'Summit ID', 'Name', 'Email', 'Mobile', 'Guest Type',
            'Registered Sessions',
            'Day 1 Registered', 'Day 1 Checked In', 'Day 1 Check-In Timestamp',
            'Day 2 Registered', 'Day 2 Checked In', 'Day 2 Check-In Timestamp',
            'Overall Status', 'Notes'
        ])

        for p in queryset:
            writer.writerow([
                p.summit_id,
                p.name,
                p.email,
                p.mobile,
                p.guest_type,
                p.session,
                'Yes' if p.attends_day1 else 'No',
                'Yes' if p.day1_checked_in else 'No',
                p.day1_checked_in_at.strftime("%Y-%m-%d %H:%M:%S") if p.day1_checked_in_at else '',
                'Yes' if p.attends_day2 else 'No',
                'Yes' if p.day2_checked_in else 'No',
                p.day2_checked_in_at.strftime("%Y-%m-%d %H:%M:%S") if p.day2_checked_in_at else '',
                p.get_status_display(),
                p.notes,
            ])

        return response


class GoogleSheetConfigView(APIView):
    """
    Get or update Google Sheet configuration (Sheet URL, tab, mapping).
    """
    permission_classes = [permissions.IsAuthenticated, IsAdminUserOnly]

    def get(self, request):
        config = GoogleSheetConfig.get_default_config()
        serializer = GoogleSheetConfigSerializer(config)
        return Response(serializer.data)

    def patch(self, request):
        config = GoogleSheetConfig.get_default_config()
        serializer = GoogleSheetConfigSerializer(config, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class TriggerSyncView(APIView):
    """
    Triggers immediate synchronization from Google Sheet or loads sample registration data.
    """
    permission_classes = [permissions.IsAuthenticated, IsAdminUserOnly]

    def post(self, request):
        use_sample = request.data.get('use_sample', False)
        custom_sheet_url = request.data.get('sheet_url_or_id')

        config = GoogleSheetConfig.get_default_config()
        if custom_sheet_url:
            config.sheet_url_or_id = custom_sheet_url
            config.save()

        try:
            result = execute_google_sheet_sync(
                use_sample_if_empty=use_sample or not bool(config.sheet_url_or_id),
                triggered_by=request.user.username
            )
            return Response({
                'success': True,
                'result': result,
                'message': result.get('message', 'Sync completed successfully.')
            })
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e),
                'message': f"Sync failed: {str(e)}"
            }, status=status.HTTP_400_BAD_REQUEST)


class SyncHistoryListView(APIView):
    """
    Returns sync logs and history.
    """
    permission_classes = [permissions.IsAuthenticated, IsAdminUserOnly]

    def get(self, request):
        history = SyncHistory.objects.all().order_by('-started_at')[:20]
        serializer = SyncHistorySerializer(history, many=True)
        return Response(serializer.data)


class InvitedGuestViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for the Invited Guests reference list.
    Supports search, cohort/session filtering, registration status filter,
    live Google Sheet sync, analytics stats, and CSV export (Admin only).
    Also provides a fast autocomplete lookup action for on-site registration (Admin & Host).
    """
    queryset = InvitedGuest.objects.all()
    serializer_class = InvitedGuestSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminUserOnly]

    def get_permissions(self):
        if self.action == 'lookup':
            return [permissions.IsAuthenticated(), IsRegistrationHostOrAdmin()]
        return [permissions.IsAuthenticated(), IsAdminUserOnly()]

    @action(detail=False, methods=['get'])
    def lookup(self, request):
        """
        Fast typeahead search lookup on the invited guests roster for on-site registration autofill.
        Searches Name, Email, and Phone number.
        Accessible by both Registration Hosts and Admins.
        """
        q = request.query_params.get('q', '').strip()
        if not q or len(q) < 2:
            return Response([])

        subq_email = Participant.objects.filter(
            Q(email__iexact=OuterRef('email')) & ~Q(email='')
        )
        subq_name = Participant.objects.filter(
            Q(name__iexact=OuterRef('name')) & ~Q(name='')
        )

        matches = list(
            InvitedGuest.objects.annotate(
                is_reg_email=Exists(subq_email),
                is_reg_name=Exists(subq_name),
            )
            .filter(
                Q(name__icontains=q) |
                Q(email__icontains=q) |
                Q(number__icontains=q)
            )
            .order_by('name')[:15]
        )

        self._attach_participant_details(matches)
        serializer = self.get_serializer(matches, many=True)
        return Response(serializer.data)

    def get_annotated_queryset(self):
        subq_email = Participant.objects.filter(
            Q(email__iexact=OuterRef('email')) & ~Q(email='')
        )
        subq_name = Participant.objects.filter(
            Q(name__iexact=OuterRef('name')) & ~Q(name='')
        )
        return InvitedGuest.objects.annotate(
            is_reg_email=Exists(subq_email),
            is_reg_name=Exists(subq_name)
        )

    def get_queryset(self):
        qs = self.get_annotated_queryset()

        search = self.request.query_params.get('search', '').strip()
        cohort = self.request.query_params.get('cohort', '').strip()
        session = self.request.query_params.get('session', '').strip()
        status_param = self.request.query_params.get('registration_status', '').strip().upper()

        if search:
            qs = qs.filter(
                Q(name__icontains=search) |
                Q(email__icontains=search) |
                Q(number__icontains=search) |
                Q(cohort__icontains=search)
            )

        if cohort and cohort != 'ALL':
            qs = qs.filter(cohort=cohort)

        if session and session != 'ALL':
            qs = qs.filter(session=session)

        if status_param == 'REGISTERED':
            qs = qs.filter(Q(is_reg_email=True) | Q(is_reg_name=True))
        elif status_param == 'NOT_REGISTERED':
            qs = qs.filter(is_reg_email=False, is_reg_name=False)

        sort_by = self.request.query_params.get('sort_by', 'id')
        return qs.order_by(sort_by)

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())

        page = self.paginate_queryset(queryset)
        items = list(page) if page is not None else list(queryset)

        self._attach_participant_details(items)

        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(items, many=True)
        return Response(serializer.data)

    def _attach_participant_details(self, items):
        if not items:
            return

        emails = {item.email.strip().lower() for item in items if item.email}
        names = {item.name.strip().lower() for item in items if item.name}

        participants = Participant.objects.filter(
            Q(email__in=emails) | Q(name__in=names)
        )
        email_map = {p.email.strip().lower(): p for p in participants if p.email}
        name_map = {p.name.strip().lower(): p for p in participants if p.name}

        for item in items:
            e = item.email.strip().lower() if item.email else ''
            n = item.name.strip().lower() if item.name else ''
            p = email_map.get(e) or name_map.get(n)
            if p:
                item.is_registered = True
                item.registered_summit_id = p.summit_id
                item.registered_status = p.status
                item.registered_guest_type = p.guest_type
                item.day1_checked_in = p.day1_checked_in
                item.day2_checked_in = p.day2_checked_in
            else:
                item.is_registered = False
                item.registered_summit_id = None
                item.registered_status = None
                item.registered_guest_type = None
                item.day1_checked_in = False
                item.day2_checked_in = False

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """
        Summary analytics for the invited guests list.
        """
        qs = self.get_annotated_queryset()
        total_invited = qs.count()

        registered_qs = qs.filter(Q(is_reg_email=True) | Q(is_reg_name=True))
        total_registered = registered_qs.count()
        total_not_registered = total_invited - total_registered

        rate = round((total_registered / total_invited) * 100, 1) if total_invited > 0 else 0

        cohort_counts = (
            InvitedGuest.objects.exclude(cohort='')
            .values('cohort')
            .annotate(count=Count('id'))
            .order_by('-count')[:25]
        )

        session_counts = (
            InvitedGuest.objects.exclude(session='')
            .values('session')
            .annotate(count=Count('id'))
            .order_by('-count')
        )

        config = InvitedGuestConfig.get_config()
        config_serializer = InvitedGuestConfigSerializer(config)

        return Response({
            'total_invited': total_invited,
            'total_registered': total_registered,
            'total_not_registered': total_not_registered,
            'registration_rate': rate,
            'cohorts': list(cohort_counts),
            'sessions': list(session_counts),
            'config': config_serializer.data,
        })

    @action(detail=False, methods=['post'])
    def sync_sheet(self, request):
        """
        Trigger sync with the invited guests Google Sheet.
        """
        sheet_url = request.data.get('sheet_url')
        try:
            result = sync_invited_guests_from_sheet(sheet_url=sheet_url)
            return Response(result, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'])
    def export_csv(self, request):
        """
        Export filtered invited guests list to CSV download.
        """
        queryset = self.filter_queryset(self.get_queryset())
        items = list(queryset)
        self._attach_participant_details(items)

        response = HttpResponse(content_type='text/csv; charset=utf-8')
        response['Content-Disposition'] = f'attachment; filename="invited_guests_{timezone.now().strftime("%Y%m%d_%H%M%S")}.csv"'

        writer = csv.writer(response)
        writer.writerow([
            'Invited Name', 'Email', 'Mobile', 'Co-hort', 'Invited Session',
            'Registered?', 'Summit ID', 'Registration Status', 'Guest Type',
            'Day 1 Checked In', 'Day 2 Checked In'
        ])

        for g in items:
            writer.writerow([
                g.name,
                g.email,
                g.number,
                g.cohort,
                g.session,
                'Yes' if getattr(g, 'is_registered', False) else 'No',
                getattr(g, 'registered_summit_id', '') or '',
                getattr(g, 'registered_status', '') or '',
                getattr(g, 'registered_guest_type', '') or '',
                'Yes' if getattr(g, 'day1_checked_in', False) else 'No',
                'Yes' if getattr(g, 'day2_checked_in', False) else 'No',
            ])

        return response
