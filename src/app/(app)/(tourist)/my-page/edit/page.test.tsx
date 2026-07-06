import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import EditProfilePage from "./page";

describe("EditProfilePage", () => {
  it("does not render the Korean Phone Number field", () => {
    render(<EditProfilePage />);
    expect(screen.queryByText(/Korean Phone Number/)).not.toBeInTheDocument();
  });

  it("keeps the country selector for phone-based messaging apps", () => {
    render(<EditProfilePage />);
    // 기본 선택 앱이 whatsapp이므로 국가 선택이 바로 렌더된다
    expect(screen.getByLabelText("Messaging country code")).toBeInTheDocument();
  });
});
