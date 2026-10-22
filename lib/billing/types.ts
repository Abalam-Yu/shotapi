export type CheckoutResult = {
  mode: "demo" | "stripe" | "creem";
  url: string;
};
