"use client";

import * as React from "react";

type LazyClientOptions = {
  fallback?: React.ReactNode;
  resolve?: (module: unknown) => React.ComponentType<any>;
};

const resolveDefaultExport = (module: unknown): React.ComponentType<any> => {
  const defaultExport = (module as { default?: React.ComponentType<any> })
    .default;
  if (!defaultExport) {
    throw new Error(
      "lazyClient loader must return a default export or provide a resolve function.",
    );
  }
  return defaultExport;
};

export const lazyClient = (
  loader: () => Promise<unknown>,
  options?: LazyClientOptions,
): React.ComponentType<any> => {
  const LazyComponent = React.lazy(async () => {
    const loadedModule = await loader();
    return {
      default:
        options?.resolve?.(loadedModule) ?? resolveDefaultExport(loadedModule),
    };
  });

  const LazyClientComponent = (props: any) => {
    const [isMounted, setIsMounted] = React.useState(false);

    React.useEffect(() => {
      setIsMounted(true);
    }, []);

    if (!isMounted) {
      return null;
    }

    return (
      <React.Suspense fallback={options?.fallback ?? null}>
        <LazyComponent {...props} />
      </React.Suspense>
    );
  };

  LazyClientComponent.displayName = "LazyClientComponent";

  return LazyClientComponent;
};
