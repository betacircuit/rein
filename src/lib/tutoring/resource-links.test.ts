import { describe, expect, it } from "vitest";

import {
  isGoogleMeetUrl,
  isGoogleSheetUrl,
  normalizeGoogleMeetUrl,
  normalizeGoogleSheetUrl,
} from "./resource-links";

describe("tutoring Google resource links", () => {
  it("normalizes trusted Meet links and removes tracking data", () => {
    expect(normalizeGoogleMeetUrl("https://meet.google.com/abc-defg-hij?authuser=0")).toBe(
      "https://meet.google.com/abc-defg-hij",
    );
  });

  it("rejects disguised or non-meeting Meet URLs", () => {
    expect(isGoogleMeetUrl("https://meet.google.com.evil.test/abc-defg-hij")).toBe(false);
    expect(isGoogleMeetUrl("https://user@meet.google.com/abc-defg-hij")).toBe(false);
    expect(isGoogleMeetUrl("https://meet.google.com/new")).toBe(false);
  });

  it("normalizes Sheets links and keeps only a numeric gid", () => {
    expect(
      normalizeGoogleSheetUrl(
        "https://docs.google.com/spreadsheets/d/1AbCdEfGhIjKlMnOpQr/edit?usp=sharing#gid=42",
      ),
    ).toBe("https://docs.google.com/spreadsheets/d/1AbCdEfGhIjKlMnOpQr/edit#gid=42");
    expect(
      normalizeGoogleSheetUrl(
        "https://docs.google.com/spreadsheets/d/1AbCdEfGhIjKlMnOpQr/edit?gid=42",
      ),
    ).toBe("https://docs.google.com/spreadsheets/d/1AbCdEfGhIjKlMnOpQr/edit#gid=42");
  });

  it("rejects disguised or unrelated Google document URLs", () => {
    expect(isGoogleSheetUrl("https://docs.google.com.evil.test/spreadsheets/d/abcdefghij")).toBe(
      false,
    );
    expect(isGoogleSheetUrl("https://docs.google.com/document/d/abcdefghij/edit")).toBe(false);
  });
});
