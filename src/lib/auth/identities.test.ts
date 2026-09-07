import { describe, expect, it } from "vitest";

import { findAppIdentity, findIdentityByEmail } from "./identities";

describe("app identities", () => {
  it("실명을 로그인 ID로 매핑한다", () => {
    expect(findAppIdentity("최 재 원")?.role).toBe("owner");
    expect(findAppIdentity("김태현")?.role).toBe("roommate");
  });

  it("허용되지 않은 이름은 거부한다", () => {
    expect(findAppIdentity("다른 사용자")).toBeNull();
  });

  it("Supabase 이메일 별칭에서 표시 이름을 찾는다", () => {
    expect(findIdentityByEmail("CHOI.JAEWON@REIN.LOCAL")?.displayName).toBe("최재원");
  });
});
