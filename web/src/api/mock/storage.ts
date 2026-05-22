import type {
  FoundItem,
  LostReport,
  Match,
  Notification,
  Pickup,
  SystemConfig,
  User,
} from '@/types';
import { seedData } from './data';

const KEY = 'lf_mock_db_v2'; // v2: 역할 체계 변경(일반사용자)으로 스키마 리셋

export interface MockDB {
  users: User[];
  passwords: Record<string, string>;
  tokens: Record<string, string>; // token -> userId
  reports: LostReport[];
  items: FoundItem[];
  matches: Match[];
  pickups: Pickup[];
  notifications: Notification[];
  config: SystemConfig;
  images: Record<string, string>; // imageId -> dataURL
}

function load(): MockDB {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      const seeded = seedData();
      localStorage.setItem(KEY, JSON.stringify(seeded));
      return seeded;
    }
    return JSON.parse(raw) as MockDB;
  } catch {
    const seeded = seedData();
    localStorage.setItem(KEY, JSON.stringify(seeded));
    return seeded;
  }
}

function save(db: MockDB) {
  localStorage.setItem(KEY, JSON.stringify(db));
}

export const mockStorage = {
  read(): MockDB {
    return load();
  },
  write(db: MockDB) {
    save(db);
  },
  reset() {
    const seeded = seedData();
    localStorage.setItem(KEY, JSON.stringify(seeded));
    return seeded;
  },
  update<T>(fn: (db: MockDB) => T): T {
    const db = load();
    const result = fn(db);
    save(db);
    return result;
  },
};

export function uid(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function addDaysIso(days: number, base?: string): string {
  const d = base ? new Date(base) : new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}
