'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
} from 'react';
import { createPortal } from 'react-dom';
import styles from './Toast.module.css';
import type { ToastType } from '@/types';

interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
  duration: number;
}

interface ToastFunction {
  (message: string, type?: ToastType, duration?: number): number;
  success: (message: string, duration?: number) => number;
  error: (message: string, duration?: number) => number;
  warning: (message: string, duration?: number) => number;
  info: (message: string, duration?: number) => number;
}

const ToastContext = createContext<ToastFunction | null>(null);

let toastIdCounter = 0;

interface ToastIconProps {
  type: ToastType;
}

function ToastIcon({ type }: ToastIconProps) {
  const icons: Record<ToastType, React.ReactNode> = {
    success: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M6 10L9 13L14 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="10" cy="10" r="8.5" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
    error: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="10" cy="10" r="8.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M13 7L7 13M7 7L13 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    warning: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M10 6V11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="10" cy="14" r="0.75" fill="currentColor" />
        <path d="M8.86 3.5L1.21 16.5C0.88 17.08 1.3 17.8 1.97 17.8H17.03C17.7 17.8 18.12 17.08 17.79 16.5L10.14 3.5C9.81 2.93 9.19 2.93 8.86 3.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    ),
    info: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="10" cy="10" r="8.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M10 9V14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="10" cy="6.5" r="0.75" fill="currentColor" />
      </svg>
    ),
  };

  return <span className={styles.icon} aria-hidden="true">{icons[type]}</span>;
}

interface ToastItemComponentProps {
  toast: ToastItem;
  onDismiss: (id: number) => void;
}

function ToastItemComponent({ toast, onDismiss }: ToastItemComponentProps) {
  const [exiting, setExiting] = useState<boolean>(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    setExiting(true);
    setTimeout(() => onDismiss(toast.id), 250);
  }, [toast.id, onDismiss]);

  useEffect(() => {
    if (toast.duration > 0) {
      timerRef.current = setTimeout(dismiss, toast.duration);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [toast.duration, dismiss]);

  return (
    <div
      className={[
        styles.toast,
        styles[`toast--${toast.type}`],
        exiting ? styles['toast--exit'] : '',
      ]
        .filter(Boolean)
        .join(' ')}
      role="alert"
      aria-live="assertive"
    >
      <ToastIcon type={toast.type} />
      <p className={styles.message}>{toast.message}</p>
      <button
        onClick={dismiss}
        className={styles.dismissBtn}
        aria-label="Tutup notifikasi"
        type="button"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}

interface ToastProviderProps {
  children: React.ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const addToast = useCallback(({ type = 'info' as ToastType, message, duration = 4000 }: { type?: ToastType; message: string; duration?: number }) => {
    const id = ++toastIdCounter;
    setToasts((prev: ToastItem[]) => [...prev, { id, type, message, duration }]);
    return id;
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts((prev: ToastItem[]) => prev.filter((t: ToastItem) => t.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, type: ToastType = 'info', duration: number = 4000) =>
      addToast({ type, message, duration }),
    [addToast]
  ) as ToastFunction;

  toast.success = (message: string, duration?: number) =>
    addToast({ type: 'success', message, duration: duration ?? 4000 });
  toast.error = (message: string, duration?: number) =>
    addToast({ type: 'error', message, duration: duration ?? 5000 });
  toast.warning = (message: string, duration?: number) =>
    addToast({ type: 'warning', message, duration: duration ?? 4000 });
  toast.info = (message: string, duration?: number) =>
    addToast({ type: 'info', message, duration: duration ?? 4000 });

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {mounted &&
        createPortal(
          <div className={styles.container} aria-label="Notifikasi">
            {toasts.map((t: ToastItem) => (
              <ToastItemComponent key={t.id} toast={t} onDismiss={removeToast} />
            ))}
          </div>,
          document.body
        )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastFunction {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast harus digunakan di dalam ToastProvider');
  }
  return ctx;
}

export default ToastProvider;
