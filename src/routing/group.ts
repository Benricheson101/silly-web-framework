export const ROUTE_GROUP_KEY = Symbol('route_group');

export const RouteGroup = (prefix = ''): ClassDecorator => {
  return target => {
    const routeGroupMd: RouteGroupData<unknown> = {
      target,
      prefix,
    };

    Reflect.defineMetadata(ROUTE_GROUP_KEY, routeGroupMd, target);
  };
};

export interface RouteGroupData<T> {
  target: T;
  prefix: string;
}
