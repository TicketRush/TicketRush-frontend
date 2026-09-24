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

/**
 * lucide 아이콘은 `stroke="currentColor"` SVG다.
 * html2canvas는 `<circle>`·currentColor 획을 비워 그린다.
 * 체크 아이콘이 민트색 원만 남는 이유다. 계산된 색을 박은 뒤 비트맵으로 바꾼다.
 */
function replaceSvgIcons(root: HTMLElement): void {
  for (const svg of root.querySelectorAll("svg")) {
    const style = getComputedStyle(svg);
    const color = style.color || "#111827";
    const width = Math.ceil(svg.getBoundingClientRect().width) || Number(svg.getAttribute("width")) || 24;
    const height = Math.ceil(svg.getBoundingClientRect().height) || Number(svg.getAttribute("height")) || 24;

    const painted = svg.cloneNode(true) as SVGElement;
    painted.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    painted.setAttribute("width", String(width));
    painted.setAttribute("height", String(height));
    for (const el of [painted, ...painted.querySelectorAll("*")]) {
      for (const name of ["stroke", "fill"] as const) {
        if (el.getAttribute(name) === "currentColor") el.setAttribute(name, color);
      }
    }

    const img = document.createElement("img");
    img.alt = "";
    img.width = width;
    img.height = height;
    img.style.cssText = `width:${width}px;height:${height}px;display:block;`;
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
      new XMLSerializer().serializeToString(painted),
    )}`;
    svg.replaceWith(img);
  }
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
    replaceSvgIcons(clone);
    await waitForAssets(stage);

    // 높이를 넘겨주지 않으면 html2canvas가 창 높이 기준으로 잘라낸 canvas를
    // 만든다(세로로 잘린 이미지의 원인). windowWidth도 고정해 캡처 시점의
    // 반응형 분기를 CAPTURE_WIDTH에 맞춘다.
    const height = Math.ceil(stage.getBoundingClientRect().height);

    return await html2canvas(stage, {
      backgroundColor: "#ffffff",
      scale: 2, // 고해상도 (Retina 대응)
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
