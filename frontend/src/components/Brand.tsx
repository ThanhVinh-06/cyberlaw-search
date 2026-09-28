import { ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";

export function Brand({ onClick }: { onClick?: () => void }) {
  return (
    <Link
      className="brand"
      to="/search"
      aria-label="CyberLaw — Trang tra cứu"
      onClick={onClick}
    >
      <span className="brand-mark" aria-hidden="true">
        <ShieldCheck size={25} strokeWidth={1.6} />
      </span>
      <span>
        Cyber<span className="brand-law">Law</span>
        <small>HIỂU LUẬT · AN TÂM</small>
      </span>
    </Link>
  );
}
