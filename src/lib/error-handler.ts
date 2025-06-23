export class AppError extends Error {
  public technicalDetails?: Record<string, unknown>;

  constructor(
    message: string,
    public statusCode = 500,
    public code?: string,
    technicalDetails?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'AppError';
    this.technicalDetails = technicalDetails;
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id: string) {
    super(`${resource} with id ${id} not found`, 404, 'NOT_FOUND');
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400, 'VALIDATION_ERROR');
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT_ERROR');
  }
}

// User-friendly instance-specific errors
export class InstanceCreationError extends AppError {
  constructor(reason?: string, technicalDetails?: Record<string, unknown>) {
    const message = reason
      ? `Failed to create instance: ${reason}`
      : 'Failed to create instance due to infrastructure issues';
    super(message, 500, 'INSTANCE_CREATION_FAILED', technicalDetails);
  }
}

export class InstanceOperationError extends AppError {
  constructor(operation: string, reason?: string, technicalDetails?: Record<string, unknown>) {
    const message = reason ? `Failed to ${operation} instance: ${reason}` : `Failed to ${operation} instance`;
    super(message, 500, 'INSTANCE_OPERATION_FAILED', technicalDetails);
  }
}

export class InstanceStateError extends AppError {
  constructor(currentState: string, requiredState: string, operation: string) {
    super(
      `Cannot ${operation} instance. Instance is ${currentState}, but must be ${requiredState}`,
      409,
      'INVALID_INSTANCE_STATE',
    );
  }
}

export class InfrastructureError extends AppError {
  constructor(service = 'infrastructure', technicalDetails?: Record<string, unknown>) {
    super(
      `Temporary ${service} issue. Please try again in a few moments`,
      503,
      'INFRASTRUCTURE_ERROR',
      technicalDetails,
    );
  }
}
