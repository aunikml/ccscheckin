import os
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

User = get_user_model()

class Command(BaseCommand):
    help = "Creates default Administrator user from .env file if it does not exist."

    def handle(self, *args, **options):
        username = os.getenv('ADMIN_USERNAME', 'admin')
        email = os.getenv('ADMIN_EMAIL', 'admin@childcaresummit.org')
        password = os.getenv('ADMIN_PASSWORD', 'admin12345')

        user, created = User.objects.get_or_create(
            username=username,
            defaults={
                'email': email,
                'role': 'ADMIN',
                'is_staff': True,
                'is_superuser': True,
                'first_name': 'Summit',
                'last_name': 'Administrator',
            }
        )

        if created:
            user.set_password(password)
            user.save()
            self.stdout.write(self.style.SUCCESS(f"Successfully created admin user: '{username}' with password from .env."))
        else:
            # Ensure admin role and active status
            user.role = 'ADMIN'
            user.is_staff = True
            user.is_superuser = True
            user.set_password(password)
            user.save()
            self.stdout.write(self.style.WARNING(f"Admin user '{username}' already exists. Password & role updated from .env."))

