import {RadixRouter, createRouter} from 'radix3';
import {ROUTES_METADATA_KEY} from './method';

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
  container: Map<U, T> = new Map();
  #byMethodMemod?: RadixRouterByMethod;

  registerRoutes(Routes: U) {
    const routesInstance = new Routes();
    this.container.set(Routes, routesInstance);
    this.#byMethodMemod = this.byMethod();
  }

  getRouteGroup(group: U) {
    return this.container.get(group);
  }

  getAll(): Route[] {
    return [...this.container.values()].flatMap(
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
      a[c.method].insert(c.route, c);
      return a;
    }, {});
  }
}

export * from './body';
export * from './method';
export * from './param';
