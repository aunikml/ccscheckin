from rest_framework import permissions

class IsAdminUserOnly(permissions.BasePermission):
    """
    Allows access only to authenticated users who have ADMIN role (or superuser).
    """
    message = "Access restricted: Administrator role required."

    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            getattr(request.user, 'is_admin_role', False)
        )


class IsRegistrationHostOrAdmin(permissions.BasePermission):
    """
    Allows access to Registration Hosts and Admins.
    """
    message = "Access restricted: Registration Host or Administrator role required."

    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            (getattr(request.user, 'is_registration_host', False) or getattr(request.user, 'is_admin_role', False))
        )


class ParticipantCustomPermission(permissions.BasePermission):
    """
    Role-based permissions for Participant operations:
    1. Admin: Full site access (CRUD, check-in, bulk operations, CSV exports).
    2. Registration Host: Can check in participants, view dashboard & participant list, add new participants, and update attendee details. Cannot delete or export CSVs.
    3. Viewer: Can view dashboard statistics only.
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False

        user = request.user
        action = getattr(view, 'action', '')

        # Dashboard analytics and recent arrivals: open to all authenticated roles (Admin, Registration Host, Viewer)
        if action in ('stats', 'recent_checkins'):
            return True

        # Viewer role has no access to participant directory, check-in, or creation
        if getattr(user, 'is_viewer', False) and not user.is_superuser:
            return False

        # Registration Host permissions
        if getattr(user, 'is_registration_host', False):
            # Allowed actions for Registration Host (Directory, Check-in, Updates, Reports)
            if action in (
                'list',
                'retrieve',
                'create',
                'toggle_day_checkin',
                'fast_checkin',
                'search_lookup',
                'toggle_checkin',
                'update',
                'partial_update',
                'export_csv',
                'export_checkin_csv',
            ):
                return True
            # Restricted: cannot destroy or run bulk destructive actions
            return False

        # Admin role has full access
        return getattr(user, 'is_admin_role', False)
