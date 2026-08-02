export class SchemaRequiredError extends Error {
  constructor(message = "No valid database schema provided.") {
    super(message);
    this.name = "SchemaRequiredError";
    Object.setPrototypeOf(this, SchemaRequiredError.prototype);
  }
}
