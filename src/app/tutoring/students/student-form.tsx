"use client";

import { LoaderCircle, Save } from "lucide-react";
import { useActionState, useEffect, useRef, useState, type ReactNode } from "react";

import { saveRemoteStudentAction, type StudentActionState } from "@/app/tutoring/students/actions";
import { Button } from "@/components/ui/button";
import type { RemoteSchedule, RemoteStudent } from "@/lib/tutoring/remote-repository";

const initialState: StudentActionState = { status: "idle" };
const fieldClass =
  "mt-2 min-h-12 w-full border-2 border-black bg-white px-3 text-base font-bold outline-none";

function Group({ code, title, children }: { code: string; title: string; children: ReactNode }) {
  return (
    <fieldset className="border-2 border-black bg-[var(--surface)] p-5 shadow-[6px_6px_0_#343146] sm:p-6">
      <legend className="border-2 border-black bg-[var(--cyan)] px-3 py-1 text-xs font-black tracking-[0.1em]">
        {code} / {title}
      </legend>
      <div className="grid gap-5 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

function Field({
  label,
  name,
  value,
  type = "text",
  required,
  className = "",
}: {
  label: string;
  name: string;
  value?: string | number | null | undefined;
  type?: string | undefined;
  required?: boolean | undefined;
  className?: string | undefined;
}) {
  return (
    <label className={`text-sm font-bold ${className}`} htmlFor={name}>
      {label}
      <input
        className={fieldClass}
        defaultValue={value ?? ""}
        id={name}
        name={name}
        required={required}
        type={type}
      />
    </label>
  );
}

function Area({
  label,
  name,
  value,
  hint,
}: {
  label: string;
  name: string;
  value?: string | null | undefined;
  hint?: string | undefined;
}) {
  return (
    <label className="text-sm font-bold sm:col-span-2" htmlFor={name}>
      {label}
      {hint && <span className="ml-2 text-xs font-normal text-[var(--muted-ink)]">{hint}</span>}
      <textarea
        className={`${fieldClass} min-h-28 py-3 leading-6`}
        defaultValue={value ?? ""}
        id={name}
        name={name}
      />
    </label>
  );
}

export function StudentForm({
  student,
  schedule,
}: {
  student?: RemoteStudent;
  schedule?: RemoteSchedule | undefined;
}) {
  const [state, action, pending] = useActionState(saveRemoteStudentAction, initialState);
  const [track, setTrack] = useState(
    student?.tutoringTrack ??
      (student?.tutoringType === "school_record" ? "school_record" : "csat"),
  );
  const [subjectCategory, setSubjectCategory] = useState(
    student?.subjectDetail ??
      (student?.subject === "physics"
        ? "physics_1"
        : student?.subject === "chemistry"
          ? "chemistry_1"
          : "probability_statistics"),
  );
  const [sourceKind, setSourceKind] = useState(
    student?.sourceChannel === "김과외"
      ? "kimstudy"
      : student?.sourceChannel === "지인"
        ? "referral"
        : student?.sourceChannel
          ? "direct"
          : "kimstudy",
  );
  const type = track === "school_record" ? "school_record" : "subject";
  const [mode, setMode] = useState(student?.defaultMode ?? "online");
  const firstError = Object.values(state.errors ?? {}).flat()[0];
  const scheduleWeekdayError = state.errors?.scheduleWeekday?.[0];
  const scheduleStartTimeError = state.errors?.scheduleStartTime?.[0];
  const errorSummaryRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (state.status === "error") errorSummaryRef.current?.focus();
  }, [state]);

  return (
    <form action={action} className="space-y-7">
      {student && <input name="studentId" type="hidden" value={student.id} />}
      {schedule && <input name="scheduleId" type="hidden" value={schedule.id} />}
      {state.status === "error" && (
        <p
          className="border-2 border-black bg-[var(--danger-wash)] p-4 text-sm font-black shadow-[4px_4px_0_#343146]"
          ref={errorSummaryRef}
          role="alert"
          tabIndex={-1}
        >
          {state.message ?? firstError}
        </p>
      )}

      <Group code="01" title="기본 정보">
        <Field label="학생 이름 *" name="name" required value={student?.name} />
        <label className="text-sm font-bold" htmlFor="consultationStatus">
          관리 상태
          <select
            aria-describedby={`schedule-time-hint${scheduleWeekdayError ? " schedule-weekday-error" : ""}`}
            aria-invalid={Boolean(scheduleWeekdayError)}
            className={fieldClass}
            defaultValue={student?.consultationStatus ?? "consulting"}
            id="consultationStatus"
            name="consultationStatus"
          >
            <option value="consulting">상담 중</option>
            <option value="active">수업 중</option>
            <option value="paused">일시 중단</option>
            <option value="ended">종료</option>
          </select>
        </label>
        <Field label="학교" name="schoolName" value={student?.schoolName} />
        <label className="text-sm font-bold" htmlFor="schoolLevel">
          학교급
          <select
            className={fieldClass}
            defaultValue={student?.schoolLevel ?? ""}
            id="schoolLevel"
            name="schoolLevel"
          >
            <option value="">선택 안 함</option>
            <option value="초등">초등</option>
            <option value="중등">중등</option>
            <option value="고등">고등</option>
            <option value="재수/N수">재수/N수</option>
            <option value="대학">대학</option>
            <option value="성인">성인</option>
          </select>
        </label>
        <label className="text-sm font-bold" htmlFor="grade">
          학년
          <select
            className={fieldClass}
            defaultValue={student?.grade ?? ""}
            id="grade"
            name="grade"
          >
            <option value="">선택 안 함</option>
            <option value="1">1학년</option>
            <option value="2">2학년</option>
            <option value="3">3학년</option>
          </select>
        </label>
        <label className="text-sm font-bold" htmlFor="sourceKind">
          유입 경로
          <select
            className={fieldClass}
            id="sourceKind"
            onChange={(event) => setSourceKind(event.target.value)}
            value={sourceKind}
          >
            <option value="kimstudy">김과외</option>
            <option value="referral">지인</option>
            <option value="direct">직접 입력</option>
          </select>
        </label>
        {sourceKind === "direct" ? (
          <Field label="직접 입력 경로" name="sourceChannel" value={student?.sourceChannel} />
        ) : (
          <input
            name="sourceChannel"
            type="hidden"
            value={sourceKind === "kimstudy" ? "김과외" : "지인"}
          />
        )}
        <Field
          label="최초 상담일"
          name="firstConsultedOn"
          type="date"
          value={student?.firstConsultedOn}
        />
        <Field label="수업 시작일" name="startedOn" type="date" value={student?.startedOn} />
      </Group>

      <Group code="02" title="연락처 · 보호자">
        <Field label="학생 연락처" name="studentPhone" type="tel" value={student?.studentPhone} />
        <Field label="보호자 이름" name="guardianName" value={student?.guardianName} />
        <Field
          label="보호자 연락처"
          name="guardianPhone"
          type="tel"
          value={student?.guardianPhone}
        />
        <Field label="학생과의 관계" name="guardianRelation" value={student?.guardianRelation} />
      </Group>

      <Group code="03" title="수업 설정">
        <label className="text-sm font-bold" htmlFor="tutoringTrack">
          과외 유형
          <select
            className={fieldClass}
            id="tutoringTrack"
            name="tutoringTrack"
            onChange={(event) => setTrack(event.target.value as typeof track)}
            value={track}
          >
            <option value="csat">수능</option>
            <option value="school_exam">내신</option>
            <option value="school_record">생기부 · 입시</option>
          </select>
        </label>
        {type === "subject" ? (
          <label className="text-sm font-bold" htmlFor="subjectCategory">
            과목
            <select
              className={fieldClass}
              id="subjectCategory"
              name="subjectCategory"
              onChange={(event) => setSubjectCategory(event.target.value as typeof subjectCategory)}
              value={subjectCategory}
            >
              <option value="probability_statistics">확률과 통계</option>
              <option value="calculus">미적분</option>
              <option value="physics_1">물리 I</option>
              <option value="chemistry_1">화학 I</option>
              <option value="custom">직접 입력</option>
            </select>
          </label>
        ) : (
          <input name="subjectCategory" type="hidden" value="none" />
        )}
        {type === "subject" && subjectCategory === "custom" && (
          <Field
            label="직접 입력 과목 *"
            name="subjectCustom"
            required
            value={student?.subjectCustom}
          />
        )}
        <Field
          label="시급(원) *"
          name="hourlyRate"
          required
          type="number"
          value={student?.hourlyRate ?? 50000}
        />
        <Field
          label="1회 수업 시간(분) *"
          name="defaultDurationMinutes"
          required
          type="number"
          value={student?.defaultDurationMinutes ?? 120}
        />
        <label className="text-sm font-bold" htmlFor="scheduleWeekday">
          매주 과외 요일
          <select
            className={fieldClass}
            defaultValue={schedule?.weekday ?? ""}
            id="scheduleWeekday"
            name="scheduleWeekday"
          >
            <option value="">나중에 설정</option>
            <option value="1">월요일</option>
            <option value="2">화요일</option>
            <option value="3">수요일</option>
            <option value="4">목요일</option>
            <option value="5">금요일</option>
            <option value="6">토요일</option>
            <option value="0">일요일</option>
          </select>
          {scheduleWeekdayError && (
            <span
              className="mt-2 block text-xs text-[var(--danger-ink)]"
              id="schedule-weekday-error"
            >
              {scheduleWeekdayError}
            </span>
          )}
        </label>
        <label className="text-sm font-bold" htmlFor="scheduleStartTime">
          과외 시작 시각
          <input
            aria-describedby={`schedule-time-hint${scheduleStartTimeError ? " schedule-start-time-error" : ""}`}
            aria-invalid={Boolean(scheduleStartTimeError)}
            className={fieldClass}
            defaultValue={schedule?.startTime ?? ""}
            id="scheduleStartTime"
            name="scheduleStartTime"
            step="60"
            type="time"
          />
          {scheduleStartTimeError && (
            <span
              className="mt-2 block text-xs text-[var(--danger-ink)]"
              id="schedule-start-time-error"
            >
              {scheduleStartTimeError}
            </span>
          )}
        </label>
        <p
          className="text-xs font-bold text-[var(--muted-ink)] sm:col-span-2"
          id="schedule-time-hint"
        >
          요일과 시각을 함께 선택하면 오늘의 주 시간표에 바로 반영됩니다.
        </p>
        <label className="text-sm font-bold" htmlFor="defaultMode">
          수업 방식
          <select
            className={fieldClass}
            id="defaultMode"
            name="defaultMode"
            onChange={(event) => setMode(event.target.value as typeof mode)}
            value={mode}
          >
            <option value="online">화상</option>
            <option value="in_person">대면</option>
          </select>
        </label>
        {mode === "in_person" && (
          <Field
            label="기본 수업 장소 *"
            name="defaultLocation"
            required
            value={student?.defaultLocation}
          />
        )}
      </Group>

      <div className="scroll-mt-6" id="resources">
        <Group code="04" title="고정 링크">
          <Field
            label="고정 Google Meet 링크"
            name="manualMeetUrl"
            type="url"
            value={student?.manualMeetUrl}
          />
          <Field
            label="Google Sheets 링크"
            name="googleSheetUrl"
            type="url"
            value={student?.googleSheetUrl}
          />
        </Group>
      </div>

      <Group code="05" title="목표 · 현재 진단">
        <Field label="목표 학교" name="targetSchool" value={student?.targetSchool} />
        <Field label="목표 학과" name="targetMajor" value={student?.targetMajor} />
        <Area
          label="현재 수준"
          name="currentLevel"
          value={student?.currentLevel}
          hint="성적, 등급, 단원별 이해도"
        />
        <Area
          label="목표 수준"
          name="targetLevel"
          value={student?.targetLevel}
          hint="목표 등급과 도달 시점"
        />
        <Area label="학습 목표" name="learningGoal" value={student?.learningGoal} />
        <Area label="강점" name="strengths" value={student?.strengths} />
        <Area label="약점 · 보완점" name="weaknesses" value={student?.weaknesses} />
      </Group>
      <Group code="06" title="운영 기록">
        <Area label="커리큘럼 계획" name="curriculumPlan" value={student?.curriculumPlan} />
        <Area label="교재 · 자료" name="materials" value={student?.materials} />
        <Area label="과제 정책" name="homeworkPolicy" value={student?.homeworkPolicy} />
        <Area label="현재 지도 요약" name="progressSummary" value={student?.progressSummary} />
        <Area label="다음 목표" name="nextGoal" value={student?.nextGoal} />
        <Area
          label="내부 메모"
          name="notes"
          value={student?.notes}
          hint="학생에게 공유되지 않는 운영 메모"
        />
      </Group>
      <div className="sticky bottom-20 z-10 flex justify-end border-2 border-black bg-[var(--surface)] p-3 shadow-[5px_5px_0_#343146] lg:bottom-4">
        <Button disabled={pending} size="large" type="submit">
          {pending ? (
            <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
          ) : (
            <Save aria-hidden="true" className="size-4" />
          )}
          {pending ? "저장 중" : student ? "학생 정보 수정" : "학생 등록"}
        </Button>
      </div>
    </form>
  );
}
