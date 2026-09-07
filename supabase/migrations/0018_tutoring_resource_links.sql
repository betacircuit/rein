-- Trusted Google Meet and Sheets links for tutoring operations.

alter table public.students
  drop constraint if exists students_mode_resource_shape;

alter table public.students
  add column if not exists google_sheet_url text,
  add constraint students_mode_resource_shape check (
    (
      default_mode = 'in_person'
      and nullif(trim(default_location), '') is not null
      and meet_strategy = 'none'
      and manual_meet_url is null
    )
    or (
      default_mode = 'online'
      and default_location is null
      and meet_strategy = 'google_generated'
      and manual_meet_url is null
    )
    or (
      default_mode = 'online'
      and default_location is null
      and meet_strategy = 'manual_reusable'
      and manual_meet_url ~* '^https://meet[.]google[.]com/[a-z]{3}-[a-z]{4}-[a-z]{3}/?$'
    )
  ),
  add constraint students_google_sheet_url_shape check (
    google_sheet_url is null
    or google_sheet_url ~* '^https://docs[.]google[.]com/spreadsheets/d/[a-z0-9_-]{10,}/edit(#gid=[0-9]+)?$'
  );
