import type { ReactNode } from "react";
import { AdminDialog } from "./AdminDialog";

export function KnowledgeDialog({
  open,
  title,
  description,
  instant,
  trigger,
  onClose,
  children,
  footer,
  wide = false,
  revealKey = title,
}: {
  open: boolean;
  title: string;
  description: string;
  instant: boolean;
  trigger: HTMLElement | null;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
  revealKey?: string;
}) {
  return (
    <AdminDialog
      open={open}
      title={title}
      description={description}
      instant={instant}
      trigger={trigger}
      onClose={onClose}
      className={`cl-knowledge-dialog ${wide ? "is-wide" : ""}`}
      revealKey={revealKey}
    >
      <div className="cl-knowledge-dialog-body">{children}</div>
      {footer && (
        <footer className="cl-knowledge-dialog-footer">{footer}</footer>
      )}
    </AdminDialog>
  );
}
