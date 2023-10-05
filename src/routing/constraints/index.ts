export const ROUTE_CONSTRAINT_METADATA_KEY = Symbol('constraints');

export type Constraints = {[key: string]: any};

// export const setConstraintMetadata = <T extends Object>(
//   target: T,
//   prop: keyof T,
//   descriptor: TypedPropertyDescriptor<T>
// ) => {};

export const RequireHeaders =
  (headers: Record<string, string[]>): MethodDecorator =>
  (target, key, _descriptor) => {
    const md =
      Reflect.getMetadata(ROUTE_CONSTRAINT_METADATA_KEY, target, key) || {};

    const NAME = 'requireHeaders';

    if (NAME in md) {
      console.warn(
        `${NAME} is already a registered constraint for the route \`${key.toString()}\`. Duplicates are overwritten, which may not be expected behavior`
      );
    }

    md[NAME] = headers;
    Reflect.defineMetadata(ROUTE_CONSTRAINT_METADATA_KEY, md, target, key);
  };

export * from './headers';
export * from './queryParams';
