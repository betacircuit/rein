-- Preserve the legacy enum fields while storing the exact student-facing selections.
alter table public.students
  add column if not exists tutoring_track text,
  add column if not exists subject_detail text,
  add column if not exists subject_custom text;

alter table public.students
  drop constraint if exists students_tutoring_track_allowed,
  add constraint students_tutoring_track_allowed check (
    tutoring_track is null or tutoring_track in ('csat', 'school_exam', 'school_record')
  ),
  drop constraint if exists students_subject_detail_allowed,
  add constraint students_subject_detail_allowed check (
    subject_detail is null or subject_detail in (
      'probability_statistics', 'calculus', 'physics_1', 'chemistry_1', 'custom', 'none'
    )
  );
