import assert from 'node:assert';
import {ConstraintStrategy, HTTPVersion, Handler} from 'find-my-way';

export const requireHeadersConstraint: ConstraintStrategy<
  HTTPVersion.V1,
  Record<string, string[]>
> = {
  name: 'requireHeaders',
  mustMatchWhenDerived: false,

  storage() {
    const requiredHeaders: [
      headers: Record<string, string[]>,
      handler: Handler<HTTPVersion>,
    ][] = [];

    const getStored = (incomingHeaders: Record<string, string[]>) => {
      let mostOverlapCount: number | undefined;
      let mostOverlap:
        | [Record<string, string[]>, Handler<HTTPVersion>]
        | undefined;

      outer: for (const [requiredHeader, handler] of requiredHeaders) {
        let overlapCount = 0;
        for (const [
          _requiredHeaderName,
          requiredHeaderValues,
        ] of Object.entries(requiredHeader)) {
          const requiredHeaderName = _requiredHeaderName.toLowerCase();

          if (!(requiredHeaderName in incomingHeaders)) {
            continue outer;
          }

          // TODO: allow (header: string) => boolean ?
          if (
            // empty array means header must be PRESENT but can have any value
            requiredHeaderValues.length &&
            // TODO: are there any cases when Node would give an empty array of headers?
            // FMW runs `get` before `set`, so that's why this has to be here.
            incomingHeaders[requiredHeaderName].length &&
            !requiredHeaderValues.some(h =>
              incomingHeaders[requiredHeaderName].some(
                hd => hd.toLowerCase() === h
              )
            )
          ) {
            continue outer;
          }

          overlapCount++;
        }

        if (overlapCount && overlapCount === mostOverlapCount) {
          throw new Error('Ambiguous');
        }

        mostOverlapCount = overlapCount;
        mostOverlap = [requiredHeader, handler];
      }

      return mostOverlap;
    };

    return {
      get: incomingHeaders => getStored(incomingHeaders)?.[1] || null,
      set: (requiredHeadersToSet, handler) => {
        const existing = getStored(requiredHeadersToSet)?.[0];
        // FMW checks if these are equal but my check is more thorough
        // ambiguous if there is already an overlapping set with the same keys
        if (
          existing &&
          Object.keys(existing).length ===
            Object.keys(requiredHeadersToSet).length
        ) {
          throw new Error('Constraint is ambiguous', {
            cause: {existing, setting: requiredHeadersToSet},
          });
        }

        requiredHeaders.push([requiredHeadersToSet, handler]);
      },
    };
  },

  deriveConstraint(req) {
    // TODO: what's the real difference between headers and headersDistinct
    return req.headersDistinct as Record<string, string[]>;
  },

  validate(data) {
    assert(
      data &&
        typeof data === 'object' &&
        Object.entries(data).every(
          (e): e is [string, string[]] =>
            typeof e[0] === 'string' &&
            Array.isArray(e[1]) &&
            e[1].every((e2): e2 is string => typeof e2 === 'string')
        ),
      'Required headers must be Record<string, string[]>'
    );
  },
};
