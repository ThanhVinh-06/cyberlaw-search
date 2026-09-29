import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Info,
  KeyRound,
  MailCheck,
} from "lucide-react";
import {
  authApi,
  AuthApiError,
  type EmailVerificationStatus,
} from "@/lib/auth-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import "./reset-password.css";
import "./verify-email.css";

type Challenge = EmailVerificationStatus & {
  expiresAt: number;
  resendAt: number;
};

export default function VerifyEmailPage({
  story,
  keyboard,
}: {
  story: ReactNode;
  keyboard: boolean;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [expiredSession, setExpiredSession] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [now, setNow] = useState(Date.now);
  const busy = useRef(false);
  const alive = useRef(false);
  const input = useRef<HTMLInputElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const query =
    new URLSearchParams(location.search).get("next") === "history"
      ? "?next=history"
      : "";
  const remaining = challenge
    ? Math.max(0, Math.ceil((challenge.resendAt - now) / 1000))
    : 0;
  const expired = !!challenge && now >= challenge.expiresAt;

  function accept(data: EmailVerificationStatus) {
    const time = Date.now();
    setNow(time);
    setChallenge({
      ...data,
      expiresAt: time + data.expires_in * 1000,
      resendAt: time + data.resend_after * 1000,
    });
  }

  useEffect(() => {
    let disposed = false;
    alive.current = true;
    document.title = "Xác minh email · CyberLaw";
    heading.current?.focus({ preventScroll: true });
    authApi
      .emailVerificationStatus()
      .then((data) => {
        if (disposed) return;
        accept(data);
        setStatus(
          data.expires_in > 0
            ? "Bạn hãy kiểm tra hộp thư và thư rác để lấy mã xác nhận."
            : "Bạn hãy gửi mã xác nhận để tiếp tục hoàn tất đăng ký.",
        );
      })
      .catch((failure: unknown) => {
        if (disposed) return;
        setError(
          failure instanceof Error
            ? failure.message
            : "Không thể tải thông tin xác minh.",
        );
        setExpiredSession(
          failure instanceof AuthApiError && failure.status === 401,
        );
      })
      .finally(() => {
        if (!disposed) setLoading(false);
      });
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => {
      disposed = true;
      alive.current = false;
      window.clearInterval(timer);
    };
  }, []);

  async function send() {
    if (busy.current || remaining > 0) return;
    busy.current = true;
    setPending(true);
    setError("");
    setStatus("");
    try {
      const data = await authApi.sendEmailVerification();
      if (!alive.current) return;
      accept(data);
      setCode("");
      setStatus("Đã gửi mã xác nhận. Bạn hãy kiểm tra hộp thư và thư rác.");
    } catch (failure) {
      if (!alive.current) return;
      setError(failure instanceof Error ? failure.message : "Bạn hãy thử lại.");
      if (failure instanceof AuthApiError && failure.status === 401)
        setExpiredSession(true);
    } finally {
      busy.current = false;
      if (alive.current) setPending(false);
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (
      busy.current ||
      !challenge ||
      expiredSession ||
      expired ||
      challenge.locked
    )
      return;
    if (!/^\d{6}$/.test(code)) {
      setError("Bạn hãy nhập đủ 6 chữ số của mã xác nhận.");
      input.current?.focus();
      return;
    }
    busy.current = true;
    setPending(true);
    setError("");
    setStatus("");
    try {
      await authApi.verifyEmail(code);
      if (!alive.current) return;
      navigate(`/login${query}`, {
        replace: true,
        state: { email: challenge.email, emailVerified: true },
      });
    } catch (failure) {
      if (!alive.current) return;
      setError(failure instanceof Error ? failure.message : "Bạn hãy thử lại.");
      setCode("");
      if (failure instanceof AuthApiError) {
        if (failure.status === 401) setExpiredSession(true);
        if (failure.code === "verification_locked")
          setChallenge((previous) => previous && { ...previous, locked: true });
        if (failure.code === "verification_expired")
          setChallenge((previous) => previous && { ...previous, expiresAt: 0 });
      }
    } finally {
      busy.current = false;
      if (alive.current) setPending(false);
    }
  }

  const reveal = {
    initial: keyboard ? (false as const) : { opacity: 0, y: reduced ? 0 : 12 },
    animate: { opacity: 1, y: 0 },
    transition: {
      duration: keyboard ? 0 : reduced ? 0.15 : 0.55,
      ease: [0.23, 1, 0.32, 1] as const,
    },
  };

  return (
    <div className="auth-page reset-page verify-email-page">
      <div className="page-context">
        <Link to={`/login${query}`} state={{ email: challenge?.email }}>
          <ArrowLeft size={15} />
          Quay lại đăng nhập
        </Link>
        <span>TÀI KHOẢN CYBERLAW</span>
      </div>
      <div className="auth-card">
        {story}
        <div className="auth-form-side">
          <motion.div className="form-content" {...reveal}>
            <span className="form-emblem">
              <MailCheck size={25} />
            </span>
            <div className="form-heading">
              <span className="eyebrow">HOÀN TẤT ĐĂNG KÝ</span>
              <h1 ref={heading} tabIndex={-1}>
                Xác minh email
              </h1>
              <p>
                Chỉ còn một bước để bắt đầu tra cứu và lưu lịch sử hỏi đáp của
                bạn.
              </p>
            </div>
            <ol className="reset-steps" aria-label="Tiến trình đăng ký">
              <li className="reached">
                <span>
                  <Check size={13} />
                </span>
                Tạo tài khoản
              </li>
              <li className="reached" aria-current="step">
                <span>2</span>Xác minh email
              </li>
              <li>
                <span>3</span>Đăng nhập
              </li>
            </ol>
            <div className="reset-preview-note">
              <Info size={17} />
              <p>
                Mã có hiệu lực trong <strong>5 phút</strong>. Chỉ nhập mã nếu
                chính bạn đã đăng ký tài khoản. Không chia sẻ mã với người khác.
              </p>
            </div>
            {loading ? (
              <p role="status">Đang tải thông tin xác minh…</p>
            ) : (
              <form
                className="auth-form"
                noValidate
                onSubmit={submit}
                aria-busy={pending}
              >
                {challenge && !expiredSession && (
                  <>
                    <div className="verify-email-address">
                      <span>Email nhận mã</span>
                      <strong>{challenge.email}</strong>
                    </div>
                    <motion.div className="form-field" {...reveal}>
                      <Label htmlFor="verify-email-code">Mã xác nhận</Label>
                      <div className={`input-wrap ${error ? "invalid" : ""}`}>
                        <KeyRound
                          size={18}
                          className="input-leading"
                          aria-hidden="true"
                        />
                        <Input
                          ref={input}
                          id="verify-email-code"
                          name="code"
                          type="text"
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          maxLength={6}
                          placeholder="Nhập 6 chữ số"
                          value={code}
                          required
                          disabled={pending || challenge.locked || expired}
                          aria-invalid={!!error}
                          aria-describedby={
                            error ? "verify-email-error" : undefined
                          }
                          onChange={(event) => {
                            setCode(event.target.value.replace(/\D/g, ""));
                            setError("");
                          }}
                        />
                      </div>
                    </motion.div>
                    <button
                      className="reset-text-button"
                      type="button"
                      disabled={pending || remaining > 0}
                      onClick={send}
                    >
                      {remaining > 0
                        ? `Gửi lại sau ${remaining}s`
                        : "Gửi lại mã"}
                    </button>
                    {expired && (
                      <p className="reset-status">
                        Chưa có mã còn hiệu lực. Bạn hãy gửi lại mã để tiếp tục.
                      </p>
                    )}
                  </>
                )}
                {error && (
                  <p
                    id="verify-email-error"
                    className="field-error"
                    role="alert"
                  >
                    {error}
                  </p>
                )}
                <p className="reset-status" role="status">
                  {status}
                </p>
                {challenge && !expiredSession && (
                  <Button
                    className="submit-button"
                    type="submit"
                    disabled={pending || expired || challenge.locked}
                  >
                    {pending ? "Đang xử lý…" : "Xác nhận email"}
                    <ArrowRight size={18} />
                  </Button>
                )}
                {!challenge && !expiredSession && (
                  <button
                    type="button"
                    className="reset-text-button"
                    onClick={() => window.location.reload()}
                  >
                    Tải lại thông tin
                  </button>
                )}
              </form>
            )}
            <p className="form-switch-copy">
              {expiredSession ? "Tiếp tục xác minh? " : "Bạn muốn quay lại? "}
              <Link to={`/login${query}`} state={{ email: challenge?.email }}>
                Đăng nhập
                <ArrowRight size={13} />
              </Link>
            </p>
            <p className="preview-note">
              Nếu nhập nhầm email, bạn có thể{" "}
              <Link to={`/register${query}`}>đăng ký lại với email đúng</Link>.
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
