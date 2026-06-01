import { useToastStore } from '@/store/toastStore';

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const remove = useToastStore((s) => s.remove);
  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          onClick={() => remove(t.id)}
          className={`px-4 py-2 rounded-md text-sm shadow border cursor-pointer ${
            t.kind === 'success' ? 'bg-green-50 border-green-200 text-green-800'
            : t.kind === 'error' ? 'bg-red-50 border-red-200 text-red-800'
            : 'bg-white border-gray-200 text-gray-800'
          }`}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
