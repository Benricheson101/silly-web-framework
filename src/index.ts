import 'reflect-metadata';

import {z} from 'zod';
import {
  autoInjectable as AutoInjectable,
  container,
  inject as Inject,
} from 'tsyringe';

import {
  Get,
  Param,
  Post,
  Body,
  Patch,
  Delete,
  Router,
  Query,
  RouteGroup,
  ZodJSONValidatedBodyParser,
  RequireHeaders,
} from '../lib';
import {createServer} from 'http';

type User = {id: number; name: string; isAdmin: boolean};

class Database {
  #nextID = 0;
  #users: Map<number, User> = new Map();

  createUser(data: CreateUserBody) {
    const id = this.#nextID++;
    this.#users.set(id, {id, name: data.name, isAdmin: data.isAdmin});
    return this.#users.get(id)!;
  }

  getUser(id: number) {
    return this.#users.get(id);
  }

  deleteUser(id: number) {
    this.#users.delete(id);
  }

  updateUser(id: number, data: UpdateUserBody) {
    const user = this.#users.get(id);

    if (!user) {
      throw new Error('User does not exist');
    }

    this.#users.set(id, {...user, ...(data.toJSON() as {name: string})});
    return this.#users.get(id);
  }

  findUsers({name}: Pick<User, 'name'>) {
    return [...this.#users.values()].filter(u =>
      u.name.toLowerCase().includes(name.toLowerCase())
    );
  }
}

class CreateUserBody extends ZodJSONValidatedBodyParser({
  name: z.string(),
  password: z.string().min(5),
  isAdmin: z.boolean().default(false),
}) {}

class UpdateUserBody extends ZodJSONValidatedBodyParser(
  {name: z.string().optional()},
  true
) {}

const db = new Database();
db.createUser(
  new CreateUserBody(
    JSON.stringify({name: 'Ben', password: 'password', isAdmin: true})
  )
);

container.register(Database, {
  useValue: db,
});

@AutoInjectable()
@RouteGroup('/users')
class UserRoutes {
  constructor(@Inject(Database) private db: Database) {}

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

@AutoInjectable()
@RouteGroup('/')
class AdminRoutes {
  constructor(@Inject(Database) private db: Database) {}

  @Get('/is-admin')
  @RequireHeaders({
    'Content-Type': ['application/json'],
  })
  isAdmin(@Query('id', true) id: number) {
    return this.db.getUser(id)?.isAdmin || false;
  }
}

const router = new Router()
  .registerRoutes(UserRoutes)
  .registerRoutes(AdminRoutes);

console.log(router.router.prettyPrint());

createServer((req, res) => {
  router.router.lookup(req, res);
}).listen(3000);
