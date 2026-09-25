// 사용:
//   const ref = useRef<HTMLDivElement>(null);
//   ...
//   <div ref={ref}>{/* 캡처될 영역 */}</div>
//   <button onClick={() => downloadTicket(ref.current, `ticket-${id}.png`)}>
//     다운로드
//   </button>

import html2canvas from "html2canvas";

/**
 * 다운로드본 고정 폭(px).
 *
 * 화면에 붙은 원본을 그대로 캡처하면 브라우저 창 폭·줌·스크롤 위치에 따라
 * PNG 크기와 레이아웃이 달라진다(좁은 창에서는 768px짜리 찌그러진 이미지가
 * 나왔다). 항상 같은 폭의 사본을 만들어 캡처한다.
 */
const CAPTURE_WIDTH = 640;

/** html2canvas `scale`과 맞춘다. 포스터만 1배로 자르면 PNG에서 흐리다. */
const CAPTURE_SCALE = 2;

/**
 * lucide 아이콘은 `stroke="currentColor"` SVG다.
 * SVG를 `data:image/svg+xml`로만 바꾸면 html2canvas가 `<circle>` 획을 다시 비운다.
 * 브라우저가 PNG로 그린 뒤에 그 이미지만 캡처에 넘긴다.
 */
async function replaceSvgIcons(root: HTMLElement): Promise<void> {
  await Promise.all([...root.querySelectorAll("svg")].map(replaceSvgIcon));
}

async function replaceSvgIcon(svg: SVGElement): Promise<void> {
  const style = getComputedStyle(svg);
  const color = style.color || "#111827";
  const width =
    Math.ceil(svg.getBoundingClientRect().width) ||
    Number(svg.getAttribute("width")) ||
    24;
  const height =
    Math.ceil(svg.getBoundingClientRect().height) ||
    Number(svg.getAttribute("height")) ||
    24;

  const painted = svg.cloneNode(true) as SVGElement;
  painted.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  painted.setAttribute("width", String(width));
  painted.setAttribute("height", String(height));
  for (const el of [painted, ...painted.querySelectorAll("*")]) {
    for (const name of ["stroke", "fill"] as const) {
      if (el.getAttribute(name) === "currentColor") el.setAttribute(name, color);
    }
  }

  const xml = new XMLSerializer().serializeToString(painted);
  let src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}`;
  try {
    src = await rasterizeSvgPng(xml, width, height);
  } catch {
    // PNG로 못 그리면 기존 SVG 이미지를 남긴다.
  }

  const img = document.createElement("img");
  img.alt = "";
  img.width = width;
  img.height = height;
  img.style.cssText = `width:${width}px;height:${height}px;display:block;`;
  img.src = src;
  svg.replaceWith(img);
}

function rasterizeSvgPng(
  xml: string,
  width: number,
  height: number,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, width * CAPTURE_SCALE);
      canvas.height = Math.max(1, height * CAPTURE_SCALE);
      const ctx = canvas.getContext("2d");
      if (!ctx || !image.naturalWidth || !image.naturalHeight) {
        reject(new Error("svg raster failed"));
        return;
      }
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      try {
        resolve(canvas.toDataURL("image/png"));
      } catch (error) {
        reject(error);
      }
    };
    image.onerror = () => reject(new Error("svg load failed"));
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}`;
  });
}

/**
 * html2canvas는 `object-fit`과 퍼센트 높이를 무시한다.
 * 포스터는 `h-full` + `object-cover` + `overflow-hidden`이라 캡처본에서 빈 칸이 된다.
 * 레이아웃이 잡힌 뒤 박스 크기로 cover 크롭한 이미지를 넣는다.
 * CORS로 읽지 못하면 노드는 그대로 둔다. overflow를 풀어도 그 이미지는 그려지지 않는다.
 */
async function bakeCoverImages(root: HTMLElement): Promise<void> {
  const imgs = [...root.querySelectorAll("img")].filter(
    (img) => !img.src.startsWith("data:"),
  );

  await Promise.all(
    imgs.map(async (img) => {
      const fit = getComputedStyle(img).objectFit;
      if (fit !== "cover" && fit !== "contain") return;

      const box = img.getBoundingClientRect();
      const parent = img.parentElement?.getBoundingClientRect();
      const width = Math.round(box.width || parent?.width || 0);
      const height = Math.round(box.height || parent?.height || 0);
      if (width < 2 || height < 2) return;

      const src = img.currentSrc || img.src;
      try {
        img.src = await fittedImageDataUrl(
          src,
          width * CAPTURE_SCALE,
          height * CAPTURE_SCALE,
          fit,
        );
      } catch {
        return;
      }
      img.style.width = `${width}px`;
      img.style.height = `${height}px`;
      img.style.objectFit = "fill";
    }),
  );
}

/**
 * 화면의 `<img>`는 CORS 없이 받아 디스크 캐시에 남긴다.
 * 같은 주소로 다시 받으면 그 캐시가 재사용되고, 응답에
 * `Access-Control-Allow-Origin`이 없어 캔버스가 포스터를 버린다.
 * 저장용 요청만 쿼리를 붙여 캐시를 피한다. 서명된 URL은 쿼리를 바꾸면 깨지므로 그대로 둔다.
 */
