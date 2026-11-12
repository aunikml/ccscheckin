import os
import re
import csv
import io
import requests
from datetime import datetime
from django.utils import timezone
from django.db import transaction
from .models import Participant, GoogleSheetConfig, SyncHistory

SAMPLE_CSV_PATH = os.path.join(os.path.dirname(__file__), 'sample_participants.csv')

def load_sample_csv_rows():
    """
    Loads participants from sample_participants.csv if it exists.
    """
    if os.path.exists(SAMPLE_CSV_PATH):
        try:
            with open(SAMPLE_CSV_PATH, mode='r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                return [row for row in reader]
        except Exception as e:
            print(f"Error reading sample CSV: {e}")
    
    # Fallback minimal sample data
    return [
        {
            "Guest Type": "General Participant",
            "Time of Registration": "12-Oct-2026",
            "Name": "Samiya Ummey Habiba",
            "Email": "bibasamiya@gmail.com",
            "Mobile": "+8801867880674",
            "Confirmation": "Yes",
            "Session": "Day 1 Session 1"
        },
        {
            "Guest Type": "General Participant",
            "Time of Registration": "12-Oct-2026",
            "Name": "Shakil Ahmed",
            "Email": "shakilahmed84@gmail.com",
            "Mobile": "01714111244",
            "Confirmation": "Yes",
            "Session": "Day 1 Session 1"
        },
        {
            "Guest Type": "Guest",
            "Time of Registration": "12-Oct-2026",
            "Name": "Ashraful Islam Efthi",
            "Email": "ashraful.efthi@teachforbangladesh.org",
            "Mobile": "01749657808",
            "Confirmation": "Yes",
            "Session": "Day 1 Session 2"
        }
    ]

def extract_sheet_id(url_or_id: str) -> str:
    """
    Extracts the Google Sheet ID from full URL or returns string if already an ID.
    """
    if not url_or_id:
        return ""
    url_or_id = url_or_id.strip()
    match = re.search(r'/spreadsheets/d/([a-zA-Z0-9-_]+)', url_or_id)
    if match:
        return match.group(1)
    return url_or_id

def fetch_sheet_csv_rows(sheet_id: str, tab_name: str = 'Form Responses 1'):
    """
    Fetches the published or public Google Sheet rows as CSV via Google Visualization CSV export.
    """
    encoded_tab = requests.utils.quote(tab_name)
    csv_url = f"https://docs.google.com/spreadsheets/d/{sheet_id}/gviz/tq?tqx=out:csv&sheet={encoded_tab}"
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) NationalChildCareSummitParticipantSystem/1.0'
    }
    response = requests.get(csv_url, headers=headers, timeout=15)
    response.raise_for_status()

    # Detect if Google redirected to a sign-in HTML page
    if "<!DOCTYPE html>" in response.text[:200] or "<html" in response.text[:200]:
        raise ValueError(
            "The Google Sheet is not accessible publicly. Please ensure 'General Access' is set to "
            "'Anyone with the link can view', or publish the sheet to the web (File > Share > Publish to web)."
        )

    csv_file = io.StringIO(response.text)
    reader = csv.DictReader(csv_file)
    rows = [row for row in reader]
    return rows

