import { z } from "zod";

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().trim().optional(),
  filter: z.string().trim().optional(),
  sort: z.string().trim().optional(),
  order: z.enum(["asc", "desc"]).optional()
});

export type PaginationParams = z.infer<typeof paginationQuerySchema>;

export function getPagination(params: PaginationParams) {
  const page = params.page ?? 1;
  const limit = params.limit ?? 20;

  return {
    page,
    limit,
    skip: (page - 1) * limit,
    take: limit
  };
}
