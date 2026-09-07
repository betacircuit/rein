"use client";

import { Check, Copy, ExternalLink, FileSpreadsheet, Link2, Video } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { GOOGLE_MEET_NEW_URL } from "@/lib/tutoring/resource-links";

type ResourceStudent = {
  id: string;
  name: string;
  defaultMode: "online" | "in_person";
  manualMeetUrl: string | null;
  googleSheetUrl: string | null;
};

async function copyText(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const field = document.createElement("textarea");
  field.value = value;
  field.style.position = "fixed";
  field.style.opacity = "0";
  document.body.append(field);
  field.select();
  const copied = document.execCommand("copy");
  field.remove();
  if (!copied) throw new Error("copy failed");
}

export function TutoringResourceDock({ students }: { students: ResourceStudent[] }) {
  const [notice, setNotice] = useState("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    },
    [],
  );

  async function copyLink(key: string, label: string, url: string) {
    try {
      await copyText(url);
      setCopiedKey(key);
      setNotice(`${label} 링크를 복사했습니다.`);
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => setCopiedKey(null), 1800);
    } catch {
      setNotice("링크를 복사하지 못했습니다. 다시 시도해 주세요.");
    }
  }

  return (
    <section className="rein-resource-dock" aria-labelledby="tutoring-resource-title">
      <header>
        <Link2 aria-hidden="true" className="size-5" />
        <h2 id="tutoring-resource-title">수업 링크</h2>
      </header>
      <div className="rein-resource-dock__list">
        {students.length === 0 && (
          <article className="rein-resource-card">
            <strong>바로 시작</strong>
            <div className="rein-resource-card__actions">
              <a
                href={GOOGLE_MEET_NEW_URL}
                referrerPolicy="no-referrer"
                rel="noopener noreferrer"
                target="_blank"
              >
                <Video aria-hidden="true" className="size-4" />
                Meet 시작
                <ExternalLink aria-hidden="true" className="size-3.5" />
              </a>
              <button
                onClick={() => copyLink("meet-new", "Meet 생성", GOOGLE_MEET_NEW_URL)}
                type="button"
              >
                {copiedKey === "meet-new" ? (
                  <Check aria-hidden="true" className="size-4" />
                ) : (
                  <Copy aria-hidden="true" className="size-4" />
                )}
                생성 주소 복사
              </button>
              <Link href="/tutoring/students/new#resources">
                <FileSpreadsheet aria-hidden="true" className="size-4" />
                시트 등록
              </Link>
            </div>
          </article>
        )}
        {students.map((student) => {
          const meetUrl = student.manualMeetUrl ?? GOOGLE_MEET_NEW_URL;
          return (
            <article className="rein-resource-card" key={student.id}>
              <strong>{student.name}</strong>
              <div className="rein-resource-card__actions">
                <a
                  href={meetUrl}
                  referrerPolicy="no-referrer"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  <Video aria-hidden="true" className="size-4" />
                  Meet 시작
                  <ExternalLink aria-hidden="true" className="size-3.5" />
                </a>
                <button
                  onClick={() => copyLink(`meet-${student.id}`, `${student.name} Meet`, meetUrl)}
                  type="button"
                >
                  {copiedKey === `meet-${student.id}` ? (
                    <Check aria-hidden="true" className="size-4" />
                  ) : (
                    <Copy aria-hidden="true" className="size-4" />
                  )}
                  {student.manualMeetUrl ? "링크 복사" : "생성 주소 복사"}
                </button>
                {student.googleSheetUrl ? (
                  <a
                    href={student.googleSheetUrl}
                    referrerPolicy="no-referrer"
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    <FileSpreadsheet aria-hidden="true" className="size-4" />
                    시트 열기
                    <ExternalLink aria-hidden="true" className="size-3.5" />
                  </a>
                ) : (
                  <Link href={`/tutoring/students/${student.id}/edit#resources`}>
                    <FileSpreadsheet aria-hidden="true" className="size-4" />
                    시트 등록
                  </Link>
                )}
                {student.googleSheetUrl && (
                  <button
                    aria-label={`${student.name} Google Sheets 링크 복사`}
                    onClick={() =>
                      copyLink(
                        `sheet-${student.id}`,
                        `${student.name} Google Sheets`,
                        student.googleSheetUrl!,
                      )
                    }
                    type="button"
                  >
                    {copiedKey === `sheet-${student.id}` ? (
                      <Check aria-hidden="true" className="size-4" />
                    ) : (
                      <Copy aria-hidden="true" className="size-4" />
                    )}
                    시트 복사
                  </button>
                )}
                {(student.manualMeetUrl || student.googleSheetUrl) && (
                  <Link href={`/tutoring/students/${student.id}/edit#resources`}>링크 설정</Link>
                )}
              </div>
            </article>
          );
        })}
      </div>
      <p aria-live="polite" className="sr-only" role="status">
        {notice}
      </p>
    </section>
  );
}
