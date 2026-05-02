"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

export type ToastVariant = "default" | "success" | "error";

export type ToastProps = {
  message: string;
  variant?: ToastVariant;
  show: boolean;
  onHide?: () => void;
  duration?: number;
};

export function Toast({
  message,
  variant = "default",
  show,
  onHide,
  duration = 3500,
}: ToastProps) {
  useEffect(() => {
    if (!show) return;
    const t = setTimeout(() => {
      onHide?.();
    }, duration);
    return () => clearTimeout(t);
  }, [show, duration, onHide, message]);

  return (
    <div
      className={`toast-mobile transition-opacity duration-200 ${
        show ? "opacity-100" : "opacity-0"
      }`}
      hidden={!show}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className={`toast${variant !== "default" ? ` ${variant}` : ""}`}>
        <span>{message}</span>
      </div>
    </div>
  );
}

type ToastContextValue = {
  show: (message: string, variant?: ToastVariant, duration?: number) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

type ToastState = {
  id: number;
  message: string;
  variant: ToastVariant;
  duration: number;
  show: boolean;
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const idRef = useRef(0);

  const show = useCallback(
    (message: string, variant: ToastVariant = "default", duration = 3500) => {
      idRef.current += 1;
      setToast({ id: idRef.current, message, variant, duration, show: true });
    },
    [],
  );

  const handleHide = useCallback(() => {
    setToast((prev) => (prev ? { ...prev, show: false } : prev));
  }, []);

  const value = useMemo<ToastContextValue>(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Toast
        key={toast?.id ?? "empty"}
        message={toast?.message ?? ""}
        variant={toast?.variant ?? "default"}
        show={!!toast?.show}
        duration={toast?.duration ?? 3500}
        onHide={handleHide}
      />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      show: () => {
        if (typeof console !== "undefined") {
          console.warn("useToast called outside ToastProvider");
        }
      },
    };
  }
  return ctx;
}

export default Toast;
