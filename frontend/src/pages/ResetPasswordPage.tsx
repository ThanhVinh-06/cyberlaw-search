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
  Eye,
  EyeOff,
  Info,
  KeyRound,
  LockKeyhole,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authApi, AuthApiError } from "@/lib/auth-api";
import { useAuth } from "@/lib/auth-context";
import "./reset-password.css";

type Challenge = {
  expiresAt: number;
  resendAt: number;
};
type Field = "email" | "code" | "password" | "confirm";
const labels: Record<Field, string> = {
  email: "Địa chỉ email",
  code: "Mã xác nhận",
  password: "Mật khẩu mới",
  confirm: "Xác nhận mật khẩu mới",
};

export default function ResetPasswordPage({
  story,
  keyboard,
}: {
  story: ReactNode;
  keyboard: boolean;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const auth = useAuth();
  const reduced = useReducedMotion();
  const [values, setValues] = useState<Record<Field, string>>({
    email:
      typeof location.state?.email === "string" ? location.state.email : "",
    code: "",
    password: "",
    confirm: "",
  });
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [verified, setVerified] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [revealed, setRevealed] = useState({ password: false, confirm: false });
  const [now, setNow] = useState(Date.now);
  const [status, setStatus] = useState("");
  const [pending, setPending] = useState(false);
  const [locked, setLocked] = useState(false);
  const busy = useRef(false);
  const active = useRef(true);
  const formRef = useRef<HTMLFormElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const step = verified ? 2 : challenge ? 1 : 0;
  const expired = !!challenge && now >= challenge.expiresAt;
  const resendSeconds = challenge
    ? Math.max(0, Math.ceil((challenge.resendAt - now) / 1000))
    : 0;
  const focus = (field: Field) =>
    formRef.current
      ?.querySelector<HTMLInputElement>(`#reset-${field}`)
      ?.focus();

  useEffect(() => {
    active.current = true;
    document.title = "Đặt lại mật khẩu · CyberLaw";
    headingRef.current?.focus({ preventScroll: true });
    return () => {
      active.current = false;
    };
  }, []);
  useEffect(() => {
    if (!challenge) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [challenge]);
  useEffect(() => {
    if (step) focus(step === 1 ? "code" : "password");
  }, [step]);

  function update(field: Field, value: string) {
    if (busy.current) return;
    setValues((previous) => ({
      ...previous,
      [field]: value,
      ...(field === "email" ? { code: "", password: "", confirm: "" } : {}),
    }));
    setErrors((previous) => ({
      ...previous,
      [field]: "",
      ...(field === "password" ? { confirm: "" } : {}),
    }));
    if (field === "email") {
      setChallenge(null);
      setVerified(false);
      setLocked(false);
      setRevealed({ password: false, confirm: false });
      setErrors({});
      setStatus("");
    }
  }

  async function sendCode() {
    if (busy.current) return;
    const email = values.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 191) {
      setErrors({
        email: email
          ? "Bạn hãy nhập địa chỉ email hợp lệ."
          : "Bạn hãy nhập địa chỉ email.",
      });
      focus("email");
      return;
    }
    if (challenge && Date.now() < challenge.resendAt) return;
    busy.current = true;
    setPending(true);
    setErrors({});
    try {
      const response = await authApi.requestPasswordReset(email);
      if (!active.current) return;
      const time = Date.now();
      setNow(time);
      setChallenge({
        expiresAt: time + response.expires_in * 1000,
        resendAt: time + response.resend_after * 1000,
      });
      setVerified(false);
      setLocked(false);
      setValues({ email, code: "", password: "", confirm: "" });
      setRevealed({ password: false, confirm: false });
      setStatus(response.message);
    } catch (error) {
      if (active.current)
        setErrors({
          email:
            error instanceof Error
              ? error.message
              : "Chưa gửi được yêu cầu. Bạn hãy thử lại.",
        });
    } finally {
      busy.current = false;
      if (active.current) setPending(false);
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy.current) return;
    if (!challenge) {
      sendCode();
      return;
    }
    if (Date.now() >= challenge.expiresAt || locked) {
      setErrors({
        code: "Mã đã hết hạn hoặc hết lượt thử. Bạn hãy gửi lại mã.",
      });
      setVerified(false);
      setValues((previous) => ({ ...previous, password: "", confirm: "" }));
      focus("code");
      return;
    }
    if (!verified) {
      if (!/^\d{6}$/.test(values.code)) {
        setErrors({ code: "Bạn hãy nhập đủ 6 chữ số của mã xác nhận." });
        focus("code");
        return;
      }
      setErrors({});
      busy.current = true;
      setPending(true);
      try {
        const response = await authApi.verifyPasswordReset(
          values.email,
          values.code,
        );
        if (!active.current) return;
        setVerified(true);
        setValues((previous) => ({ ...previous, code: "" }));
        setStatus(response.message);
      } catch (error) {
        if (!active.current) return;
        setErrors({
          code: error instanceof Error ? error.message : "Bạn hãy thử lại.",
        });
        if (error instanceof AuthApiError && error.code === "reset_locked")
          setLocked(true);
      } finally {
        busy.current = false;
        if (active.current) setPending(false);
      }
      return;
    }
    const next = {
      password:
        values.password.length < 8
          ? "Mật khẩu cần có ít nhất 8 ký tự."
          : new TextEncoder().encode(values.password).length > 72 ||
              values.password.includes("\0")
            ? "Mật khẩu tối đa 72 byte và không chứa ký tự null."
            : "",
      confirm: !values.confirm
        ? "Bạn hãy nhập lại mật khẩu mới."
        : values.confirm !== values.password
          ? "Mật khẩu nhập lại chưa khớp."
          : "",
    };
    setErrors(next);
    if (next.password || next.confirm) {
      focus(next.password ? "password" : "confirm");
      return;
    }
    busy.current = true;
    setPending(true);
    try {
      await authApi.completePasswordReset(
        values.email,
        values.password,
        values.confirm,
      );
      auth.clearResetSession();
      if (!active.current) return;
      navigate(`/login${location.search}`, {
        replace: true,
        state: { email: values.email, resetComplete: true },
      });
    } catch (error) {
      if (!active.current) return;
      setValues((previous) => ({ ...previous, password: "", confirm: "" }));
      setStatus(error instanceof Error ? error.message : "Bạn hãy thử lại.");
      if (error instanceof AuthApiError && error.code === "reset_invalid") {
        setVerified(false);
        setChallenge(null);
      }
    } finally {
      busy.current = false;
      if (active.current) setPending(false);
    }
  }

  function field(name: Field, readOnly = false) {
    const secret = name === "password" || name === "confirm";
    const Icon =
      name === "email" ? Mail : name === "code" ? KeyRound : LockKeyhole;
    return (
      <div className="form-field">
        <Label htmlFor={`reset-${name}`}>{labels[name]}</Label>
        <div className={`input-wrap ${errors[name] ? "invalid" : ""}`}>
          <Icon size={18} className="input-leading" aria-hidden="true" />
          <Input
            id={`reset-${name}`}
            name={name}
            value={values[name]}
            readOnly={readOnly}
            disabled={pending}
            required
            type={
              secret
                ? revealed[name]
                  ? "text"
                  : "password"
                : name === "email"
                  ? "email"
                  : "text"
            }
            inputMode={
              name === "code"
                ? "numeric"
                : name === "email"
                  ? "email"
                  : undefined
            }
            autoComplete={
              secret
                ? "new-password"
                : name === "code"
                  ? "one-time-code"
                  : "email"
            }
            autoCapitalize="none"
            spellCheck={false}
            maxLength={secret ? 72 : name === "email" ? 191 : 6}
            placeholder={
              name === "email"
                ? "ban@example.com"
                : name === "code"
                  ? "Nhập 6 chữ số"
                  : name === "password"
                    ? "Ít nhất 8 ký tự"
                    : "Nhập lại mật khẩu mới"
            }
            aria-invalid={!!errors[name]}
            aria-describedby={errors[name] ? `reset-${name}-error` : undefined}
            onChange={(e) =>
              update(
                name,
                name === "code"
                  ? e.target.value.replace(/\D/g, "")
                  : e.target.value,
              )
            }
          />
          {secret && (
            <button
              type="button"
              className="password-toggle"
              aria-label={`${revealed[name] ? "Ẩn" : "Hiện"} ${labels[name].toLowerCase()}`}
              aria-pressed={revealed[name]}
              onClick={() =>
                setRevealed((previous) => ({
                  ...previous,
                  [name]: !previous[name],
                }))
              }
            >
              {revealed[name] ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          )}
        </div>
        {errors[name] && (
          <p id={`reset-${name}-error`} className="field-error" role="alert">
            {errors[name]}
          </p>
        )}
      </div>
    );
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
    <div className="auth-page reset-page">
      <div className="page-context">
        <Link to={`/login${location.search}`} state={{ email: values.email }}>
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
              <ShieldCheck size={25} />
            </span>
            <div className="form-heading">
              <span className="eyebrow">KHÔI PHỤC TRUY CẬP</span>
              <h1 ref={headingRef} tabIndex={-1}>
                Đặt lại mật khẩu
              </h1>
              <p>Xác nhận email để tạo mật khẩu mới cho tài khoản của bạn.</p>
            </div>
            <ol
              className="reset-steps"
              aria-label="Tiến trình đặt lại mật khẩu"
            >
              {["Email", "Xác nhận", "Mật khẩu mới"].map((label, index) => (
                <li
                  key={label}
                  aria-current={index === step ? "step" : undefined}
                  className={index <= step ? "reached" : ""}
                >
                  <span>{index < step ? <Check size={13} /> : index + 1}</span>
                  {label}
                </li>
              ))}
            </ol>
            <div className="reset-preview-note">
              <Info size={17} />
              <p>
                <strong>Bảo vệ tài khoản của bạn</strong>
                <br />
                Mã xác nhận có hiệu lực trong 5 phút. Bạn không chia sẻ mã này
                với người khác nhé.
              </p>
            </div>
            <form
              ref={formRef}
              className="auth-form"
              noValidate
              onSubmit={submit}
              aria-busy={pending}
            >
              {field("email")}
              {challenge && (
                <>
                  <div className="reset-code-info">
                    <p>
                      {verified
                        ? "Email đã được xác nhận"
                        : "Bạn hãy kiểm tra hộp thư"}
                      <span>
                        {expired ? "Mã đã hết hạn" : "Có hiệu lực trong 5 phút"}
                      </span>
                    </p>
                    <button
                      type="button"
                      className="reset-text-button"
                      disabled={pending || resendSeconds > 0}
                      onClick={sendCode}
                    >
                      {resendSeconds > 0
                        ? `Gửi lại sau ${resendSeconds}s`
                        : "Gửi lại mã"}
                    </button>
                  </div>
                  <motion.div key="code" {...reveal}>
                    {!verified && field("code")}
                  </motion.div>
                </>
              )}
              {verified && (
                <motion.div
                  key="passwords"
                  className="reset-password-fields"
                  {...reveal}
                >
                  {field("password")}
                  {field("confirm")}
                </motion.div>
              )}
              <p className="reset-status" role="status">
                {expired
                  ? "Mã đã hết hạn. Bạn hãy gửi lại mã để tiếp tục."
                  : status}
              </p>
              <Button
                className="submit-button"
                type="submit"
                disabled={pending || (!!challenge && (expired || locked))}
              >
                {pending
                  ? "Đang xử lý…"
                  : step === 0
                    ? "Gửi mã xác nhận"
                    : step === 1
                      ? "Xác nhận mã"
                      : "Xác nhận mật khẩu mới"}
                <ArrowRight size={18} />
              </Button>
            </form>
            <p className="form-switch-copy">
              Bạn đã nhớ mật khẩu?{" "}
              <Link
                to={`/login${location.search}`}
                state={{ email: values.email }}
              >
                Đăng nhập
                <ArrowRight size={13} />
              </Link>
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
