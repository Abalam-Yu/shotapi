import type { Plan } from "./types";
import { config } from "./config";

export function currentPeriod(date = new Date()): string {
  return date.toISOString().slice(0, 7);
}

export function quotaFor(plan: Plan): number {
  return plan === "pro" ? config.quotaPro() : config.quotaDemo();
}
