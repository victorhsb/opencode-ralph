import { z } from "zod";

export const ConfigSchema = z.object({
  model: z.string().min(1).optional(),
  agent: z.string().min(1).optional(),
  logLevel: z.enum(["DEBUG", "INFO", "WARN", "ERROR"]).optional(),
  logFile: z.string().min(1).optional(),
  structuredLogs: z.boolean().optional(),
  minIterations: z.number().int().nonnegative().optional(),
  maxIterations: z.number().int().nonnegative().optional(),
  completionPromise: z.string().min(1).optional(),
  abortPromise: z.string().min(1).optional(),
  tasks: z.boolean().optional(),
  taskPromise: z.string().min(1).optional(),
  supervisor: z.boolean().optional(),
  supervisorModel: z.string().min(1).optional(),
  supervisorNoActionPromise: z.string().min(1).optional(),
  supervisorSuggestionPromise: z.string().min(1).optional(),
  supervisorMemoryLimit: z.number().int().positive().optional(),
  supervisorPromptTemplate: z.string().min(1).optional(),
  promptTemplate: z.string().min(1).optional(),
  stream: z.boolean().optional(),
  verboseTools: z.boolean().optional(),
  commit: z.boolean().optional(),
  plugins: z.boolean().optional(),
  allowAll: z.boolean().optional(),
  silent: z.boolean().optional(),
  verify: z.array(z.string().min(1)).optional(),
  verifyMode: z.enum(["on-claim", "every-iteration"]).optional(),
  verifyTimeoutMs: z.number().int().positive().optional(),
  verifyFailFast: z.boolean().optional(),
  verifyMaxOutputChars: z.number().int().min(200).optional(),
  performance: z.object({
    trackTokens: z.boolean().optional(),
    estimateCost: z.boolean().optional(),
  }).optional(),
  state: z.object({
    compress: z.boolean().optional().default(false),
    maxHistory: z.number().int().positive().optional().default(100),
  }).optional(),
  dryRun: z.boolean().optional(),
});

export type Config = z.infer<typeof ConfigSchema>;
