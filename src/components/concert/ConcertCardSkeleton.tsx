import Skeleton from "../common/Skeleton/Skeleton";

/** 공연 카드 로딩 스켈레톤 — ConcertCard와 동일한 레이아웃 */
export default function ConcertCardSkeleton() {
  return (
    <div className="rounded-xl overflow-hidden bg-white shadow-card">
      {/* 포스터 영역 (4:3) */}
      <div className="aspect-[4/3] bg-gradient-to-b from-poster-fallback to-poster-fallback-end animate-pulse" />

      {/* 카드 내용 */}
      <div className="p-4 space-y-2">
        <Skeleton variant="text" width="80%" height="1rem" />
        <Skeleton variant="text" width="50%" height="0.75rem" />
        <Skeleton variant="text" width="70%" height="0.75rem" />
        <Skeleton variant="text" width="60%" height="0.75rem" />
        <Skeleton variant="text" width="30%" height="1rem" />
        <Skeleton variant="text" width="100%" height="4px" />
        <Skeleton
          variant="text"
          width="100%"
          height="2.25rem"
          className="rounded-lg"
        />
      </div>
    </div>
  );
}
