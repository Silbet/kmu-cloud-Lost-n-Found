export function Spinner({ label = '불러오는 중...' }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-gray-500 py-6 justify-center">
      <span className="inline-block w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
      {label}
    </div>
  );
}