def sync_participants_from_rows(rows: list, config: GoogleSheetConfig, triggered_by: str = 'admin'):
    """
    Processes row dictionaries and upserts into Participant model based on the National Child Care Summit schema:
    - Guest Type
    - Time of Registration
    - Name
    - Email
    - Mobile
    - Confirmation
    - Session
    """
    sync_log = SyncHistory.objects.create(
        status='SUCCESS',
        triggered_by=triggered_by
    )

    mapping = config.column_mapping or {}
    normalized_mapping = {}
    for header, field in mapping.items():
        clean_key = re.sub(r'[^a-zA-Z0-9]', '', header).lower()
        # Canonicalize field names to Participant model fields
        if field in ('full_name', 'fullname', 'participant_name', 'attendee_name'):
            canonical_field = 'name'
        elif field in ('phone', 'phone_number', 'contact', 'contact_number'):
            canonical_field = 'mobile'
        elif field in ('category', 'role', 'participant_category'):
            canonical_field = 'guest_type'
        elif field in ('timestamp', 'google_form_timestamp', 'date'):
            canonical_field = 'registration_time'
        else:
            canonical_field = field
        normalized_mapping[clean_key] = canonical_field

    new_count = 0
    updated_count = 0
    error_count = 0
    details = []

    for idx, row in enumerate(rows, start=1):
        try:
            participant_data = {}
            for col_name, col_val in row.items():
                if not col_name:
                    continue
                col_clean = re.sub(r'[^a-zA-Z0-9]', '', col_name).lower()
                target_field = normalized_mapping.get(col_clean)

                # Automatic heuristic fallback matching
                if not target_field:
                    if 'email' in col_clean:
                        target_field = 'email'
                    elif 'name' in col_clean and 'emergency' not in col_clean and 'org' not in col_clean and 'company' not in col_clean:
                        target_field = 'name'
                    elif 'mobile' in col_clean or 'phone' in col_clean or 'contact' in col_clean:
                        target_field = 'mobile'
                    elif 'guest' in col_clean or 'category' in col_clean or 'role' in col_clean:
                        target_field = 'guest_type'
                    elif 'time' in col_clean or 'date' in col_clean or 'registration' in col_clean or 'timestamp' in col_clean:
                        target_field = 'registration_time'
                    elif 'confirm' in col_clean:
                        target_field = 'confirmation'
                    elif 'session' in col_clean:
                        target_field = 'session'

                if target_field and col_val is not None:
                    participant_data[target_field] = str(col_val).strip()

            email = participant_data.get('email', '').strip().lower()
            if not email or '@' not in email:
                # Direct check across row for any email format
                for k, v in row.items():
                    if k and '@' in str(v):
                        email = str(v).strip().lower()
                        break
                if not email or '@' not in email:
                    continue

            # Robust full name extraction
            name = (
                participant_data.get('name') or
                participant_data.get('full_name') or
                participant_data.get('fullname') or
                participant_data.get('participant_name') or
                ''
            ).strip()

            if not name:
                # Direct check across row keys for any column containing 'name'
                for k, v in row.items():
                    if not k:
                        continue
                    clean_k = re.sub(r'[^a-zA-Z0-9]', '', k).lower()
                    if clean_k in ('name', 'fullname', 'participantname', 'nameofparticipant', 'nameoftheparticipant', 'attendeename', 'yourname') or (
                        'name' in clean_k and 'emergency' not in clean_k and 'org' not in clean_k and 'company' not in clean_k and 'institute' not in clean_k
                    ):
                        if v and str(v).strip():
                            name = str(v).strip()
                            break

            # Separate first and last name columns fallback
            if not name:
                fn = (participant_data.get('first_name') or '').strip()
                ln = (participant_data.get('last_name') or '').strip()
                if fn or ln:
                    name = f"{fn} {ln}".strip()

            # Clean whitespace
            if name:
                name = re.sub(r'\s+', ' ', name).strip()
            else:
                name = email.split('@')[0].capitalize()

            # Robust mobile extraction
            mobile = (
                participant_data.get('mobile') or
                participant_data.get('phone') or
                participant_data.get('phone_number') or
                participant_data.get('contact') or
                participant_data.get('contact_number') or
                ''
            ).strip()

            if not mobile:
                for k, v in row.items():
                    if not k:
                        continue
                    clean_k = re.sub(r'[^a-zA-Z0-9]', '', k).lower()
                    if 'mobile' in clean_k or 'phone' in clean_k or 'contact' in clean_k:
                        if v and str(v).strip():
                            mobile = str(v).strip()
                            break

            guest_type = (
                participant_data.get('guest_type') or
                participant_data.get('category') or
                participant_data.get('role') or
                ''
            ).strip() or 'General Participant'

            reg_time = (
                participant_data.get('registration_time') or
                participant_data.get('google_form_timestamp') or
                participant_data.get('timestamp') or
                ''
            ).strip()

            confirmation = participant_data.get('confirmation', '').strip() or 'Yes'
            session = participant_data.get('session', '').strip()

            # Map confirmation string to status
            conf_lower = confirmation.lower()
            if conf_lower == 'no':
                status_val = 'CANCELLED'
            elif conf_lower == 'maybe':
                status_val = 'MAYBE'
            else:
                status_val = 'CONFIRMED'

            s_lower = session.lower()
            d1s1 = 'day 1 session 1' in s_lower or 'd1s1' in s_lower
            d1s2 = 'day 1 session 2' in s_lower or 'd1s2' in s_lower
            d2s1 = 'day 2 session 1' in s_lower or 'd2s1' in s_lower
            d2s2 = 'day 2 session 2' in s_lower or 'd2s2' in s_lower

            with transaction.atomic():
                participant, created = Participant.objects.get_or_create(
                    email=email,
                    defaults={
                        'name': name,
                        'mobile': mobile,
                        'guest_type': guest_type,
                        'registration_time': reg_time,
                        'confirmation': confirmation,
                        'session': session,
                        'day1_session1': d1s1,
                        'day1_session2': d1s2,
                        'day2_session1': d2s1,
                        'day2_session2': d2s2,
                        'status': status_val,
                    }
                )

                if created:
                    new_count += 1
                else:
                    # Update existing participant info
                    participant.name = name
                    if mobile:
                        participant.mobile = mobile
                    if guest_type:
                        participant.guest_type = guest_type
                    if reg_time:
                        participant.registration_time = reg_time
                    if confirmation:
                        participant.confirmation = confirmation
                        if participant.status != 'CHECKED_IN':
                            participant.status = status_val
                    if session:
                        participant.session = session
                        participant.day1_session1 = d1s1
                        participant.day1_session2 = d1s2
                        participant.day2_session1 = d2s1
                        participant.day2_session2 = d2s2
                    participant.save()
                    updated_count += 1

        except Exception as e:
            error_count += 1
            details.append(f"Row {idx} error: {str(e)}")

    sync_log.finished_at = timezone.now()
    sync_log.rows_processed = len(rows)
    sync_log.new_added = new_count
    sync_log.updated = updated_count
    sync_log.errors_count = error_count
    sync_log.status = 'SUCCESS' if error_count == 0 else ('PARTIAL' if new_count or updated_count else 'FAILED')
    sync_log.details = "\n".join(details) or f"Successfully synced {len(rows)} records."
    sync_log.save()

    # Update config
    config.last_synced_at = timezone.now()
    config.last_sync_status = sync_log.status
    config.last_sync_message = f"Processed {len(rows)} rows: {new_count} added, {updated_count} updated, {error_count} errors."
    config.save()

    return {
        'status': sync_log.status,
        'rows_processed': len(rows),
        'new_added': new_count,
        'updated': updated_count,
        'errors_count': error_count,
        'message': config.last_sync_message,
        'sync_id': sync_log.id
    }

