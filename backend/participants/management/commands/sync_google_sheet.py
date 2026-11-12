from django.core.management.base import BaseCommand
from participants.sheet_sync import execute_google_sheet_sync
from participants.models import GoogleSheetConfig

class Command(BaseCommand):
    help = "Pulls and synchronizes participant registration responses from Google Sheet."

    def add_arguments(self, parser):
        parser.add_argument('--sheet-url', type=str, help='Optional Google Sheet URL or ID')
        parser.add_argument('--sample', action='store_true', help='Use built-in summit sample data if no sheet configured')

    def handle(self, *args, **options):
        sheet_url = options.get('sheet_url')
        use_sample = options.get('sample', False)

        if sheet_url:
            config = GoogleSheetConfig.get_default_config()
            config.sheet_url_or_id = sheet_url
            config.save()
            self.stdout.write(f"Updated Google Sheet URL to: {sheet_url}")

        self.stdout.write("Starting participant synchronization...")
        try:
            res = execute_google_sheet_sync(use_sample_if_empty=use_sample, triggered_by='cli')
            self.stdout.write(self.style.SUCCESS(f"Sync complete: {res['message']} (Processed: {res['rows_processed']})"))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Sync failed: {str(e)}"))

