import { useState } from "react";
import { Link } from "react-router-dom";
import { Calendar } from "lucide-react";
import type { BannerItem } from "@/types/domain/banner";

interface Props {
  banner: BannerItem;
  // Presentation input only, NOT a BannerResponse field. The current API has no
  // image URL; supply this only once the backend image contract is confirmed.
  posterUrl?: string;
}

export default function BannerSlide({ banner, posterUrl }: Props) {
  const [failedUrl, setFailedUrl] = useState<string>();
  const imageUrl = posterUrl?.trim();
  const showImage = !!imageUrl && imageUrl !== failedUrl;
  const linkedId = banner.linkConcertId;
  const isLinked = linkedId !== undefined && Number.isSafeInteger(linkedId) && linkedId > 0;

  const content = (
    <>
      {showImage && (
        <img
          src={imageUrl}
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full scale-110 object-cover opacity-60 blur-2xl"
        />
      )}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/80 to-slate-950/10" />
      <div className="relative flex min-h-48 items-center gap-4 p-5 text-white sm:gap-6 sm:p-8">
        <div className="min-w-0 flex-1 break-words">
          {banner.tagLabel && (
            <span className="mb-3 inline-block rounded-full bg-white/20 px-3 py-1 text-xs font-semibold">
              {banner.tagLabel}
            </span>
          )}
          <h2 className="mb-1 text-xl font-bold sm:text-3xl">
            {banner.iconEmoji && <span aria-hidden="true" className="mr-2">{banner.iconEmoji}</span>}
            {banner.title}
          </h2>
          {banner.subtitle && <p className="mb-2 line-clamp-2 text-base font-semibold sm:text-lg">{banner.subtitle}</p>}
          {banner.description && <p className="mb-3 line-clamp-3 text-sm text-white/90">{banner.description}</p>}
          {banner.date && (
            <div className="flex items-center gap-1.5 text-sm">
              <Calendar size={14} aria-hidden="true" className="shrink-0" />
              <span>{banner.date}</span>
            </div>
          )}
        </div>
        {showImage ? (
          <img
            src={imageUrl}
            alt={`${banner.title} 대표 이미지`}
            onError={() => setFailedUrl(imageUrl)}
            className="max-h-40 w-1/3 min-w-0 shrink-0 object-contain object-right sm:max-h-56"
          />
        ) : banner.iconEmoji ? (
          <span aria-hidden="true" className="hidden shrink-0 select-none text-7xl text-white/20 sm:block">
            {banner.iconEmoji}
          </span>
        ) : null}
      </div>
    </>
  );
  const className = "relative block overflow-hidden rounded-2xl bg-slate-800";
  return isLinked ? (
    <Link to={`/concerts/${linkedId}`} aria-label={`${banner.title} 공연 상세 보기`}
      className={`${className} focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary`}>
      {content}
    </Link>
  ) : <div className={className}>{content}</div>;
}
