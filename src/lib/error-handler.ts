export class AppError extends Error {
  constructor(
    message: string,
    public statusCode = 500,
    public code?: string,
  ) {
    super(message);
    this.name = 'AppError';
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
  constructor(reason?: string) {
    const message = reason
      ? `Failed to create instance: ${reason}`
      : 'Failed to create instance due to infrastructure issues';
    super(message, 500, 'INSTANCE_CREATION_FAILED');
  }
}

export class InstanceOperationError extends AppError {
  constructor(operation: string, reason?: string) {
    const message = reason ? `Failed to ${operation} instance: ${reason}` : `Failed to ${operation} instance`;
    super(message, 500, 'INSTANCE_OPERATION_FAILED');
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
  constructor(service = 'infrastructure') {
    super(`Temporary ${service} issue. Please try again in a few moments`, 503, 'INFRASTRUCTURE_ERROR');
  }
}
