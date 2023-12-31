import {ROUTES_METADATA_KEY} from './method';
import {ROUTE_GROUP_KEY, RouteGroupData} from './group';

import FindMyWay, {HTTPMethod} from 'find-my-way';
import {
  ROUTE_PARAM_METADATA_KEY,
  RouteParam,
  RouteParamDataType,
} from './param';
import {BodyParser} from './body';
import {
  requireHeadersConstraint,
  requireQueryParamConstraint,
} from './constraints';
import {ROUTE_CONSTRAINT_METADATA_KEY} from './constraints';

export type Route = {
  method: string;
  route: string;
  fnName: string;
  group: any;
};

export class Router<
  T = unknown,
  U extends {new (...args: any[]): T} = {new (...args: any[]): T},
> {
  #container: Map<U, T> = new Map();
  readonly router = FindMyWay({
    ignoreTrailingSlash: true,
    ignoreDuplicateSlashes: true,

    constraints: {
      requireQueryParams: requireQueryParamConstraint as any,
      requireHeaders: requireHeadersConstraint as any,
    },
  });

  registerRoutes(Routes: U) {
    const routesInstance = new Routes();

    const group = Reflect.getMetadata(
      ROUTE_GROUP_KEY,
      Routes
    ) as RouteGroupData<U>;

    if (!group) {
      throw new Error(
        'Not a RouteGroup. Call the @RouteGroup() decorator on the class'
      );
    }

    const routes = Reflect.getMetadata(
      ROUTES_METADATA_KEY,
      routesInstance as Object
    ) as Route[];

    for (const route of routes) {
      const handlerParams: RouteParam[] =
        Reflect.getMetadata(
          ROUTE_PARAM_METADATA_KEY,
          routesInstance as Object,
          route.fnName
        ) || [];

      const constraints =
        Reflect.getMetadata(
          ROUTE_CONSTRAINT_METADATA_KEY,
          routesInstance as Object,
          route.fnName
        ) || {};

      this.router.on(
        route.method as HTTPMethod,
        group.prefix + route.route,
        {constraints},
        async (req, res, urlParams, _store, searchParams) => {
          try {
            let body: string;
            if (req.method !== 'GET') {
              body = await new Promise(resolve => {
                const chunks: string[] = [];
                req.on('data', data => chunks.push(data));
                req.on('end', () => resolve(chunks.join('')));
              });
            }

            const mappedParams = handlerParams.map((param, i) => {
              switch (param.type) {
                case RouteParamDataType.JSON: {
                  return body ? JSON.parse(body) : null;
                }

                case RouteParamDataType.ParsedBody: {
                  const Type: typeof BodyParser = Reflect.getMetadata(
                    'design:paramtypes',
                    route.group.prototype,
                    route.fnName
                  )[i];

                  if (!(Type.prototype instanceof BodyParser)) {
                    throw new TypeError('Type must extend BodyParser');
                  }

                  // @ts-expect-error how do I type `typeof <extended abstract class>`?
                  const parsed: BodyParser = new Type(body);
                  return parsed;
                }

                case RouteParamDataType.Query: {
                  return param.coerce(searchParams[param.key]);
                }

                case RouteParamDataType.URLParam: {
                  return param.coerce(urlParams[param.param]);
                }

                case RouteParamDataType.Request: {
                  return req;
                }

                case RouteParamDataType.Response: {
                  return res;
                }

                case RouteParamDataType.OneHeader: {
                  return req.headers[param.header.toLowerCase()];
                }

                case RouteParamDataType.AllHeaders: {
                  return req.headers;
                }

                case RouteParamDataType.RawBody: {
                  return body;
                }
              }
            });

            let handlerRes;
            try {
              handlerRes = await (routesInstance as {[key: string]: Function})[
                route.fnName
              ].apply(routesInstance, mappedParams);
            } catch (err) {
              console.error(err);
              res.writeHead(500).end(JSON.stringify(err, null, 2));
              return;
            }

            if (!res.headersSent && handlerRes) {
              res
                .writeHead(200, {
                  'Content-Type': 'applicatio/json',
                })
                .end(JSON.stringify(handlerRes));
              return;
            }
          } catch (err) {
            console.error(err);
            res
              .writeHead(500, {
                'Content-Type': 'applicatio/json',
              })
              .end(JSON.stringify(err, null, 2));
          }
        }
      );
    }

    this.#container.set(group.target, routesInstance);
    return this;
  }
}

export * from './body';
export * from './constraints';
export * from './group';
export * from './method';
export * from './param';
