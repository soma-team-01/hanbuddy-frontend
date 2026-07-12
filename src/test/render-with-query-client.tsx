import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { render, type RenderOptions } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";
import { createQueryClient } from "@/lib/query/client";

interface QueryRenderOptions extends Omit<RenderOptions, "wrapper"> {
  queryClient?: QueryClient;
}

export function renderWithQueryClient(ui: ReactElement, options: QueryRenderOptions = {}) {
  const { queryClient: providedQueryClient, ...renderOptions } = options;
  const queryClient = providedQueryClient ?? createQueryClient();

  function Wrapper({ children }: Readonly<{ children: ReactNode }>) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }

  return { queryClient, ...render(ui, { wrapper: Wrapper, ...renderOptions }) };
}
