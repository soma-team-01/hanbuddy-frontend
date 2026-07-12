import { describe, expect, it } from "vitest";
import { createQueryClient } from "./client";

describe("createQueryClient", () => {
  it("uses stable defaults for authenticated BFF queries", () => {
    const queryClient = createQueryClient();

    expect(queryClient.getDefaultOptions().queries).toMatchObject({
      retry: false,
      staleTime: 30_000,
    });
  });
});
