/** Expected, user-facing business-rule failures (shown to the user as-is). */
export class DomainError extends Error {
  constructor(message: string, public code = "DOMAIN") { super(message); }
}
export class LimitError extends DomainError {
  constructor(message: string) { super(message, "LIMIT"); }
}
