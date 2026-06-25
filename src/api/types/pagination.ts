// swagger의 CursorInfo | PageInfo (oneOf) 대응

export interface CursorInfo {
  hasNext: boolean;
  nextCursor: number;
  size: number;
}

export interface PageInfo {
  pageIndex: number;
  size: number;
  hasNext: boolean;
  totalElements: number;
  totalPages: number;
}

export type PaginationInfo = CursorInfo | PageInfo;

// 타입 가드 — hook에서 cursor / page 분기에 사용
export function isCursorInfo(info: PaginationInfo): info is CursorInfo {
  return "nextCursor" in info;
}

export function isPageInfo(info: PaginationInfo): info is PageInfo {
  return "pageIndex" in info;
}
