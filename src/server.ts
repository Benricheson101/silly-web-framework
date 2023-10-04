import {IncomingMessage, ServerResponse, createServer} from 'http';

import {
  RouteParam,
  ROUTE_PARAM_METADATA_KEY,
  RouteParamDataType,
  BodyParser,
  Router,
} from './routing';

export const startServer = (
  routes: Router,
  {port = 3000, host = '127.0.0.1'} = {}
) => {
  const server = createServer(
    async (req: IncomingMessage, res: ServerResponse) => {
      try {
        const url = new URL('http://localhost:3000' + req.url!);

        let body: string;
        if (req.method !== 'GET') {
          body = await new Promise(resolve => {
            const chunks: string[] = [];
            req.on('data', data => chunks.push(data));
            req.on('end', () => resolve(chunks.join('')));
          });
        }

        const route = routes.getRoute(
          req.method!.toUpperCase(),
          req.url!.split('?')[0]
        );
        if (route) {
          console.log('Found route:', route);

          const instance = routes.getRouteGroup(route.group) as {
            [key: string]: (...args: any[]) => any;
          };
          if (!instance) {
            throw new Error('Cannot find Router');
          }

          const md: RouteParam[] =
            Reflect.getMetadata(
              ROUTE_PARAM_METADATA_KEY,
              instance,
              route.fnName
            ) || [];

          const args = md.map((param, i) => {
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
                // TODO: how should I skip this handler fn if it's not valid?
                return parsed;
              }

              case RouteParamDataType.Query: {
                return url.searchParams.get(param.key);
              }

              case RouteParamDataType.URLParam: {
                return route.params?.[param.param];
              }
            }
          });

          const handleFn =
            typeof instance === 'object' &&
            route.fnName in instance &&
            typeof instance[route.fnName] === 'function'
              ? instance[route.fnName].bind(instance)
              : null;

          if (!handleFn) {
            throw new Error('missing handle function');
          }

          let handlerRes;
          try {
            handlerRes = await handleFn(...args);
          } catch (err) {
            console.error(err);
            res.writeHead(500).end(JSON.stringify(err, null, 2));
            return;
          }

          // TODO
          if (!res.headersSent) {
            res
              .writeHead(200, {
                'Content-Type': 'applicatio/json',
              })
              .end(JSON.stringify(handlerRes));
            return;
          }
        } else {
          res.writeHead(404).end('Not Found');
          return;
        }
      } catch (err) {
        if (!res.headersSent) {
          res.writeHead(500).end(JSON.stringify(err, null, 2));
          return;
        }
      }
    }
  );

  server.listen(port, host, () => {
    console.log('Listening: http://localhost:3000');
  });
};
