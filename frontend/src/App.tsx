import MainSite from "./MainSite";
import AdminUsersPage from "./pages/admin/AdminUsersPage";
import AdminAccessDenied from "./pages/admin/AdminAccessDenied";
import { useAuth } from "./lib/auth-context";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  Link,
  NavLink,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  CircleHelp,
  Eye,
  EyeOff,
  Fingerprint,
  History,
  Info,
  Library,
  LockKeyhole,
  Mail,
  Menu,
  Search,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChatPopover } from "@/components/ChatPopover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const nav = [
  { to: "/search", label: "Tra cứu pháp luật", icon: Search },
  { to: "/library", label: "Thư viện văn bản", icon: Library },
  { to: "/terms", label: "Từ điển thuật ngữ", icon: BookOpen },
];

function Brand() {
  return (
    <Link className="brand" to="/search" aria-label="CyberLaw — Trang tra cứu">
      <span className="brand-mark">
        <ShieldCheck size={25} strokeWidth={1.6} />
      </span>
      <span>
        Cyber<span className="brand-law">Law</span>
        <small>HIỂU LUẬT · AN TÂM</small>
      </span>
    </Link>
  );
}

function Navigation({ close }: { close?: () => void }) {
  const authRoute = ["/login", "/register"].includes(useLocation().pathname);
  const { currentUser, isAuthenticated, isAdmin, logout } = useAuth();

  return (
    <>
      <div className="nav-group-label">KHÁM PHÁ</div>
      <nav aria-label="Điều hướng chính">
        {nav.map(({ to, label, icon: Icon }) => (
          <NavLink
            onClick={close}
            key={to}
            to={to}
            className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
          >
            <Icon size={19} />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="nav-group-label personal-label">KHÔNG GIAN CỦA BẠN</div>

      {!isAuthenticated ? (
        <Link
          onClick={close}
          className={`nav-link ${authRoute ? "active" : ""}`}
          to="/login"
          aria-current={authRoute ? "page" : undefined}
        >
          <UserRound size={19} />
          Tài khoản
          <ChevronRight size={15} className="nav-chevron" />
        </Link>
      ) : (
        <div
          style={{
            padding: "8px 12px",
            background: "#ffffff",
            borderRadius: "8px",
            border: "1px solid #e7e1dd",
            margin: "4px 8px 8px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "6px",
            }}
          >
            <div
              style={{
                width: "24px",
                height: "24px",
                borderRadius: "50%",
                background: isAdmin ? "#800020" : "#4a3e40",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "10px",
                fontWeight: 600,
              }}
            >
              {currentUser?.ho_ten
                .split(" ")
                .map((n) => n[0])
                .slice(-2)
                .join("")
                .toUpperCase()}
            </div>
            <div style={{ overflow: "hidden", lineHeight: 1.2 }}>
              <div
                style={{
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "#21181d",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {currentUser?.ho_ten}
              </div>
              <div
                style={{
                  fontSize: "10px",
                  color: isAdmin ? "#800020" : "#6e6466",
                }}
              >
                {isAdmin ? "Quản trị viên" : "Người dùng"}
              </div>
            </div>
          </div>
          <button
            onClick={() => {
              logout();
              if (close) close();
            }}
            style={{
              fontSize: "11px",
              color: "#8b8082",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
              textDecoration: "underline",
            }}
          >
            Đăng xuất
          </button>
        </div>
      )}

      <Link onClick={close} className="nav-link" to="/login?next=history">
        <History size={19} />
        Lịch sử hỏi đáp
        <LockKeyhole size={13} className="nav-chevron" />
      </Link>

      {/* CHỈ hiển thị Quản trị hệ thống khi đã đăng nhập đúng tài khoản Quản trị viên (admin) */}
      {isAdmin && (
        <Link
          onClick={close}
          className="nav-link"
          to="/admin"
          style={{ color: "#800020", fontWeight: 600 }}
        >
          <ShieldCheck size={19} />
          Quản trị hệ thống
          <ChevronRight size={15} className="nav-chevron" />
        </Link>
      )}
    </>
  );
}

function Sidebar() {
  return (
    <aside className="sidebar">
      <Brand />
      <div className="sidebar-nav">
        <Navigation />
      </div>
      <div className="sidebar-bottom">
        <div className="sidebar-note">
          <span className="note-icon">
            <BookOpen size={19} />
          </span>
          <strong>
            Hiểu luật từ những
            <br />
            điều gần gũi nhất.
          </strong>
          <p>
            Kiến thức rõ ràng.
            <br />
            Tra cứu có căn cứ.
          </p>
        </div>
        <NavLink to="/help" className="nav-link">
          <CircleHelp size={18} />
          Hướng dẫn sử dụng
          <ArrowRight size={15} className="nav-chevron" />
        </NavLink>
        <div className="sidebar-version">
          <span className="status-dot" />
          Đồ án Trí tuệ nhân tạo<span>v0.1</span>
        </div>
      </div>
    </aside>
  );
}

function MobileMenu() {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="mobile-menu"
          aria-label="Mở menu điều hướng"
        >
          <Menu />
        </Button>
      </DialogTrigger>
      <DialogContent className="mobile-navigation">
        <DialogHeader>
          <DialogTitle>CyberLaw</DialogTitle>
          <DialogDescription>
            Tra cứu kiến thức pháp luật về an ninh mạng.
          </DialogDescription>
        </DialogHeader>
        <Navigation close={() => setOpen(false)} />
        <Link className="nav-link" to="/help" onClick={() => setOpen(false)}>
          <CircleHelp size={19} />
          Hướng dẫn sử dụng
        </Link>
      </DialogContent>
    </Dialog>
  );
}

function Companion() {
  const [open, setOpen] = useState(false);
  const [instant, setInstant] = useState(false);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const actionRef = useRef<HTMLAnchorElement>(null);
  const close = useCallback((immediate = false, restoreFocus = true) => {
    setInstant(immediate);
    setOpen(false);
    if (restoreFocus)
      requestAnimationFrame(() =>
        launcherRef.current?.focus({ preventScroll: true }),
      );
  }, []);
  useEffect(() => {
    if (!open) return;
    actionRef.current?.focus({ preventScroll: true });
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") close(true);
    };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [open, close]);
  return (
    <ChatPopover
      className="cl-auth-chat"
      open={open}
      instant={instant}
      articleOpen={false}
      launcherRef={launcherRef}
      onOpen={(immediate) => {
        setInstant(immediate);
        setOpen(true);
      }}
      onClose={close}
    >
      <div className="cl-auth-chat-body">
        <img src="/assets/ai-assistant.png" alt="" width="120" height="120" />
        <h2>Xin chào, mình là CyberLaw.</h2>
        <p>Không gian hỏi đáp về Luật An ninh mạng.</p>
        <p>
          Tính năng hỏi đáp AI đang được hoàn thiện. Bạn có thể khám phá các
          điều khoản minh họa trong trang tra cứu ngay lúc này.
        </p>
        <Button asChild>
          <Link to="/search" ref={actionRef}>
            Khám phá thư viện luật
            <ArrowRight size={17} />
          </Link>
        </Button>
      </div>
    </ChatPopover>
  );
}

function AuthStory() {
  return (
    <section className="auth-story" aria-label="Giới thiệu CyberLaw">
      <div className="story-topline">
        <span className="story-badge">
          <Sparkles size={14} />
          TRI THỨC TRONG TẦM TAY
        </span>
        <span className="story-number">CYBERLAW</span>
      </div>
      <div className="story-copy">
        <h2>
          Hiểu luật hơn.
          <br />
          <em>An tâm hơn.</em>
        </h2>
        <p>
          Một không gian để bạn tìm hiểu,
          <br className="wide-only" /> tra cứu và kết nối với kiến thức pháp
          luật.
        </p>
      </div>
      <div className="knowledge-visual" aria-hidden="true">
        <div className="orbit orbit-one" />
        <div className="orbit orbit-two" />
        <div className="orbit orbit-three" />
        <span className="orbit-spark spark-one">✦</span>
        <span className="orbit-spark spark-two">✧</span>
        <div className="document-art">
          <div className="document-art-top">
            <ShieldCheck size={25} />
            <span>
              CYBERLAW
              <br />
              <small>THƯ VIỆN KIẾN THỨC</small>
            </span>
          </div>
          <span className="document-rule" />
          <strong>
            Luật
            <br />
            An ninh mạng
          </strong>
          <div className="document-lines">
            <i />
            <i />
            <i />
          </div>
          <span className="document-art-bottom">
            HIỂU ĐÚNG · TRA CỨU DỄ DÀNG
            <BookOpen size={18} />
          </span>
        </div>
        <div className="source-tag">
          <span>
            <Check size={13} />
          </span>
          Căn cứ rõ ràng
        </div>
        <div className="search-tag">
          <Search size={16} />
          <span>Từ câu hỏi đến kiến thức</span>
          <ArrowRight size={14} />
        </div>
      </div>
      <div className="story-benefits">
        <div>
          <span>
            <Search size={18} />
          </span>
          <p>
            <strong>Tra cứu dễ dàng</strong>
            <small>Tìm điều khoản theo cách bạn hỏi.</small>
          </p>
        </div>
        <div>
          <span>
            <History size={18} />
          </span>
          <p>
            <strong>Tiếp nối điều đang tìm hiểu</strong>
            <small>Không gian dành riêng cho bạn.</small>
          </p>
        </div>
      </div>
      <div className="story-footer">
        <span />
        <span />
        <span />
        <p>Kiến thức pháp luật, gần hơn mỗi ngày.</p>
      </div>
    </section>
  );
}

type FieldName = "name" | "email" | "password" | "confirm";
type Values = Record<FieldName, string>;
const emptyValues: Values = { name: "", email: "", password: "", confirm: "" };

function AuthPage({
  register,
  keyboard,
}: {
  register: boolean;
  keyboard: boolean;
}) {
  const reduced = useReducedMotion();
  const [values, setValues] = useState<Values>(emptyValues);
  const [errors, setErrors] = useState<Partial<Values>>({});
  const [revealed, setRevealed] = useState({ password: false, confirm: false });
  const [notice, setNotice] = useState("");
  const [capsLock, setCapsLock] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const noticeRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const location = useLocation();
  const fields: FieldName[] = register
    ? ["name", "email", "password", "confirm"]
    : ["email", "password"];
  const historyIntent =
    new URLSearchParams(location.search).get("next") === "history";
  useLayoutEffect(() => {
    setValues(emptyValues);
    setErrors({});
    setNotice("");
    setRevealed({ password: false, confirm: false });
    setCapsLock(false);
  }, [register]);
  useEffect(() => {
    document.title = `${register ? "Đăng ký" : "Đăng nhập"} · CyberLaw`;
    headingRef.current?.focus({ preventScroll: true });
  }, [register]);

  function validate(field: FieldName, input = values): string {
    const value = input[field];
    if (field === "name")
      return !value.trim()
        ? "Bạn hãy nhập họ và tên."
        : value.trim().length < 2
          ? "Họ tên cần có ít nhất 2 ký tự."
          : value.trim().length > 100
            ? "Họ tên tối đa 100 ký tự."
            : "";
    if (field === "email")
      return !value.trim()
        ? "Bạn hãy nhập địa chỉ email."
        : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
          ? "Địa chỉ email chưa đúng định dạng."
          : value.trim().length > 191
            ? "Email tối đa 191 ký tự."
            : "";
    if (field === "password")
      return !value
        ? "Bạn hãy nhập mật khẩu."
        : register && value.length < 8
          ? "Mật khẩu cần có ít nhất 8 ký tự."
          : value.length > 128
            ? "Mật khẩu tối đa 128 ký tự."
            : "";
    return !value
      ? "Bạn hãy nhập lại mật khẩu."
      : value !== input.password
        ? "Mật khẩu nhập lại chưa khớp."
        : "";
  }
  function update(field: FieldName, value: string) {
    const next = { ...values, [field]: value };
    setValues(next);
    setNotice("");
    setErrors((previous) => ({
      ...previous,
      ...(previous[field] ? { [field]: validate(field, next) } : {}),
      ...(field === "password" && previous.confirm
        ? { confirm: validate("confirm", next) }
        : {}),
    }));
  }
  const auth = useAuth();
  const navigate = useNavigate();

  function submit(event: FormEvent) {
    event.preventDefault();
    const next = Object.fromEntries(
      fields.map((field) => [field, validate(field)]),
    );
    setErrors(next);
    const first = fields.find((field) => next[field]);
    if (first) {
      formRef.current?.querySelector<HTMLInputElement>(`#${first}`)?.focus();
      return;
    }

    if (register) {
      setNotice(
        "Thông tin đã đúng định dạng. Bản xem trước chưa tạo tài khoản; đăng ký sẽ khả dụng khi dịch vụ tài khoản được kết nối.",
      );
      setValues((previous) => ({ ...previous, password: "", confirm: "" }));
      setRevealed({ password: false, confirm: false });
      requestAnimationFrame(() => noticeRef.current?.focus());
      return;
    }

    // Xử lý đăng nhập
    const loginRes = auth.login(values.email, values.password);
    if (loginRes.success && loginRes.user) {
      // Phân quyền điều hướng
      if (loginRes.user.vai_tro === "admin") {
        navigate("/admin");
      } else {
        navigate("/search");
      }
      return;
    }

    // Nếu không khớp tài khoản
    if (values.email.toLowerCase() === "demo@example.invalid") {
      setNotice(
        "Bản xem trước chưa kết nối dịch vụ tài khoản. Thông tin của bạn chưa được gửi hoặc lưu. Bạn vẫn có thể tra cứu mà không cần đăng nhập.",
      );
    } else {
      setNotice(loginRes.error || "Email hoặc mật khẩu không chính xác.");
    }
    setValues((previous) => ({ ...previous, password: "", confirm: "" }));
    setRevealed({ password: false, confirm: false });
    requestAnimationFrame(() => noticeRef.current?.focus());
  }
  const details: Record<
    FieldName,
    { label: string; placeholder: string; icon: typeof Mail }
  > = {
    name: { label: "Họ và tên", placeholder: "Tên của bạn", icon: UserRound },
    email: {
      label: "Địa chỉ email",
      placeholder: "ban@example.com",
      icon: Mail,
    },
    password: {
      label: "Mật khẩu",
      placeholder: register ? "Tạo mật khẩu của bạn" : "Nhập mật khẩu",
      icon: LockKeyhole,
    },
    confirm: {
      label: "Xác nhận mật khẩu",
      placeholder: "Nhập lại mật khẩu",
      icon: LockKeyhole,
    },
  };
  return (
    <div className="auth-page">
      <div className="page-context">
        <Link to="/search">
          <ArrowLeft size={15} />
          Quay lại tra cứu
        </Link>
        <span>TÀI KHOẢN CYBERLAW</span>
      </div>
      <div className={`auth-card ${register ? "register-card" : ""}`}>
        <AuthStory />
        <div className="auth-form-side">
          <nav className="auth-switch" aria-label="Chọn đăng nhập hoặc đăng ký">
            <span
              className={`auth-switch-indicator ${register ? "register-active" : ""}`}
            />
            <Link to="/login" aria-current={!register ? "page" : undefined}>
              Đăng nhập
            </Link>
            <Link to="/register" aria-current={register ? "page" : undefined}>
              Đăng ký
            </Link>
          </nav>
          <motion.div
            key={register ? "register" : "login"}
            className="form-content"
            initial={
              keyboard
                ? false
                : {
                    opacity: 0,
                    transform: reduced ? "none" : "translateY(8px)",
                  }
            }
            animate={{ opacity: 1, transform: "translateY(0px)" }}
            transition={{
              duration: keyboard ? 0 : 0.22,
              ease: [0.23, 1, 0.32, 1],
            }}
          >
            <span className="form-emblem">
              {register ? <UserRound size={22} /> : <Fingerprint size={25} />}
            </span>
            <div className="form-heading">
              <span className="eyebrow">
                {register ? "BẮT ĐẦU HÀNH TRÌNH" : "KHÔNG GIAN CỦA BẠN"}
              </span>
              <h1 tabIndex={-1} ref={headingRef}>
                {register ? "Tạo tài khoản mới" : "Chào mừng trở lại"}
              </h1>
              <p>
                {register
                  ? "Cùng CyberLaw mở rộng hiểu biết pháp luật."
                  : "Đăng nhập để tiếp nối điều bạn đang tìm hiểu."}
              </p>
            </div>
            {historyIntent && (
              <p className="intent-note">
                <History size={15} />
                Đăng nhập để xem lịch sử hỏi đáp của bạn.
              </p>
            )}
            <form
              ref={formRef}
              onSubmit={submit}
              noValidate
              className="auth-form"
            >
              {fields.map((field) => {
                const { label, placeholder, icon: Icon } = details[field];
                const isPassword = field === "password" || field === "confirm";
                const visible = isPassword && revealed[field];
                return (
                  <div className="form-field" key={field}>
                    <Label htmlFor={field}>{label}</Label>
                    <div
                      className={`input-wrap ${errors[field] ? "invalid" : ""}`}
                    >
                      <Icon size={18} className="input-leading" />
                      <Input
                        id={field}
                        name={field}
                        type={
                          isPassword
                            ? visible
                              ? "text"
                              : "password"
                            : field === "email"
                              ? "email"
                              : "text"
                        }
                        value={values[field]}
                        placeholder={placeholder}
                        autoComplete={
                          field === "name"
                            ? "name"
                            : field === "email"
                              ? "email"
                              : register
                                ? "new-password"
                                : "current-password"
                        }
                        spellCheck={field === "name"}
                        autoCapitalize={field === "name" ? "words" : "none"}
                        maxLength={
                          field === "name" ? 100 : field === "email" ? 191 : 128
                        }
                        required
                        aria-invalid={!!errors[field]}
                        aria-describedby={
                          [
                            errors[field] ? `${field}-error` : "",
                            register && field === "password"
                              ? "password-hint"
                              : "",
                            capsLock && isPassword ? "caps-lock" : "",
                          ]
                            .filter(Boolean)
                            .join(" ") || undefined
                        }
                        onChange={(e) => update(field, e.target.value)}
                        onBlur={() => {
                          setErrors((previous) => ({
                            ...previous,
                            [field]: validate(field),
                          }));
                          if (isPassword) setCapsLock(false);
                        }}
                        onKeyUp={(e) => {
                          if (isPassword)
                            setCapsLock(e.getModifierState("CapsLock"));
                        }}
                        onKeyDown={(e) => {
                          if (isPassword)
                            setCapsLock(e.getModifierState("CapsLock"));
                        }}
                      />
                      {isPassword && (
                        <button
                          type="button"
                          className="password-toggle"
                          aria-label={`${visible ? "Ẩn" : "Hiện"} ${field === "confirm" ? "mật khẩu xác nhận" : "mật khẩu"}`}
                          aria-pressed={!!visible}
                          onClick={() =>
                            setRevealed((previous) => ({
                              ...previous,
                              [field]: !previous[field],
                            }))
                          }
                        >
                          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      )}
                    </div>
                    {register && field === "password" && (
                      <p
                        id="password-hint"
                        className={`field-hint ${values.password.length >= 8 ? "requirement-met" : ""}`}
                      >
                        <Check size={13} />
                        Ít nhất 8 ký tự. Nên kết hợp chữ, số và ký hiệu.
                      </p>
                    )}
                    {errors[field] && (
                      <p
                        id={`${field}-error`}
                        className="field-error"
                        role="alert"
                      >
                        {errors[field]}
                      </p>
                    )}
                  </div>
                );
              })}
              {capsLock && (
                <p id="caps-lock" className="field-hint">
                  Phím Caps Lock đang bật.
                </p>
              )}
              <div
                ref={noticeRef}
                tabIndex={-1}
                className={notice ? "form-notice" : "sr-only"}
                role="status"
                aria-live="polite"
              >
                {notice && (
                  <>
                    <Info size={18} />
                    <span>{notice}</span>
                  </>
                )}
              </div>
              <Button className="submit-button" type="submit">
                {register ? "Tạo tài khoản" : "Đăng nhập"}
                <ArrowRight size={18} />
              </Button>
            </form>
            <div className="auth-divider">
              <span />
              hoặc khám phá trước
              <span />
            </div>
            <Button variant="outline" className="guest-button" asChild>
              <Link to="/search">
                <Search size={17} />
                Tra cứu không cần tài khoản
              </Link>
            </Button>
            <p className="form-switch-copy">
              {register ? "Bạn đã có tài khoản?" : "Lần đầu đến với CyberLaw?"}{" "}
              <Link to={register ? "/login" : "/register"}>
                {register ? "Đăng nhập" : "Tạo tài khoản"}
                <ArrowRight size={13} />
              </Link>
            </p>
            {!register && (
              <div
                style={{
                  marginTop: "16px",
                  padding: "12px 14px",
                  backgroundColor: "#faf8f6",
                  border: "1px dashed #d9d2cd",
                  borderRadius: "8px",
                  fontSize: "12px",
                  color: "#5c4d50",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                  textAlign: "left",
                }}
              >
                <div
                  style={{
                    fontWeight: 600,
                    color: "#800020",
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                  }}
                >
                  <ShieldCheck size={14} />
                  <span>Tài khoản thử nghiệm phân quyền:</span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <strong>Admin:</strong> <code>admin@cyberlaw.vn</code>{" "}
                    (pass: <code>admin12345</code>)
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setValues((prev) => ({
                        ...prev,
                        email: "admin@cyberlaw.vn",
                        password: "admin12345",
                      }));
                      setErrors({});
                      setNotice("");
                    }}
                    style={{
                      fontSize: "11px",
                      padding: "3px 8px",
                      borderRadius: "4px",
                      backgroundColor: "#800020",
                      color: "#fff",
                      border: "none",
                      cursor: "pointer",
                      fontWeight: 600,
                    }}
                  >
                    Điền Admin
                  </button>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <strong>User:</strong> <code>mai.nguyen@gmail.com</code>{" "}
                    (pass: <code>user12345</code>)
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setValues((prev) => ({
                        ...prev,
                        email: "mai.nguyen@gmail.com",
                        password: "user12345",
                      }));
                      setErrors({});
                      setNotice("");
                    }}
                    style={{
                      fontSize: "11px",
                      padding: "3px 8px",
                      borderRadius: "4px",
                      backgroundColor: "#4a3e40",
                      color: "#fff",
                      border: "none",
                      cursor: "pointer",
                      fontWeight: 600,
                    }}
                  >
                    Điền User
                  </button>
                </div>
              </div>
            )}
            <p className="preview-note">
              <Info size={13} />
              Bản xem trước giao diện · Chưa kết nối tài khoản
            </p>
          </motion.div>
        </div>
      </div>
      <div className="auth-under">
        <span>
          <ShieldCheck size={15} />
          Tìm hiểu pháp luật từ những nguồn có căn cứ.
        </span>
        <Link to="/help">
          Cần hướng dẫn?
          <ArrowUpRightIcon />
        </Link>
      </div>
    </div>
  );
}