def execute_google_sheet_sync(use_sample_if_empty: bool = True, triggered_by: str = 'admin'):
    """
    Main sync dispatcher. Checks .env and GoogleSheetConfig.
    If sheet ID is provided, fetches live Google Sheet.
    If not provided and use_sample_if_empty is True, imports summit registrations from sample_participants.csv.
    """
    config = GoogleSheetConfig.get_default_config()

    env_sheet_id = os.getenv('GOOGLE_SHEET_ID')
    sheet_input = config.sheet_url_or_id or env_sheet_id or ''
    tab_name = config.tab_name or os.getenv('GOOGLE_SHEET_TAB_NAME') or 'Form Responses 1'

    sheet_id = extract_sheet_id(sheet_input)

    if sheet_id:
        try:
            config.last_sync_status = 'RUNNING'
            config.save()
            rows = fetch_sheet_csv_rows(sheet_id, tab_name)
            return sync_participants_from_rows(rows, config, triggered_by=triggered_by)
        except Exception as e:
            config.last_sync_status = 'ERROR'
            config.last_sync_message = f"Failed to sync from Google Sheet: {str(e)}"
            config.save()
            SyncHistory.objects.create(
                status='FAILED',
                rows_processed=0,
                new_added=0,
                updated=0,
                errors_count=1,
                details=f"Connection/Fetch error: {str(e)}",
                triggered_by=triggered_by
            )
            raise e
    else:
        if use_sample_if_empty:
            rows = load_sample_csv_rows()
            return sync_participants_from_rows(rows, config, triggered_by=triggered_by)
        else:
            raise ValueError("No Google Sheet ID or URL configured in .env or Settings.")
