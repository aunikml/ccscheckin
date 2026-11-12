from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from django.contrib.auth import get_user_model
from .serializers import CustomTokenObtainPairSerializer, UserSerializer
from .permissions import IsAdminUserOnly

User = get_user_model()

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


class CurrentUserView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response({
            **serializer.data,
            'is_admin': request.user.is_admin_role,
            'is_registration_host': request.user.is_registration_host,
            'is_viewer': request.user.is_viewer,
        })


class UserViewSet(viewsets.ModelViewSet):
    """
    Full CRUD ViewSet for Summit User Management.
    Restricted strictly to Admin users only.
    """
    queryset = User.objects.all().order_by('-date_joined')
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminUserOnly]
    pagination_class = None

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        # Protect against self-deletion
        if instance.id == request.user.id:
            return Response(
                {'error': 'You cannot delete your own active administrator account.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        # Protect last admin from deletion
        if instance.role == 'ADMIN' and User.objects.filter(role='ADMIN').count() <= 1:
            return Response(
                {'error': 'Cannot delete the only remaining administrator account.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        return super().destroy(request, *args, **kwargs)

    @action(detail=False, methods=['get'])
    def roles(self, request):
        """
        Return the 3 summit roles with descriptions.
        """
        return Response([
            {
                'key': 'ADMIN',
                'label': 'Admin',
                'description': 'Full site access (Dashboard, Participant directory, Google Sheet sync, User Management CRUD)',
                'badge_color': '#50153f'
            },
            {
                'key': 'REGISTRATION_HOST',
                'label': 'Registration Host',
                'description': 'Can check in participants (D1/D2/Fast track), view dashboard & participant list, add new participants, and print badges',
                'badge_color': '#e85d26'
            },
            {
                'key': 'VIEWER',
                'label': 'Viewer',
                'description': 'Can view real-time summit dashboard analytics and headcounts only',
                'badge_color': '#2d82c6'
            },
        ])
