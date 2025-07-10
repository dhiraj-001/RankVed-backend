import type { Request } from "express";
import type { User } from "@shared/schema";

export interface AuthenticatedRequest extends Request {
  user: User;
}