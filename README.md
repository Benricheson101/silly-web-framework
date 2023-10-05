### What?
I've had the idea to build something like this for a while, but never did. I finally sat down and learned how decorators, and made a silly little web framework. This is not production ready, nor probably ever will be. But it's a fun PoC if nothing else.

### How?
Using the [reflect-metadata](https://npm.im/reflect-metadata) API, each decorator stores metadata on the route group. The data is later accessed by the Router to properly route requests. The router uses [find-my-way](https://npm.im/find-my-way), which can be accessed from `Router#router`.

A group of routes is represented with a class decorated with `@RouteGroup(prefix)`. A route handler function is a class method, decorated with a route method decorator, and a path (ex: `@Get('/:id')`). Routing constraints can also be added here, for example `@RequireHeaders({'Content-Type': ['application/json']})`.

Request data is accessed through several handler parameter decorators. A full list can be found [here](/lib/param.ts)
  - `@Query(param, required=false)` - accesses a query param
  - `@Param(param)` - accesses a URL param
  - `@Body` - accesses the request body [more below]
  - `@Header(header)` - accesses the header value
  - `@Request` - the node:http `IncomingMessage` object
  - `@Response` - the node:http `ServerResponse` object

> [!NOTE]
> `@Query` and `@Param` perform basic type coercion based on their parameter type. For example, `@Param('id') id: number` will coerce the parameter to a Number using `Number(param)`. This makes no guarantees that the resulting Number is valid. Consider using regex in your route, and checking `isNaN(id)` at runtime.

The `@Body` performs a bit of magic of its own depending on the handler parameter type.
  - class extending [BodyParser](/lib/body.ts#L4) will be constructed automatically. If an error is thrown, the handler function will not run.
  - TypeScript types (`interface`, `type`) treat the body as JSON data, and will returned parsed JSON
  - `string` will return the unparsed data as a string

This library comes with two helpers for creating typed body classes that are automatically parsed and validated with Zod. The syntax is funky, but it eliminates a lot of duplicate code. A second boolean parameter can be passed to these helpers to enable Zod's [strict mode](https://github.com/colinhacks/zod#strict).

```ts
// With `ZodValidatedBodyParser`, the library makes no assumptions
// about incoming body data format, so you must parse it
class CreateUserBody extends ZodValidatedBodyParser({
  name: z.string(),
  password: z.string().min(5),
}) {
  constructor(data: string) {
    super(JSON.parse(data));
  }
}

// Unlike `ZodValidatedBodyParser`, `ZodJSONValidatedBodyParser` treats the
// incoming body data as JSON, and runs `JSON.parse()` on it. This class
// is identical to the class above
class CreateUserBody extends ZodJSONValidatedBodyParser({
  name: z.string(),
  password: z.string().min(5),
}) {}
```

To start the server, first create an instance of `Router` and register the route groups using `Router#registerRoutes`. Create a server using `node:http` and pass the request and response objects to `router.router.lookup(req, res)`!

### Example
```ts
import 'reflect-metadata';

class CreateUserBody extends ZodJSONValidatedBodyParser({
  name: z.string(),
  password: z.string().min(5),
  isAdmin: z.boolean().default(false),
}) {}

class UpdateUserBody extends ZodJSONValidatedBodyParser(
  {name: z.string().optional()},
  true // Zod strict mode
) {}

// works well with DI libraries like tsyringe
@AutoInjectible
@RouteGroup('/users')
class UserRoutes {
  constructor(@Inject(Database) private db: Database) {}

  // supports regex-matched parameters
  @Get('/:id(^\\d+$)')
  getUser(@Param('id') id: number) {
    return this.db.getUser(id);
  }

  @Post('/')
  createUser(@Body userCreds: CreateUserBody): User {
    return this.db.createUser(userCreds);
  }

  @Patch('/:id')
  @RequireHeaders({
    'Content-Type': ['application/json'],
  })
  updateUser(@Body updatedUser: UpdateUserBody, @Param('id') id: number) {
    return this.db.updateUser(id, updatedUser);
  }

  @Delete('/:id')
  deleteUser(@Param('id') id: number) {
    this.db.deleteUser(id);
  }

  @Get('/search')
  findUsers(@Query('name', true) name: string) {
    return this.db.findUsers({name});
  }
}

const router = new Router().registerRoutes(UserRoutes);

createServer((req, res) => {
  router.router.lookup(req, res);
}).listen(3000);
```

View the full example code in [`src/index.ts`](/src/index.ts)
