import { PipeTransform } from '@nestjs/common';
import type { ZodType } from 'zod';
import { AppException, ErrorCode } from '../errors';

export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodType) {}

  transform(value: unknown) {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      const issues = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
      throw new AppException(ErrorCode.VALIDATION_FAILED, undefined, issues);
    }
    return result.data;
  }
}
