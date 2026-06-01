export const CATEGORIES = ['가방', '전자기기', '지갑', '신분증', '의류', '기타'] as const;
export type Category = (typeof CATEGORIES)[number];
