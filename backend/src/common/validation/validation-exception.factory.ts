import { BadRequestException, ValidationError } from "@nestjs/common";

export function validationExceptionFactory(errors: ValidationError[]) {
  const fieldErrors: Record<string, string[]> = Object.create(null);
  function visit(error: ValidationError, parent = "") {
    const path = parent ? `${parent}.${error.property}` : error.property;
    const messages = Object.values(error.constraints ?? {});
    if (messages.length) fieldErrors[path] = [...new Set(messages)];
    for (const child of error.children ?? []) visit(child, path);
  }
  errors.forEach((error) => visit(error));
  return new BadRequestException({
    statusCode: 400,
    code: "VALIDATION_ERROR",
    message: "Please review the submitted information.",
    fieldErrors,
  });
}
