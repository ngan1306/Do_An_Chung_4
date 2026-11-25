/** Overlay thong bao ngan (toast) - doc tu useHome. */
import { useHome } from '../state/HomeContext';

export function ToastOverlay() {
  const { toasts, dismissToast } = useHome();
  if (toasts.length === 0) return null;
  return (
    <div className="toast-wrap">
      {toasts.map((toast) => (
        <button
          key={toast.id}
          type="button"
          className={`toast toast-${toast.level}`}
          onClick={() => dismissToast(toast.id)}
        >
          {toast.message}
        </button>
      ))}
    </div>
  );
}
