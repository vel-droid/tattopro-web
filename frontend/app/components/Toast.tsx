// frontend/app/components/Toast.tsx

"use client";

export type ToastItem = {
  id: string;
  type: "success" | "error" | "info";
  message: string;
};

type Props = {
  items: ToastItem[];
  onRemove: (id: string) => void;
};

export default function ToastContainer({ items, onRemove }: Props) {
  if (!items || items.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      {items.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-center justify-between rounded-md px-3 py-2 text-sm shadow ${
            toast.type === "success"
              ? "border border-green-200 bg-green-50 text-green-800"
              : toast.type === "error"
              ? "border border-red-200 bg-red-50 text-red-800"
              : "border border-gray-200 bg-white text-gray-800"
          }`}
        >
          <span>{toast.message}</span>
          <button
            type="button"
            onClick={() => onRemove(toast.id)}
            className="ml-3 text-xs text-gray-500 hover:text-gray-800"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
