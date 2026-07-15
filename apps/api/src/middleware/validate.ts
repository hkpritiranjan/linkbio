import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";

export function validate(schema: ZodSchema, source: "body" | "query" = "body") {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(source === "body" ? req.body : req.query);
    if (!result.success) {
      const details: Record<string, string[]> = {};
      result.error.errors.forEach((e) => {
        const key = e.path.join(".");
        details[key] = [...(details[key] ?? []), e.message];
      });
      res.status(400).json({ error: "Validation failed", details });
      return;
    }
    if (source === "body") req.body = result.data;
    else req.query = result.data as Record<string, string>;
    next();
  };
}
