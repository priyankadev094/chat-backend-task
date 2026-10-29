import express, {
    type Request,
    type Response,
    type NextFunction,
  } from "express";
  
  import cors from "cors";
  import { ZodError } from "zod";
  import chatRoutes from "./routes/chat.routes";
  
  const app = express();
  
  app.use(cors());
  app.use(express.json({ limit: "1mb" }));
  
  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });
  
  app.use(chatRoutes);
  
  app.use(
    (
      error: unknown,
      _req: Request,
      res: Response,
      _next: NextFunction
    ) => {
      if (error instanceof ZodError) {
        res.status(400).json({
          error: "Invalid request",
          details: error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
        });
        return;
      }
  
      const code =
        error instanceof Error ? error.message : "";
  
      const knownErrors: Record<
        string,
        [number, string]
      > = {
        USER_NOT_FOUND: [404, "User not found"],
        CHAT_NOT_FOUND: [404, "Chat not found"],
        MESSAGE_NOT_FOUND: [404, "Message not found"],
        CHAT_ACCESS_DENIED: [403, "Chat access denied"],
        CANNOT_CHAT_WITH_SELF: [400, "Cannot chat with yourself"],
        INVALID_MESSAGE_TEXT: [400, "Invalid message text"],
      };
  
      const known = knownErrors[code];
  
      if (known) {
        res.status(known[0]).json({ error: known[1] });
        return;
      }
  
      console.error(error);
  
      res.status(500).json({
        error: "Internal server error",
      });
    }
  );
  
  export default app;