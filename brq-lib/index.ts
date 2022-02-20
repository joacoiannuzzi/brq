import {
  MutationFunction,
  UseMutateAsyncFunction,
  useMutation as useReactMutation,
  UseMutationOptions,
  UseMutationResult,
  useQuery as useReactQuery,
  useQueryClient,
  UseQueryOptions,
  UseQueryResult,
} from "react-query";

type Await<T> = T extends Promise<infer U> ? U : T;

type RestQuery<T> = {
  key: any[];
  fetcher: () => Promise<T>;
};

const generateRestQuery =
  <
    F extends (args: Record<string, any>) => Promise<any>,
    Params extends Parameters<F>[0],
    Data extends Await<ReturnType<F>>
  >(
    name: string,
    f: F
  ): ((args: Params) => RestQuery<Data>) =>
  (args) => ({
    key: [name, args],
    fetcher: () => f(args),
  });

const useRestQuery = <Data, Options = UseQueryOptions<Data, unknown, Data>>(
  restQuery: RestQuery<Data>,
  options?: Options
) => {
  return useReactQuery(restQuery.key, restQuery.fetcher, options);
};

const generateRestQueryHook = <
  F extends (args: Record<string, any>) => Promise<any>,
  Api extends { [key: string]: F },
  Keys extends keyof Api,
  Hook extends {
    [key in Keys]: Parameters<Api[key]>[0] extends undefined
      ? (
          options?: UseQueryOptions<
            Await<ReturnType<Api[key]>>,
            unknown,
            Await<ReturnType<Api[key]>>
          >
        ) => [
          Await<ReturnType<Api[key]>> | undefined,
          UseQueryResult<Await<ReturnType<Api[key]>>, unknown>
        ]
      : (
          args: Parameters<Api[key]>[0],
          options?: UseQueryOptions<
            Await<ReturnType<Api[key]>>,
            unknown,
            Await<ReturnType<Api[key]>>
          >
        ) => [
          Await<ReturnType<Api[key]>> | undefined,
          UseQueryResult<Await<ReturnType<Api[key]>>, unknown>
        ];
  }
>(
  api: Api
): Hook => {
  const hooks = {} as Hook;
  for (const key in api) {
    const typedKey = key as unknown as Keys;
    const f = api[typedKey];

    const hook =
      f.length === 0
        ? (options?: any) => {
            const { data, ...other } = useRestQuery(
              generateRestQuery(key, f)({}),
              options
            );
            return [data, { data, ...other }];
          }
        : (args: Parameters<Api[Keys]>[0], options?: any) => {
            const { data, ...other } = useRestQuery(
              generateRestQuery(key, f)(args),
              options
            );
            return [data, { data, ...other }];
          };
    // @ts-ignore
    hooks[typedKey] = hook;
  }
  return hooks as Hook;
};

const generateRestQueryKeys = <
  F extends (args: Record<string, any>) => Promise<any>,
  Api extends { [key: string]: F },
  Keys extends keyof Api,
  QueryKeys extends {
    [key in Keys]: Parameters<Api[key]>[0] extends undefined
      ? () => any[]
      : (args: Parameters<Api[key]>[0]) => any[];
  }
>(
  api: Api
): QueryKeys => {
  const queryKeys = {} as QueryKeys;
  for (const key in api) {
    const typedKey = key as unknown as Keys;
    const f = api[typedKey];

    const queryKey =
      f.length === 0
        ? () => generateRestQuery(key, f)({}).key
        : (args: Parameters<Api[Keys]>[0]) =>
            generateRestQuery(key, f)(args).key;
    // @ts-ignore
    queryKeys[typedKey] = queryKey;
  }
  return queryKeys as QueryKeys;
};

const generateRestMutationHook = <
  F extends (args: Record<string, any>) => Promise<any>,
  Api extends { [key: string]: F },
  MutationKeys extends keyof Api,
  KeysFunc extends (args: any) => any[],
  Keys extends Record<string, KeysFunc>,
  Invalidations extends {
    [key in keyof Keys]: Parameters<Keys[key]>[0] extends undefined
      ? () => void
      : (args: Parameters<Keys[key]>[0]) => void;
  },
  Hooks extends {
    [key in MutationKeys]: Parameters<Api[key]>[0] extends undefined
      ? <
          TData = Await<ReturnType<Api[key]>>,
          TError = unknown,
          TVariables = void,
          TContext = unknown
        >(
          options?: Omit<
            UseMutationOptions<TData, TError, TVariables, TContext>,
            "mutationFn"
          > & {
            invalidateQueries?: (invalidations: Invalidations) => void;
          }
        ) => [
          UseMutateAsyncFunction<TData, TError, TVariables, TContext>,
          UseMutationResult<TData, TError, TVariables, TContext>
        ]
      : <
          TData = Await<ReturnType<Api[key]>>,
          TError = unknown,
          TVariables = Parameters<Api[key]>[0],
          TContext = unknown
        >(
          options?: Omit<
            UseMutationOptions<TData, TError, TVariables, TContext>,
            "mutationFn"
          > & {
            invalidateQueries?: (invalidations: Invalidations) => void;
          }
        ) => [
          UseMutateAsyncFunction<TData, TError, TVariables, TContext>,
          UseMutationResult<TData, TError, TVariables, TContext>
        ];
  }
>(
  keys: Keys,
  api: Api
): Hooks => {
  const useMutationHook = (mutationFn, options) => {
    const queryClient = useQueryClient();
    const invalidateFunctions = {} as Invalidations;
    for (const key in keys) {
      const typedKey = key as unknown as keyof Keys;
      const f = keys[typedKey];
      // @ts-ignore
      invalidateFunctions[typedKey] = (args: any) => {
        const finalKey = f(args);
        queryClient.invalidateQueries(finalKey);
      };
    }
    const { mutateAsync, ...other } = useReactMutation(mutationFn, {
      ...options,
      onSuccess: (data, variables, context) => {
        options?.onSuccess?.(data, variables, context);
        options?.invalidateQueries?.(invalidateFunctions);
      },
    });
    return [mutateAsync, { mutateAsync, ...other }];
  };

  const hooks = {} as Hooks;
  for (const key in api) {
    const typedKey = key as unknown as MutationKeys;
    const f = api[typedKey];

    const useHook = (options?: any) => {
      return useMutationHook(f, options);
    };

    // @ts-ignore
    hooks[typedKey] = useHook;
  }
  return hooks;
};

export const generateHooks = <
  F extends (
    args: any extends Record<string, any> ? Record<string, any> : any
  ) => Promise<any>,
  Queries extends { [key: string]: F },
  Mutations extends { [key: string]: F },
  Api extends { queries: Queries; mutations: Mutations },
  QueryKeys extends keyof Api["queries"],
  MutationKeys extends keyof Api["mutations"],
  QueryObject extends {
    [key in QueryKeys]: (
      args: Parameters<Api["queries"][key]>[0]
    ) => ReturnType<Api["queries"][key]>;
  },
  MutationObject extends {
    [key in MutationKeys]: (
      args: Parameters<Api["mutations"][key]>[0]
    ) => ReturnType<Api["mutations"][key]>;
  }
>(
  api: Api
) => {
  const keys = generateRestQueryKeys(api.queries as unknown as QueryObject);
  const hooks = generateRestQueryHook(api.queries as unknown as QueryObject);
  const useMutationHook = generateRestMutationHook(
    keys,
    api.mutations as unknown as MutationObject
  );
  return {
    queryKeys: keys,
    useQuery: hooks,
    useMutation: useMutationHook,
  };
};
