import 'reflect-metadata';

import {z} from 'zod';
import {
  Get,
  Param,
  Post,
  Body,
  Patch,
  Delete,
  Router,
  ZodValidatedBodyParser,
  Query,
} from './routing';
import {startServer} from './server';

const USERS: Record<number, {name: string}> = {
  0: {name: 'Ben'},
};

class CreateUserBody extends ZodValidatedBodyParser {
  name!: string;
  password!: string;

  constructor() {
    super(
      z.object({
        name: z.string(),
        password: z.string(),
      })
    );
  }
}

class UpdatableUserFields extends ZodValidatedBodyParser {
  name?: string;

  constructor() {
    super(
      z.object({
        name: z.string().optional(),
      })
    );
  }
}

class UserRoutes {
  @Get('/users/:id')
  getUser(@Param('id') _id: string) {
    const id = Number(_id);
    return USERS[id as keyof typeof USERS];
  }

  @Post('/users')
  createUser(@Body userCreds: CreateUserBody) {
    const id = Math.max(...Object.keys(USERS).map(Number)) + 1;
    USERS[id] = {name: userCreds.name};
    return {id, ...USERS[id]};
  }

  @Patch('/users/:id')
  updateUser(@Body updatedUser: UpdatableUserFields, @Param('id') _id: string) {
    const id = Number(_id);
    USERS[id] = {...USERS[id], ...updatedUser};
    return USERS[id];
  }

  @Delete('/users/:id')
  deleteUser(@Param('id') _id: string) {
    const id = Number(_id);
    delete USERS[id];
    return {};
  }
}

class AdminRoutes {
  @Get('/is-admin')
  // TODO: required prop in @Query
  isAdmin(@Query('id') _id: number) {
    const id = Number(_id);
    return USERS[id]?.name === 'Ben';
  }
}

const reg = new Router();
reg.registerRoutes(UserRoutes);
reg.registerRoutes(AdminRoutes);

startServer(reg);
