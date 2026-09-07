"use client";

import { signOutLocalDemo } from "@/app/login/actions";
import { Button } from "@/components/ui/button";

export function SignOutForm() {
  return (
    <form
      action={signOutLocalDemo}
      className="mt-5 flex justify-end"
      onSubmit={() =>
        navigator.serviceWorker?.controller?.postMessage({ type: "CLEAR_PRIVATE_CACHE" })
      }
    >
      <Button type="submit" variant="outline">
        데모 세션 끝내기
      </Button>
    </form>
  );
}
