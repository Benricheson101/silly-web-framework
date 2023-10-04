import {BodyParser} from './body';

export const ROUTE_PARAM_METADATA_KEY = Symbol('route_param');
export const ROUTE_CLASS_METADATA_KEY = Symbol('route_class');

export enum RouteParamDataType {
  RawBody,
  ParsedBody,
  AutoBody,
  JSON,
  Query,
  URLParam,
}

export type RouteParam =
  | {type: RouteParamDataType.JSON}
  | {type: RouteParamDataType.ParsedBody}
  | {type: RouteParamDataType.AutoBody}
  | {type: RouteParamDataType.RawBody}
  | {type: RouteParamDataType.Query; key: string; required: boolean}
  | {type: RouteParamDataType.URLParam; param: string};

const setParamMetadata = <T extends Object>(
  target: T,
  prop: keyof T | string | symbol | undefined,
  index: number,
  data: RouteParam
) => {
  const md: RouteParam[] =
    Reflect.getMetadata(ROUTE_PARAM_METADATA_KEY, target, prop!.toString()) ||
    [];

  md[index] = data;

  Reflect.defineMetadata(
    ROUTE_PARAM_METADATA_KEY,
    md,
    target,
    prop!.toString()
  );
};

/**
 * The body of the request
 */
export const Body: ParameterDecorator = <T extends Object>(
  target: T,
  prop: string | symbol | undefined,
  index: number
) => {
  if (prop === undefined) {
    throw new Error('why is prop undefined?');
  }

  const paramTypes = Reflect.getMetadata('design:paramtypes', target, prop);
  const type = paramTypes[index];

  let data: RouteParam;
  switch (true) {
    case type.prototype instanceof BodyParser: {
      console.log(type, 'BodyParser');
      data = {type: RouteParamDataType.ParsedBody};
      break;
    }

    case type === String: {
      console.log(type, 'is raw (String)');
      data = {type: RouteParamDataType.RawBody};
      break;
    }

    case type instanceof Object: {
      console.log(type, 'is auto parse (JSON)');
      data = {type: RouteParamDataType.RawBody};
      break;
    }

    default: {
      throw new Error(type.name + ' is none');
    }
  }

  setParamMetadata(target, prop, index, data);
};

/** URL Query Parameter */
export const Query =
  (key: string, required = false): ParameterDecorator =>
  (...args) =>
    setParamMetadata(...args, {type: RouteParamDataType.Query, key, required});

/** URL Parameter */
export const Param =
  (param: string): ParameterDecorator =>
  (...args) =>
    setParamMetadata(...args, {type: RouteParamDataType.URLParam, param});
