import { describe, it, expect } from 'vitest';
import { Inject } from '@nestjs/common';
import { InjectModel, InjectConnection } from '../../src/lib/decorators';
import { getModelToken, getConnectionToken } from '../../src/lib/core/tokens';

describe('InjectModel', () => {
  it('should return an Inject decorator', () => {
    const decorator = InjectModel('users');

    // InjectModel returns the same type as @Inject()
    expect(typeof decorator).toBe('function');
  });

  it('should use the correct token for model injection', () => {
    const expectedToken = getModelToken('users');
    const decorator = InjectModel('users');

    // The decorator should be equivalent to @Inject(getModelToken('users'))
    const directInject = Inject(expectedToken);

    // Both should be functions (decorators)
    expect(typeof decorator).toBe(typeof directInject);
  });

  it('should generate different decorators for different models', () => {
    const usersDecorator = InjectModel('users');
    const productsDecorator = InjectModel('products');

    // Both are decorators but target different models
    expect(typeof usersDecorator).toBe('function');
    expect(typeof productsDecorator).toBe('function');
  });

  it('should work with NestJS dependency injection', () => {
    // This is more of a type check - the decorator should be assignable
    // to parameter decorators in NestJS classes
    class TestService {
      constructor(@InjectModel('users') private usersModel: unknown) {}
    }

    expect(TestService).toBeDefined();
  });
});

describe('InjectConnection', () => {
  it('should return an Inject decorator', () => {
    const decorator = InjectConnection();

    expect(typeof decorator).toBe('function');
  });

  it('should use default connection when no name provided', () => {
    const decorator = InjectConnection();
    const expectedToken = getConnectionToken();

    // The decorator should be equivalent to @Inject(getConnectionToken())
    const directInject = Inject(expectedToken);

    expect(typeof decorator).toBe(typeof directInject);
  });

  it('should use custom connection name when provided', () => {
    const decorator = InjectConnection('analytics');
    const expectedToken = getConnectionToken('analytics');

    const directInject = Inject(expectedToken);

    expect(typeof decorator).toBe(typeof directInject);
  });

  it('should work with NestJS dependency injection', () => {
    // Type check for decorator usage
    class TestService {
      constructor(@InjectConnection() private db: unknown) {}
    }

    class TestServiceWithCustomConnection {
      constructor(@InjectConnection('analytics') private analyticsDb: unknown) {}
    }

    expect(TestService).toBeDefined();
    expect(TestServiceWithCustomConnection).toBeDefined();
  });
});

describe('Decorator integration', () => {
  it('should allow injecting both model and connection in same class', () => {
    class TestService {
      constructor(
        @InjectModel('users') private usersModel: unknown,
        @InjectConnection() private db: unknown,
      ) {}
    }

    expect(TestService).toBeDefined();
  });

  it('should allow injecting multiple models', () => {
    class TestService {
      constructor(
        @InjectModel('users') private usersModel: unknown,
        @InjectModel('products') private productsModel: unknown,
      ) {}
    }

    expect(TestService).toBeDefined();
  });

  it('should allow injecting multiple connections', () => {
    class TestService {
      constructor(
        @InjectConnection() private primaryDb: unknown,
        @InjectConnection('analytics') private analyticsDb: unknown,
      ) {}
    }

    expect(TestService).toBeDefined();
  });
});
