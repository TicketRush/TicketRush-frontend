import { useState } from "react";
import { Link } from "react-router-dom";
import { useBanners } from "@/hooks/queries/useBanners";
import { useDocumentTitle } from "@/hooks/common/useDocumentTitle";
import type { BannerItem } from "@/types/domain/banner";

export default function AdminBannersPage() {
  useDocumentTitle("배너 관리");
  const { data: banners, isPending, isError, isFetching, refetch } = useBanners();

  return (
    <div className="p-4 sm:p-8 space-y-6">
      <header>
        <span className="text-[10px] font-bold tracking-wider bg-admin-dark-bg text-admin-text px-2 py-1 rounded">BANNER MANAGEMENT</span>
        <h1 className="text-3xl font-bold mt-2">배너 관리</h1>
        <p className="text-sm text-admin-text-secondary mt-1">메인 배너는 최대 3개까지 등록할 수 있습니다. 배너 설정은 해당 공연 수정 화면에서 변경할 수 있습니다.</p>
      </header>

      {isError ? (
        <div role="alert" className="rounded-xl border border-admin-border bg-admin-card p-6 space-y-3">
          <p>배너 목록을 불러오지 못했습니다.</p>
          <button type="button" disabled={isFetching} onClick={() => void refetch()}
            className="rounded-lg border border-admin-border px-4 py-2 text-sm hover:bg-admin-border disabled:opacity-50">
            {isFetching ? "다시 불러오는 중..." : "다시 시도"}
          </button>
        </div>
      ) : isPending || !banners ? (
        <p role="status" className="text-sm text-admin-text-secondary">배너 목록을 불러오는 중입니다.</p>
      ) : (
        <>
          <p className="text-lg font-semibold">현재 배너 {banners.length} / 3</p>
          {banners.length === 0 ? (
            <p className="rounded-xl border border-admin-border bg-admin-card p-8 text-center text-admin-text-secondary">현재 등록된 배너가 없습니다.</p>
          ) : (
            <ul className="space-y-4" aria-label="등록된 배너">
              {banners.map((banner) => <BannerRow key={banner.performanceId} banner={banner} />)}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

function BannerRow({ banner }: { banner: BannerItem }) {
  const [failedUrl, setFailedUrl] = useState<string>();
  const imageUrl = banner.imageUrl?.trim();
  return (
    <li className="flex flex-col gap-4 rounded-xl border border-admin-border bg-admin-card p-4 sm:flex-row sm:items-center sm:p-6">
      <div className="flex aspect-[2/3] w-24 max-w-full min-w-0 shrink-0 items-center justify-center rounded-lg bg-admin-bg">
        {imageUrl && failedUrl !== imageUrl ? (
          <img src={imageUrl} alt={`${banner.title} 대표 이미지`} onError={() => setFailedUrl(imageUrl)}
            className="h-full w-full rounded-lg object-contain" />
        ) : <span className="text-xs text-admin-text-secondary">이미지 없음</span>}
      </div>
      <div className="min-w-0 flex-1 break-words">
        <p className="text-sm text-admin-text-secondary">순서 {banner.order}</p>
        <h2 className="mt-1 text-lg font-semibold">{banner.title}</h2>
        {banner.subtitle && <p className="mt-1 text-sm text-admin-text-secondary">{banner.subtitle}</p>}
        {banner.date && <p className="mt-2 text-sm">공연 날짜: <time dateTime={banner.date}>{banner.date}</time></p>}
      </div>
      <Link to={`/admin/concerts/${banner.performanceId}/edit`} aria-label={`${banner.title} 공연 수정`}
        className="shrink-0 rounded-lg bg-primary px-4 py-2 text-center text-sm font-medium text-white hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
        공연 수정
      </Link>
    </li>
  );
}
