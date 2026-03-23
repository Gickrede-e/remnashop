import { z } from "zod";

export const deviceDeleteSchema = z.object({
  hwid: z.string().min(1).max(512)
});
