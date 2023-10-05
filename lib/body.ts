import {z, ZodObject, ZodRawShape} from 'zod';

/** A generic BodyParser interface. All custom parsers must extend this */
export abstract class BodyParser<T = unknown> {
  constructor(_data: T) {}

  toJSON(): T {
    return {} as T;
  }
}

export interface ZodClass<T extends z.ZodRawShape, U = T>
  // @ts-expect-error tsc doesn't like this LOL
  extends z.infer<ZodObject<T>> {
  new (data: U): z.infer<z.ZodObject<T>> & BodyParser<z.infer<z.ZodObject<T>>>;
}

/**
 *  Automatically validates data with Zod. Takes already-parsed data as input
 *
 * @example ```js
 * class MyBody extends ZodValidatedBodyParser({
 *   username: z.string(),
 *   password: z.string(),
 * }) {
 *   constructor(data: string) {
 *     super(JSON.parse(data));
 *   }
 * }
 * ```
 */
export const ZodValidatedBodyParser = <T extends ZodRawShape>(
  shape: T,
  strict = false
): ZodClass<T> => {
  const schema = strict ? z.strictObject(shape) : z.object(shape);
  class ZodDataClass extends BodyParser {
    #rawData: z.infer<ZodObject<T>>;

    constructor(data: z.infer<ZodObject<T>>) {
      super(data);

      const parsedData = schema.parse(data);
      Object.assign(this, parsedData);
      this.#rawData = parsedData;
    }

    toJSON(): z.infer<ZodObject<T>> {
      return this.#rawData;
    }
  }

  return ZodDataClass as unknown as ZodClass<T>;
};

/**
 * Automatically validates body data with Zod. Assumes body data is JSON. Shortcut for the example shown in `ZodValidatedBodyParser`
 */
export const ZodJSONValidatedBodyParser = <T extends ZodRawShape>(
  shape: T,
  strict = false
): ZodClass<T, string> => {
  class ZodJSONDataClass extends ZodValidatedBodyParser(
    shape as ZodRawShape,
    strict
  ) {
    constructor(data: string) {
      super(JSON.parse(data));
    }
  }

  return ZodJSONDataClass as ZodClass<T, string>;
};
