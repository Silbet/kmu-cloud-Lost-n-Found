import { useEffect, useState } from 'react';

export function CountdownTimer({ targetIso }: { targetIso: string }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000 * 30);
    return () => clearInterval(id);
  }, []);
  const remaining = new Date(targetIso).getTime() - now;
  if (remaining <= 0) {
    return <span className="text-red-600 font-medium">자동 취소 시간이 지났습니다</span>;
  }
  const days = Math.floor(remaining / 86400000);
  const hours = Math.floor((remaining % 86400000) / 3600000);
  const minutes = Math.floor((remaining % 3600000) / 60000);
  return (
    <span className="font-medium text-gray-900">
      {days > 0 && `${days}일 `}
      {hours}시간 {minutes}분 남음
    </span>
  );
}
