import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createFoundItem } from '@/api/items';
import { uploadImage } from '@/api/upload';
import { Card } from '@/components/common/Card';
import { Input } from '@/components/common/Input';
import { Select } from '@/components/common/Select';
import { Textarea } from '@/components/common/Textarea';
import { Button } from '@/components/common/Button';
import { CATEGORIES } from '@/utils/categories';
import { toast } from '@/store/toastStore';

function buildIso(date: string, time: string): string {
  if (!date) return '';
  const t = time || '00:00';
  return new Date(`${date}T${t}:00`).toISOString();
}

export function NewItemPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    itemName: '',
    category: CATEGORIES[0] as string,
    foundPlace: '',
    foundDate: '',   // yyyy-MM-dd
    foundTime: '',   // HH:mm
    description: '',
    imageUrl: undefined as string | undefined,
  });
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  async function handleImage(file: File) {
    setUploading(true);
    try {
      const { imageUrl } = await uploadImage(file);
      setForm((f) => ({ ...f, imageUrl }));
    } catch (e: any) {
      toast(e?.message || '업로드 실패', 'error');
    } finally {
      setUploading(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.foundDate) {
      toast('습득 날짜를 선택해주세요.', 'error');
      return;
    }
    setLoading(true);
    try {
      const foundDateIso = buildIso(form.foundDate, form.foundTime);
      await createFoundItem({
        itemName: form.itemName,
        category: form.category,
        foundPlace: form.foundPlace,
        foundDate: foundDateIso,
        description: form.description,
        imageUrl: form.imageUrl,
      });
      toast('습득물이 등록되었습니다. 보관소에 물품을 전달해주세요. 보관 위치가 등록되면 매칭이 시작됩니다.', 'success');
      navigate('/items/my');
    } catch (err: any) {
      toast(err?.message || '등록 실패', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-xl font-semibold mb-4">습득물 등록</h1>
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
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          />
          <Input
            label="습득 장소"
            value={form.foundPlace}
            required
            onChange={(e) => setForm({ ...form, foundPlace: e.target.value })}
          />

          {/* 커스텀 날짜 + 시간 피커 */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-1">습득 일시</p>
            <div className="flex gap-2 items-center">
              <input
                type="date"
                value={form.foundDate}
                onChange={(e) => setForm({ ...form, foundDate: e.target.value })}
                required
                className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="time"
                value={form.foundTime}
                onChange={(e) => setForm({ ...form, foundTime: e.target.value })}
                className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {form.foundDate && (
              <p className="text-xs text-gray-500 mt-1">
                선택된 일시: {new Date(buildIso(form.foundDate, form.foundTime)).toLocaleString('ko-KR')}
              </p>
            )}
          </div>

          <Textarea
            label="상세 설명 (선택)"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700">이미지 (선택)</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => e.target.files?.[0] && handleImage(e.target.files[0])}
              className="text-sm"
            />
            {uploading && <p className="text-xs text-gray-500 mt-1">업로드 중...</p>}
            {form.imageUrl && (
              <img src={form.imageUrl} alt="" className="mt-2 max-h-40 rounded border border-gray-200" />
            )}
          </div>
          <Button type="submit" disabled={loading || uploading}>
            {loading ? '제출 중...' : '등록하기'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
