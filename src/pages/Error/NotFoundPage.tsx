// 404 페이지
import { useNavigate } from "react-router-dom";
import { Compass, Home, ArrowLeft } from "lucide-react";
import { useDocumentTitle } from "@/hooks/common/useDocumentTitle";
import Button from "@/components/common/Button/Button";

export default function NotFoundPage() {
  const navigate = useNavigate();
  useDocumentTitle("404 - 페이지를 찾을 수 없습니다");

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white border border-border rounded-xl p-8 text-center">
        <Compass size={64} className="mx-auto text-primary mb-4" />
        <h1 className="text-5xl font-bold mb-2">404</h1>
        <p className="text-base font-semibold mb-1">
          페이지를 찾을 수 없습니다
        </p>
        <p className="text-sm text-text-secondary mb-6">
          요청하신 페이지가 존재하지 않거나 이동되었습니다.
        </p>

        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            fullWidth
            icon={<ArrowLeft size={14} />}
            onClick={() => navigate(-1)}
          >
            뒤로가기
          </Button>
          <Button
            size="sm"
            fullWidth
            icon={<Home size={14} />}
            onClick={() => navigate("/")}
          >
            홈으로
          </Button>
        </div>
      </div>
    </div>
  );
}
