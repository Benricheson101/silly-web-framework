import {ZodSchema} from 'zod';

/** A generic BodyParser interface */
export abstract class BodyParser<T = unknown> {
  // isValid() {
  //   return true;
  // }

  // abstract build(data: unknown): void | Promise<void>;

  constructor(_data: T) {}

  toJSON(): T {
    return {} as T;
  }
}

/** BodyParser interface that validates data with Zod */
// export abstract class ZodValidatedBodyParser extends BodyParser {
//   ['constructor']!: typeof ZodValidatedBodyParser;

//   constructor(readonly schema: ZodSchema) {
//     super();
//   }

//   // override isValid() {
//   //   this.schema.parse(this);
//   //   return true;
//   // }

//   // override build(data: string) {
//   //   const j = JSON.parse(data);
//   //   const parsed = this.schema.parse(j);
//   //   Object.assign(this, parsed);
//   // }

//   static fromUnchecked(data: any) {
//     const t = new (this as any)() as ZodValidatedBodyParser;
//     Object.assign(t, data);
//     console.log('fromUnchecked:', this, t);
//     return t;
//   }
// }
