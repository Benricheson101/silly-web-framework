import 'reflect-metadata';

import {z} from 'zod';
import {autoInjectable, container, inject} from 'tsyringe';

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
} from './routing';
import {startServer} from './server';

class Database {
  #nextID = 0;
  #users: Map<number, {id: number; name: string}> = new Map();

  createUser(data: CreateUserBody) {
    const id = this.#nextID++;
    this.#users.set(id, {id, name: data.name});
    return this.#users.get(id);
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
}

class CreateUserBody extends ZodJSONValidatedBodyParser({
  name: z.string(),
  password: z.string(),
}) {}

class UpdateUserBody extends ZodJSONValidatedBodyParser(
  {
    name: z.string().optional(),
  },
  true
) {}

const db = new Database();
db.createUser(
  new CreateUserBody(JSON.stringify({name: 'Ben', password: 'password'}))
);

container.register(Database, {
  useValue: db,
});

@autoInjectable()
@RouteGroup('/users')
class UserRoutes {
  constructor(@inject(Database) private db: Database) {}

  @Get('/:id')
  // TODO: type coercion for @Param and @Query ?
  getUser(@Param('id') _id: string) {
    const id = Number(_id);
    return this.db.getUser(id);
  }

  @Post('/')
  createUser(@Body userCreds: CreateUserBody) {
    return this.db.createUser(userCreds);
  }

  @Patch('/:id')
  updateUser(@Body updatedUser: UpdateUserBody, @Param('id') _id: string) {
    const id = Number(_id);
    return this.db.updateUser(id, updatedUser);
  }

  @Delete('/:id')
  deleteUser(@Param('id') _id: string) {
    const id = Number(_id);
    this.db.deleteUser(id);
    return {};
  }
}

@autoInjectable()
@RouteGroup('/')
class AdminRoutes {
  constructor(@inject(Database) private db: Database) {}

  @Get('/is-admin')
  // TODO: required prop in @Query
  isAdmin(@Query('id') _id: number) {
    const id = Number(_id);
    return this.db.getUser(id)?.name === 'Ben';
  }
}

const reg = new Router();
reg.registerRoutes(UserRoutes);
reg.registerRoutes(AdminRoutes);

startServer(reg);
