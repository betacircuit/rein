import { LoginForm } from "./login-form";
import { BrandLogo } from "@/components/brand-logo";

export const metadata = { title: "로그인" };

export default function LoginPage() {
  return (
    <div className="rein-login-stage mx-auto flex min-h-dvh max-w-4xl items-start px-3 py-4 sm:px-0">
      <div aria-hidden="true" className="rein-login-backdrop" />
      <section className="rein-login-window rein-window w-full">
        <div className="rein-titlebar rein-titlebar--orange">
          <span>REIN / ACCESS</span>
          <span aria-hidden="true" className="rein-controls">
            <span>−</span>
            <span>□</span>
            <span>×</span>
          </span>
        </div>
        <div className="rein-login-grid grid sm:grid-cols-[1.35fr_1fr]">
          <div className="rein-brand-panel border-b-[3px] border-[var(--ink)] sm:border-r-[3px] sm:border-b-0">
            <BrandLogo priority />
            <p className="rein-meta border-t-[3px] border-[var(--ink)] bg-[var(--cyan)] px-4 py-3 text-center">
              PERSONAL OPS / SEOUL / 2 USERS
            </p>
          </div>
          <div className="rein-login-form-panel bg-[var(--surface)]">
            <p className="rein-login-section-heading rein-meta border-b-[3px] border-[var(--ink)]">
              [ 사용자 로그인 ]
            </p>
            <LoginForm />
          </div>
        </div>
      </section>
    </div>
  );
}
