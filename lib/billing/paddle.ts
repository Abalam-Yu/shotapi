import { ApiError } from "../errors";

/** Paddle is reserved for a later merchant-of-record integration. Checkout is intentionally unimplemented. */
export function createPaddleCheckout(): never {
  throw new ApiError(
    501,
    "billing_disabled",
    "Paddle checkout is not available yet. Use Creem, Stripe sandbox, or demo billing.",
  );
}
