export const isCancelled = (err: any) => {
  return err?.code === "CANCELLED" || err?.name === "AbortError";
};

export class NoAvailableRPCError extends Error {
  constructor(message?: string) {
    super(message);
    this.name = "NoAvailableRPCError";
  }
}
