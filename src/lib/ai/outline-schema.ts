import { z } from "zod";

export const outlineProposalSchema = z.object({
  groups: z.array(
    z.object({
      title: z.string().describe("Module or topic section title"),
      nodes: z.array(
        z.object({
          title: z.string().describe("Lesson or topic title"),
          summary: z
            .string()
            .describe("One or two sentence description of what this covers"),
        })
      ),
    })
  ),
});

export type OutlineProposal = z.infer<typeof outlineProposalSchema>;
