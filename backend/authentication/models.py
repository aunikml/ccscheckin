from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    ROLE_CHOICES = (
        ('ADMIN', 'Admin'),
        ('REGISTRATION_HOST', 'Registration Host'),
        ('VIEWER', 'Viewer'),
    )

    role = models.CharField(
        max_length=25,
        choices=ROLE_CHOICES,
        default='ADMIN',
        help_text='Role for Role-Based Access Control (RBAC)'
    )
    phone_number = models.CharField(max_length=30, blank=True)
    organization = models.CharField(max_length=150, blank=True)

    @property
    def is_admin_role(self):
        return self.role == 'ADMIN' or self.is_superuser or self.is_staff

    @property
    def is_registration_host(self):
        return self.role == 'REGISTRATION_HOST'

    @property
    def is_viewer(self):
        return self.role == 'VIEWER'

    def save(self, *args, **kwargs):
        # Admin users automatically have staff access to Django admin if needed
        if self.role == 'ADMIN':
            self.is_staff = True
        else:
            self.is_staff = False
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"
