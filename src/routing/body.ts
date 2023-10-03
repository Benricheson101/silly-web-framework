import {ZodSchema} from 'zod';

/** A generic BodyParser interface */
export abstract class BodyParser {
  isValid() {
    return true;
  }

  abstract build(data: unknown): void | Promise<void>;
}

/** BodyParser interface that validates data with Zod */
export abstract class ZodValidatedBodyParser extends BodyParser {
  constructor(readonly schema: ZodSchema) {
    super();
  }

  override isValid() {
    this.schema.parse(this);
    return true;
  }

  override build(data: string) {
    const j = JSON.parse(data);
    const parsed = this.schema.parse(j);
    Object.assign(this, parsed);
  }
}
