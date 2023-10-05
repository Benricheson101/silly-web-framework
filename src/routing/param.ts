import {BodyParser} from './body';
import {ROUTE_CONSTRAINT_METADATA_KEY} from './constraints';

export const ROUTE_PARAM_METADATA_KEY = Symbol('route_param');
export const ROUTE_CLASS_METADATA_KEY = Symbol('route_class');

export enum RouteParamDataType {
  RawBody,
  ParsedBody,
  JSON,
  Query,
  URLParam,
  Request,
  Response,

  AllHeaders,
  OneHeader,
}

export type RouteParam =
  | {type: RouteParamDataType.Request}
  | {type: RouteParamDataType.Response}
  | {type: RouteParamDataType.JSON}
  | {type: RouteParamDataType.ParsedBody}
  | {type: RouteParamDataType.RawBody}
  | {type: RouteParamDataType.AllHeaders}
  | {type: RouteParamDataType.OneHeader; header: string}
  | {
      type: RouteParamDataType.Query;
      key: string;
      coerce: typeof Number | typeof String;
    }
  | {
      type: RouteParamDataType.URLParam;
      param: string;
      coerce: typeof Number | typeof String;
    };

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
  (target, prop, index) => {
    const paramType = Reflect.getMetadata('design:paramtypes', target, prop!)[
      index
    ];

    // TODO: custom types like @Body ?
    if (![String, Number].includes(paramType)) {
      throw new Error('URL Params can only be of type String or Number');
    }

    // TODO: set required in a new Symbol(constraints)
    // TODO: add required headers in there too ^

    if (required) {
      const md =
        Reflect.getMetadata(ROUTE_CONSTRAINT_METADATA_KEY, target, prop!) || {};

      if (!('requireQueryParams' in md)) {
        md.requireQueryParams = [];
      }

      md.requireQueryParams.push(key);

      Reflect.defineMetadata(ROUTE_CONSTRAINT_METADATA_KEY, md, target, prop!);
    }

    return setParamMetadata(target, prop, index, {
      type: RouteParamDataType.Query,
      key,
      coerce: paramType,
    });
  };

/** URL Parameter */
export const Param =
  (param: string): ParameterDecorator =>
  (target, prop, index) => {
    const paramType = Reflect.getMetadata('design:paramtypes', target, prop!)[
      index
    ];

    // TODO: custom types like @Body ?
    if (![String, Number].includes(paramType)) {
      throw new Error('URL Params can only be of type String or Number');
    }

    return setParamMetadata(target, prop, index, {
      type: RouteParamDataType.URLParam,
      param,
      coerce: paramType,
    });
  };

/** Get the request object */
export const Request: ParameterDecorator = (...args) =>
  setParamMetadata(...args, {type: RouteParamDataType.Request});

/** Get the response object */
export const Response: ParameterDecorator = (...args) =>
  setParamMetadata(...args, {type: RouteParamDataType.Request});

/** Returns all request headers */
export const Headers: ParameterDecorator = (...args) =>
  setParamMetadata(...args, {type: RouteParamDataType.AllHeaders});

export const Header =
  (header: string): ParameterDecorator =>
  (...args) =>
    setParamMetadata(...args, {type: RouteParamDataType.OneHeader, header});
