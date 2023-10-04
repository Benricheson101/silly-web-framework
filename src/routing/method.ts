import {Route} from '.';

export const ROUTES_METADATA_KEY = Symbol('routes');

const addRouteMetadata = <T>(
  target: any,
  key: string | symbol | undefined,
  _descriptor: TypedPropertyDescriptor<T>,
  route: Omit<Route, 'fn' | 'group' | 'fnName'>
) => {
  const md: Route[] = Reflect.getMetadata(ROUTES_METADATA_KEY, target) || [];

  // console.log('addRoute', Object.getOwnPropertyNames(target.constructor.prototype));
  console.log(
    'addRoute',
    target.constructor,
    Reflect.getOwnMetadataKeys(target),
    Reflect.getOwnMetadataKeys(target.constructor),
    Reflect.getOwnMetadataKeys(target.constructor.prototype)
  );
  // Reflect.defineMetadata('target.constructor', {}, target.constructor);

  md.push({
    ...route,
    group: target.constructor,
    fnName: key?.toString() || '',
  });

  Reflect.defineMetadata(ROUTES_METADATA_KEY, md, target);
};

const makeDecorators = (methods: string[]) =>
  methods.map(
    method =>
      (route: string): MethodDecorator =>
      (...args) =>
        addRouteMetadata(...args, {method, route})
  );

export const [Get, Post, Patch, Put, Delete] = makeDecorators([
  'GET',
  'POST',
  'PATCH',
  'PUT',
  'DELETE',
]);
