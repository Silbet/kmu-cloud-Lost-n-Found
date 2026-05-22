export type FoundItemStatus = '등록' | '보관중' | '수령대기' | '수령완료' | '폐기예정';

export interface FoundItem {
  itemId: string;
  finderId: string;
  finderName?: string;
  finderContact?: string;
  itemName: string;
  category: string;
  foundPlace: string;
  foundDate: string;
  description: string;
  imageUrl?: string;
  storageLocation?: string;
  status: FoundItemStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFoundItemRequest {
  itemName: string;
  category: string;
  foundPlace: string;
  foundDate: string;
  description: string;
  imageUrl?: string;
}