function ArrowUpRightIcon() {
  return <ArrowRight size={14} style={{ transform: "rotate(-45deg)" }} />;
}

const normalize = (text: string) =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");
export default function App() {
  const location = useLocation();
  const [keyboard, setKeyboard] = useState(false);
  const mainRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const key = () => {
      setKeyboard(true);
      document.documentElement.dataset.input = "keyboard";
    };
    const pointer = () => {
      setKeyboard(false);
      document.documentElement.dataset.input = "pointer";
    };
    window.addEventListener("keydown", key);
    window.addEventListener("pointerdown", pointer);
    return () => {
      window.removeEventListener("keydown", key);
      window.removeEventListener("pointerdown", pointer);
    };
  }, []);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
    if (!["/login", "/register"].includes(location.pathname))
      mainRef.current?.focus({ preventScroll: true });
  }, [location.pathname]);
  const auth = useAuth();
  if (location.pathname.startsWith("/admin")) {
    if (!auth.isAuthenticated) {
      return <AdminAccessDenied reason="unauthenticated" />;
    }
    if (!auth.isAdmin) {
      return <AdminAccessDenied reason="forbidden" />;
    }
    return <AdminUsersPage />;
  }
  const isAuthRoute = ["/login", "/register"].includes(location.pathname);
  if (!isAuthRoute) return <MainSite />;
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Đến nội dung chính
      </a>
      <Sidebar />
      <div className="workspace">
        <header className="topbar">
          <div className="topbar-left">
            <MobileMenu />
            <span className="topbar-title">Tra cứu kiến thức pháp luật</span>
            <span className="topbar-divider" />
            <span className="topbar-subtitle">Luật An ninh mạng</span>
          </div>
          <div className="topbar-right">
            <span className="project-badge">
              <span />
              Đồ án Trí tuệ nhân tạo
            </span>
            {!auth && (
              <Link className="header-login" to="/login">
                <UserRound size={16} />
                Đăng nhập
              </Link>
            )}
          </div>
        </header>
        <main id="main-content" ref={mainRef} tabIndex={-1}>
          <Routes>
            <Route
              path="/login"
              element={<AuthPage register={false} keyboard={keyboard} />}
            />
            <Route
              path="/register"
              element={<AuthPage register keyboard={keyboard} />}
            />
          </Routes>
        </main>
        <footer className="site-footer">
          <span>© 2026 CyberLaw Search</span>
          <span>Được xây dựng để việc hiểu luật trở nên dễ dàng hơn.</span>
          <Link to="/help">
            Về dự án
            <ArrowUpRightIcon />
          </Link>
        </footer>
      </div>
      <Companion key={location.pathname} />
    </div>
  );
}
