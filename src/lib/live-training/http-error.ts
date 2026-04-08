export class LiveTrainingHttpError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly body?: Record<string, unknown>
  ) {
    super(message);
    this.name = "LiveTrainingHttpError";
  }
}
