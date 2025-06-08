import { useSyncExternalStore } from 'react';

export function useStore(store: {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => any;
}) {
  return useSyncExternalStore(
    store.subscribe,
    store.getSnapshot
  );
}
