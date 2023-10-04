import {RadixRouter, createRouter} from 'radix3';
import {ROUTES_METADATA_KEY} from './method';
import {ROUTE_GROUP_KEY, RouteGroupData} from './group';

export type Route = {
  method: string;
  route: string;
  fnName: string;
  group: any;
};

export type RadixRouterByMethod = {[key: string]: RadixRouter<Route>};

export class Router<
  T = unknown,
  U extends {new (...args: any[]): T} = {new (...args: any[]): T},
> {
  #container: Map<U, T> = new Map();
  #byMethodMemod?: RadixRouterByMethod;

  registerRoutes(Routes: U) {
    const routesInstance = new Routes();

    const md = Reflect.getMetadata(
      ROUTE_GROUP_KEY,
      Routes
    ) as RouteGroupData<U>;

    if (!md) {
      throw new Error(
        'Not a RouteGroup. Call the @RouteGroup() decorator on the class'
      );
    }

    this.#container.set(md.target, routesInstance);
    this.#byMethodMemod = this.byMethod();
  }

  getRouteGroup(group: U) {
    const {target} = Reflect.getOwnMetadata(
      ROUTE_GROUP_KEY,
      group
    ) as RouteGroupData<U>;
    return this.#container.get(target);
  }

  getAll(): Route[] {
    return [...this.#container.values()].flatMap(
      v => Reflect.getMetadata(ROUTES_METADATA_KEY, v as Object) as Route[]
    );
  }

  getRoutesByMethod(method: string) {
    if (this.#byMethodMemod) {
      return this.#byMethodMemod[method];
    }

    const byMethod = this.byMethod();
    this.#byMethodMemod = byMethod;

    return byMethod[method];
  }

  getRoute(method: string, path: string) {
    const routes = this.getRoutesByMethod(method);
    return routes.lookup(path);
  }

  byMethod(): RadixRouterByMethod {
    const all = this.getAll();

    return all.reduce<RadixRouterByMethod>((a, c) => {
      a[c.method] = a[c.method] || createRouter<Route>();

      const {prefix} = Reflect.getMetadata(
        ROUTE_GROUP_KEY,
        c.group
      ) as RouteGroupData<unknown>;
      // console.log('groupMd', groupMd);

      a[c.method].insert(prefix + c.route, c);
      return a;
    }, {});
  }
}

export * from './body';
export * from './method';
export * from './param';
export * from './group';
