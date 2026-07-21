import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useQuery } from "@tanstack/react-query";
import { ApiClientError } from "./errors";
import { useMyProfile } from "./useMyProfile";
import { useAuthQueryRedirect } from "@/lib/query/use-auth-query-redirect";

vi.mock("@tanstack/react-query", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@tanstack/react-query")>()),
  useQuery: vi.fn(),
}));

vi.mock("@/lib/query/use-auth-query-redirect", () => ({
  useAuthQueryRedirect: vi.fn(),
}));

const mockedUseQuery = vi.mocked(useQuery);
const mockedUseAuthQueryRedirect = vi.mocked(useAuthQueryRedirect);

describe("useMyProfile", () => {
  beforeEach(() => {
    mockedUseQuery.mockReset();
    mockedUseAuthQueryRedirect.mockReset();
  });

  it("keeps the result empty while a direct 401 error redirects to login", () => {
    const error = new ApiClientError({
      code: "TOKEN401",
      status: 401,
      details: null,
      backendMessage: "만료된 토큰",
    });
    mockedUseQuery.mockReturnValue({
      data: undefined,
      error,
      isPending: false,
    } as ReturnType<typeof useQuery>);

    const { result } = renderHook(() => useMyProfile());

    expect(mockedUseAuthQueryRedirect).toHaveBeenCalledWith(error);
    expect(result.current).toBeNull();
  });
});
