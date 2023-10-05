import assert from 'node:assert';
import {ConstraintStrategy, HTTPVersion, Handler} from 'find-my-way';

export const requireQueryParamConstraint: ConstraintStrategy<
  HTTPVersion.V1,
  string[]
> = {
  name: 'requireQueryParams',
  mustMatchWhenDerived: false,

  storage() {
    const store: [string[], Handler<HTTPVersion.V1>][] = [];
    const findStored = (params: string[]) =>
      store.find(([k]) => k.every(t => params.includes(t)))?.[1] || null;

    return {
      get: queryParams => findStored(queryParams),
      set: (queryParams, handler) => {
        // TODO: is this necessary?
        // if they are identical
        if (findStored(queryParams)?.length === queryParams.length) {
          throw new Error('Constraint is ambiguous');
        }

        store.push([queryParams, handler]);

        // to avoid ambiguity and incorrect queries, they are sorted in reverse-length order
        store.sort((a, b) => a[0].length - b[0].length);
      },
    };
  },

  deriveConstraint(req) {
    // TODO: fix url
    const url = new URL('http://localhost:3000' + req.url!);
    return [...url.searchParams.keys()];
  },

  validate(data) {
    assert(
      Array.isArray(data) &&
        data.every<string>((d): d is string => typeof d === 'string')
    );
  },
};
