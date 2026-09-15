import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AdminSignupInfoSection } from "./admin-signup-info";
describe("admin signup information", () => {
  it("keeps absent data distinct from OTHER", () => {
    render(<AdminSignupInfoSection info={{ signupSource: null, bankAccount: null }} />);
    expect(screen.getAllByText("미입력")).toHaveLength(3);
    expect(screen.queryByText("기타")).not.toBeInTheDocument();
  });
  it("displays OTHER detail and preserves legacy bank labels and leading zeroes", () => {
    render(
      <AdminSignupInfoSection
        info={{
          signupSource: "OTHER",
          signupSourceDetail: "Travel club",
          bankAccount: {
            bank: null,
            bankCode: null,
            bankName: "Legacy Bank",
            accountNumber: "001234",
          },
        }}
      />,
    );
    expect(screen.getByText("기타")).toBeInTheDocument();
    expect(screen.getByText("Travel club")).toBeInTheDocument();
    expect(screen.getByText("Legacy Bank")).toBeInTheDocument();
    expect(screen.getByText("001234")).toBeInTheDocument();
  });
});
