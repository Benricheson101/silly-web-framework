import {z, ZodObject, ZodRawShape} from 'zod';
import {BodyParser} from '../routing';

export interface ZodClass<T extends z.ZodRawShape, U = T>
  // @ts-expect-error tsc doesn't like this LOL
  extends z.infer<ZodObject<T>> {
  new (data: U): z.infer<z.ZodObject<T>> & BodyParser<z.infer<z.ZodObject<T>>>;
}

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
