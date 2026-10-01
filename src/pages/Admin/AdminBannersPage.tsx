import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import Pagination from "@/components/admin/Pagination";
import { useAdminConcerts } from "@/hooks/admin/useAdmin";
import { useUpdateConcertBanner } from "@/hooks/admin/useAdminBanners";
import { useBanners } from "@/hooks/queries/useBanners";
import { useDocumentTitle } from "@/hooks/common/useDocumentTitle";
import { MAX_BANNERS, type BannerItem } from "@/types/domain/banner";

export default function AdminBannersPage() {
  useDocumentTitle("배너 관리");
  const { data: banners, isPending, isError, isFetching, refetch } = useBanners();
  const [page, setPage] = useState(0);
  const concerts = useAdminConcerts({ page, size: 10 }, { refetchOnMount: "always" });
  const mutation = useUpdateConcertBanner();
  const changing = useRef(false);
  const currentBanners = (banners ?? []).filter((banner, index, items) =>
    items.findIndex((other) => other.performanceId === banner.performanceId) === index);
  const currentIds = new Set(currentBanners.map((banner) => banner.performanceId));
  const candidates = concerts.data?.items.filter((concert, index, items) =>
    !currentIds.has(concert.id) && items.findIndex((other) => other.id === concert.id) === index);
  const unavailable = isPending || isError || !banners;
  const full = currentBanners.length >= MAX_BANNERS;

  async function changeBanner(id: number, displayOnBanner: boolean) {
    if (changing.current || mutation.isPending || unavailable || isFetching) return;
    if (displayOnBanner && (full || currentIds.has(id) || concerts.isFetching || concerts.isError || !candidates?.some((item) => item.id === id))) return;
    changing.current = true;
    try {
      await mutation.mutateAsync({ id, displayOnBanner });
      toast.success(displayOnBanner ? "배너에 추가되었습니다." : "배너에서 제거되었습니다.");
    } catch (error) {
      toast.error(error instanceof Error && error.message ? error.message : "배너 변경에 실패했습니다.");
    } finally {
      changing.current = false;
    }
  }

  return (
    <div className="p-4 sm:p-8 space-y-6">
      <header>
        <span className="text-[10px] font-bold tracking-wider bg-admin-dark-bg text-admin-text px-2 py-1 rounded">BANNER MANAGEMENT</span>
        <h1 className="text-3xl font-bold mt-2">배너 관리</h1>
        <p className="text-sm text-admin-text-secondary mt-1">메인 배너는 최대 {MAX_BANNERS}개까지 등록할 수 있습니다. 배너에서 제거해도 공연은 삭제되지 않습니다.</p>
      </header>

      {isError && (
        <div role="alert" className="rounded-xl border border-admin-border bg-admin-card p-6 space-y-3">
          <p>배너 목록을 불러오지 못했습니다.</p>
          <button type="button" disabled={isFetching} onClick={() => void refetch()}
            className="rounded-lg border border-admin-border px-4 py-2 text-sm hover:bg-admin-border disabled:opacity-50">
            {isFetching ? "다시 불러오는 중..." : "다시 시도"}
          </button>
        </div>
      )}
      {!banners ? isPending ? (
        <p role="status" className="text-sm text-admin-text-secondary">배너 목록을 불러오는 중입니다.</p>
      ) : null : (
        <>
          <p className="text-lg font-semibold">현재 배너 {currentBanners.length} / {MAX_BANNERS}</p>
          {currentBanners.length === 0 ? (
            <p className="rounded-xl border border-admin-border bg-admin-card p-8 text-center text-admin-text-secondary">현재 등록된 배너가 없습니다.</p>
          ) : (
            <ul className="space-y-4" aria-label="등록된 배너">
              {currentBanners.map((banner) => <BannerRow key={banner.performanceId} banner={banner}
                disabled={mutation.isPending || isFetching || unavailable}
                onRemove={() => void changeBanner(banner.performanceId, false)} />)}
            </ul>
          )}
        </>
      )}
      <section className="rounded-xl border border-admin-border bg-admin-card p-6 space-y-4" aria-labelledby="add-banner-heading">
        <h2 id="add-banner-heading" className="text-lg font-semibold">배너 추가</h2>
        {full && <p className="text-sm text-admin-text-secondary">배너 {MAX_BANNERS}개가 모두 등록되어 새로운 배너를 등록할 수 없습니다.</p>}
        {unavailable ? <p className="text-sm text-admin-text-secondary">배너 목록을 확인한 후 추가할 수 있습니다.</p>
          : concerts.isError ? <div role="alert">
            <p>공연 목록을 불러오지 못했습니다.</p>
            <button type="button" disabled={concerts.isFetching} onClick={() => void concerts.refetch()}
              className="mt-2 rounded-lg border border-admin-border px-4 py-2 text-sm disabled:opacity-50">공연 목록 다시 시도</button>
          </div>
          : concerts.isPending || !concerts.data ? <p role="status">공연 목록을 불러오는 중입니다.</p>
          : <>
            {candidates?.length ? <ul aria-label="배너 추가 후보" className="space-y-3">
              {candidates.map((concert) => <li key={concert.id} className="flex items-center justify-between gap-4">
                <div className="min-w-0 break-words"><p className="font-medium">{concert.title}</p>
                  <p className="text-sm text-admin-text-secondary">{concert.date} {concert.showTime}</p></div>
                <button type="button" aria-label={`${concert.title} 배너 추가`}
                  disabled={full || mutation.isPending || isFetching || concerts.isFetching}
                  onClick={() => void changeBanner(concert.id, true)}
                  className="shrink-0 rounded-lg bg-primary px-4 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-50">추가</button>
              </li>)}
            </ul> : <p className="text-sm text-admin-text-secondary">{concerts.data.pagination.totalPages > 1 ? "이 페이지에는 추가 가능한 공연이 없습니다. 다른 페이지를 확인해주세요." : "추가 가능한 공연이 없습니다."}</p>}
            <Pagination pageIndex={page} totalPages={concerts.data.pagination.totalPages} onChange={setPage} />
          </>}
      </section>
      {mutation.isPending && <p role="status" className="text-sm text-admin-text-secondary">배너 설정을 변경하는 중입니다.</p>}
    </div>
  );
}

function BannerRow({ banner, disabled, onRemove }: { banner: BannerItem; disabled: boolean; onRemove: () => void }) {
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
      <button type="button" aria-label={`${banner.title} 배너에서 제거`} disabled={disabled} onClick={onRemove}
        className="shrink-0 rounded-lg border border-admin-border px-4 py-2 text-sm hover:bg-admin-border disabled:cursor-not-allowed disabled:opacity-50">
        배너에서 제거
      </button>
    </li>
  );
}
