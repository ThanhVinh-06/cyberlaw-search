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
import "./reset-password.css";

type Challenge = {
  code: string;
  expiresAt: number;
  resendAt: number;
  attempts: number;
};
type Field = "email" | "code" | "password" | "confirm";
const labels: Record<Field, string> = {
  email: "Địa chỉ email",
  code: "Mã xác nhận",
  password: "Mật khẩu mới",
  confirm: "Xác nhận mật khẩu mới",
};

// Preview only. Real verification and password updates must run on the PHP server.
export default function ResetPasswordPage({
  story,
  keyboard,
}: {
  story: ReactNode;
  keyboard: boolean;
}) {
  const location = useLocation();
  const navigate = useNavigate();
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
  const formRef = useRef<HTMLFormElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const step = verified ? 2 : challenge ? 1 : 0;
  const expired = !!challenge && now >= challenge.expiresAt;
  const locked = !!challenge && challenge.attempts >= 5;
  const resendSeconds = challenge
    ? Math.max(0, Math.ceil((challenge.resendAt - now) / 1000))
    : 0;
  const focus = (field: Field) =>
    formRef.current
      ?.querySelector<HTMLInputElement>(`#reset-${field}`)
      ?.focus();

  useEffect(() => {
    document.title = "Đặt lại mật khẩu · CyberLaw";
    headingRef.current?.focus({ preventScroll: true });
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
      setRevealed({ password: false, confirm: false });
      setErrors({});
      setStatus("");
    }
  }

  function sendCode() {
    const email = values.email.trim();
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
    const time = Date.now();
    const code = String(
      crypto.getRandomValues(new Uint32Array(1))[0] % 1000000,
    ).padStart(6, "0");
    setNow(time);
    setChallenge({
      code,
      expiresAt: time + 300000,
      resendAt: time + 30000,
      attempts: 0,
    });
    setVerified(false);
    setValues({ email, code: "", password: "", confirm: "" });
    setRevealed({ password: false, confirm: false });
    setErrors({});
    setStatus("Mã dùng thử đã sẵn sàng bên dưới. Chưa có email nào được gửi.");
    requestAnimationFrame(() => focus("code"));
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!challenge) {
      sendCode();
      return;
    }
    if (Date.now() >= challenge.expiresAt || challenge.attempts >= 5) {
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
      if (values.code !== challenge.code) {
        const attempts = challenge.attempts + 1;
        setChallenge({ ...challenge, attempts });
        setErrors({
          code:
            attempts >= 5
              ? "Mã đã hết lượt thử. Bạn hãy gửi lại mã."
              : `Mã chưa đúng. Bạn còn ${5 - attempts} lượt thử.`,
        });
        focus("code");
        return;
      }
      setErrors({});
      setVerified(true);
      setStatus("Đã xác nhận mã dùng thử. Bạn có thể nhập mật khẩu mới.");
      return;
    }
    const next = {
      password:
        values.password.length < 8
          ? "Mật khẩu cần có ít nhất 8 ký tự."
          : values.password.length > 128
            ? "Mật khẩu tối đa 128 ký tự."
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
    // Do not persist passwords or pretend to change an account in a browser-only preview.
    navigate(`/login${location.search}`, {
      replace: true,
      state: { email: values.email, resetPreviewComplete: true },
    });
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
            maxLength={secret ? 128 : name === "email" ? 191 : 6}
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
                <strong>Bản dùng thử giao diện</strong>
                <br />
                Chưa gửi email hoặc thay đổi mật khẩu tài khoản. Bạn có thể thử
                các bước bằng mã minh họa.
              </p>
            </div>
            <form
              ref={formRef}
              className="auth-form"
              noValidate
              onSubmit={submit}
            >
              {field("email")}
              {challenge && (
                <>
                  <div className="reset-code-info">
                    <p>
                      Mã dùng thử:{" "}
                      <strong data-testid="preview-code">
                        {challenge.code}
                      </strong>
                      <span>
                        {expired ? "Mã đã hết hạn" : "Có hiệu lực trong 5 phút"}
                      </span>
                    </p>
                    <button
                      type="button"
                      className="reset-text-button"
                      disabled={resendSeconds > 0}
                      onClick={sendCode}
                    >
                      {resendSeconds > 0
                        ? `Gửi lại sau ${resendSeconds}s`
                        : "Gửi lại mã"}
                    </button>
                  </div>
                  <motion.div key="code" {...reveal}>
                    {field("code", verified)}
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
                disabled={!!challenge && (expired || locked)}
              >
                {step === 0
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
