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
          // Required (not optional): OpenAI structured output runs in strict
          // mode, which demands every key be present. Use [] when none apply.
          sourceRefs: z
            .array(z.string())
            .describe(
              "The `id` values (from the SOURCES list) of the sources this node draws on; use an empty array if none apply."
            ),
        })
      ),
    })
  ),
});

export type OutlineProposal = z.infer<typeof outlineProposalSchema>;
