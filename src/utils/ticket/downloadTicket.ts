// 사용:
//   const ref = useRef<HTMLDivElement>(null);
//   ...
//   <div ref={ref}>{/* 캡처될 영역 */}</div>
//   <button onClick={() => downloadTicket(ref.current, `ticket-${id}.png`)}>
//     다운로드
//   </button>

import html2canvas from "html2canvas";

export async function downloadTicket(
  element: HTMLElement | null,
  filename: string,
): Promise<void> {
  if (!element) return;

  // 캡처 전에 body transform 잠시 원복
  const originalTransform = document.body.style.transform;
  const originalTransformOrigin = document.body.style.transformOrigin;
  document.body.style.transform = "none";
  document.body.style.transformOrigin = "top left";

  try {
    const canvas = await html2canvas(element, {
      backgroundColor: "#ffffff",
      scale: 2, // 고해상도 (Retina 대응)
      useCORS: true, // cross-origin 이미지(포스터 등) 대응
    });

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
  } finally {
    // 무조건 복원 (에러가 나도 화면은 원상복구)
    document.body.style.transform = originalTransform;
    document.body.style.transformOrigin = originalTransformOrigin;
  }
}