function posterCorsSrc(src: string): string {
  try {
    const url = new URL(src, window.location.href);
    const signed = [...url.searchParams.keys()].some((key) =>
      key.toLowerCase().startsWith("x-amz-"),
    );
    if (signed) return src;
    url.searchParams.set("ticket_cors", "1");
    return url.toString();
  } catch {
    const join = src.includes("?") ? "&" : "?";
    return `${src}${join}ticket_cors=1`;
  }
}

function fittedImageDataUrl(
  src: string,
  width: number,
  height: number,
  fit: string,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx || !image.naturalWidth || !image.naturalHeight) {
        reject(new Error("poster draw failed"));
        return;
      }
      const scale =
        fit === "contain"
          ? Math.min(width / image.naturalWidth, height / image.naturalHeight)
          : Math.max(width / image.naturalWidth, height / image.naturalHeight);
      const dw = image.naturalWidth * scale;
      const dh = image.naturalHeight * scale;
      ctx.drawImage(image, (width - dw) / 2, (height - dh) / 2, dw, dh);
      try {
        resolve(canvas.toDataURL("image/png"));
      } catch {
        reject(new Error("poster tainted"));
      }
    };
    image.onerror = () => reject(new Error("poster load failed"));
    image.src = posterCorsSrc(src);
  });
}

/**
 * truncate(`overflow:hidden` + `text-overflow:ellipsis` + `white-space:nowrap`)는
 * html2canvas가 재현하지 못한다. 말줄임표 대신 원문을 그대로 그리면서 박스 밖으로
 * 삐져나온 글자를 잘라내기 때문에 공연명·좌석·예매번호가 깨져 보인다.
 * 캡처 사본에서는 잘라내기를 끄고 줄바꿈으로 바꾼다.
 */
function releaseTextClipping(root: HTMLElement): void {
  for (const el of root.querySelectorAll<HTMLElement>("*")) {
    const style = getComputedStyle(el);
    if (style.textOverflow !== "ellipsis" && style.whiteSpace !== "nowrap") {
      continue;
    }
    el.style.textOverflow = "clip";
    el.style.whiteSpace = "normal";
    el.style.overflow = "visible";
    el.style.overflowWrap = "anywhere";
  }
}

/** 폰트·이미지가 아직 안 올라온 상태로 캡처하면 글자 위치가 밀리거나 포스터가 빈다 */
async function waitForAssets(root: HTMLElement): Promise<void> {
  await document.fonts?.ready;
  await Promise.all(
    Array.from(root.querySelectorAll("img")).map(
      (img) =>
        img.complete ||
        new Promise<void>((resolve) => {
          img.addEventListener("load", () => resolve(), { once: true });
          img.addEventListener("error", () => resolve(), { once: true });
        }),
    ),
  );
  // 스타일 적용 후 레이아웃이 확정되도록 한 프레임 넘긴다
  await new Promise((resolve) => requestAnimationFrame(resolve));
}

/**
 * 캡처 영역의 사본을 고정 폭으로 그려 canvas를 만든다.
 * 원본 DOM은 건드리지 않는다.
 */
export async function renderTicketCanvas(
  element: HTMLElement,
): Promise<HTMLCanvasElement> {
  const stage = document.createElement("div");
  stage.setAttribute("aria-hidden", "true");
  stage.style.cssText = [
    "position:fixed",
    "top:0",
    `left:-${CAPTURE_WIDTH * 2}px`,
    `width:${CAPTURE_WIDTH}px`,
    "background:#ffffff",
    "pointer-events:none",
  ].join(";");

  const clone = element.cloneNode(true) as HTMLElement;
  clone.style.width = "100%";
  clone.style.maxWidth = "none";
  clone.style.margin = "0";
  stage.appendChild(clone);
  document.body.appendChild(stage);

  try {
    releaseTextClipping(clone);
    await replaceSvgIcons(clone);
    await waitForAssets(stage);
    await bakeCoverImages(clone);
    await waitForAssets(stage);

    // 높이를 넘겨주지 않으면 html2canvas가 창 높이 기준으로 잘라낸 canvas를
    // 만든다(세로로 잘린 이미지의 원인). windowWidth도 고정해 캡처 시점의
    // 반응형 분기를 CAPTURE_WIDTH에 맞춘다.
    const height = Math.ceil(stage.getBoundingClientRect().height);

    return await html2canvas(stage, {
      backgroundColor: "#ffffff",
      scale: CAPTURE_SCALE, // 고해상도 (Retina 대응)
      useCORS: true, // cross-origin 이미지(포스터 등) 대응
      width: CAPTURE_WIDTH,
      height,
      windowWidth: CAPTURE_WIDTH,
      windowHeight: height,
      scrollX: 0,
      scrollY: 0,
    });
  } finally {
    stage.remove();
  }
}

export async function downloadTicket(
  element: HTMLElement | null,
  filename: string,
): Promise<void> {
  if (!element) return;

  try {
    const canvas = await renderTicketCanvas(element);

    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/png"),
    );
    if (!blob) {
      alert("이미지 생성에 실패했습니다.");
      return;
    }

    // 다운로드 트리거 (임시 <a> 태그로 클릭)
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("티켓 다운로드 실패:", error);
    alert("티켓 다운로드 중 오류가 발생했습니다.");
  }
}
