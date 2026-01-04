// app/components/Toast.tsx
"use client";

export type ToastItem = {
  id: string;
  type: "success" | "error";
  message: string;
};

type Props = {
  toasts: ToastItem[];
  onClose: (id: string) => void;
};

export default function ToastContainer({ toasts, onClose }: Props) {
  if (!toasts.length) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-center justify-between rounded-md px-3 py-2 text-sm shadow ${
            toast.type === "success"
              ? "bg-green-600 text-white"
              : "bg-red-600 text-white"
          }`}
        >
          <span>{toast.message}</span>
          <button
            type="button"
            onClick={() => onClose(toast.id)}
            className="ml-3 text-xs underline"
          >
            Закрыть
          </button>
        </div>
      ))}
    </div>
  );
}
