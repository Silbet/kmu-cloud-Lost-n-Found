import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createLostReport } from '@/api/reports';
import { useAuthStore } from '@/store/authStore';
import { Card } from '@/components/common/Card';
import { Input } from '@/components/common/Input';
import { PhoneInput } from '@/components/common/PhoneInput';
import { Select } from '@/components/common/Select';
import { Textarea } from '@/components/common/Textarea';
import { Button } from '@/components/common/Button';
import { CATEGORIES } from '@/utils/categories';
import { toast } from '@/store/toastStore';

export function NewReportPage() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [form, setForm] = useState({
    itemName: '',
    category: CATEGORIES[0],
    lostPlace: '',       // 선택 사항
    lostDate: '',
    description: '',
    reporterContact: user?.contact ?? '',
  });
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const created = await createLostReport({
        ...form,
        lostDate: new Date(form.lostDate).toISOString(),
      });
      toast('신고가 등록되었습니다.', 'success');
      navigate(`/reports/${created.reportId}`);
    } catch (err: any) {
      toast(err?.message || '등록 실패', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-xl font-semibold mb-4">분실 신고 작성</h1>
      <Card>
        <form className="flex flex-col gap-3" onSubmit={onSubmit}>
          <Input
            label="물품명"
            value={form.itemName}
            required
            onChange={(e) => setForm({ ...form, itemName: e.target.value })}
          />
          <Select
            label="카테고리"
            options={CATEGORIES.map((c) => ({ value: c, label: c }))}
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value as any })}
          />
          <Input
            label="분실 장소 (선택)"
            value={form.lostPlace}
            onChange={(e) => setForm({ ...form, lostPlace: e.target.value })}
            placeholder="예: 북악관 1층"
          />
          <Input
            label="분실 일시"
            type="datetime-local"
            value={form.lostDate}
            required
            onChange={(e) => setForm({ ...form, lostDate: e.target.value })}
          />
          <Textarea
            label="상세 설명 (선택)"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <PhoneInput
            label="연락처"
            value={form.reporterContact}
            onChange={(val) => setForm({ ...form, reporterContact: val })}
            required
          />
          <Button type="submit" disabled={loading}>
            {loading ? '제출 중...' : '신고하기'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
