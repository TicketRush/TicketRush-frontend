import { describe, expect, it } from "vitest";
import { modalVariantStyles } from "./modalVariant";

function classes(value: string) {
  return value.split(/\s+/);
}

describe("modalVariantStyles", () => {
  it("관리자 모달은 포탈 뒤에도 패널과 푸터가 밝은 글자색을 가진다", () => {
    expect(classes(modalVariantStyles.admin.panel)).toContain(
      "text-admin-text",
    );
    expect(classes(modalVariantStyles.admin.footer)).toContain(
      "text-admin-text",
    );
  });

  it("기본 모달은 레이아웃 글자색에 의존하지 않는다", () => {
    expect(classes(modalVariantStyles.default.panel)).toContain("text-text");
    expect(classes(modalVariantStyles.default.footer)).toContain("text-text");
    expect(classes(modalVariantStyles.default.panel)).not.toContain(
      "text-admin-text",
    );
  });
});
