export class ApiError extends Error {
  readonly details?: Record<string, unknown>;

  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ApiError";
    this.details = details;
  }
}
