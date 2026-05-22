/** 이름 마스킹: 홍길동 → 홍*동, 이서연 → 이*연 */
export function maskName(name: string): string {
  if (!name) return '';
  if (name.length === 1) return '*';
  if (name.length === 2) return name[0] + '*';
  return name[0] + '*'.repeat(name.length - 2) + name[name.length - 1];
}

/** 연락처 마스킹: 010-1234-5678 → 010-****-5678 */
export function maskContact(contact: string): string {
  if (!contact) return '';
  return contact.replace(/(\d{3})-(\d{3,4})-(\d{4})/, '$1-****-$3');
}

/** 이메일 마스킹: user@example.com → u***@example.com */
export function maskEmail(email: string): string {
  if (!email) return '';
  const [local, domain] = email.split('@');
  if (!domain) return email;
  const masked = local.length <= 1 ? '*' : local[0] + '***';
  return `${masked}@${domain}`;
}

/**
 * 전화번호 자동 하이픈 포맷
 * 숫자만 입력받아 010-1234-5678 형식으로 변환
 */
export function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}
