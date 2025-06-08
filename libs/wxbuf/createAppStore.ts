type Listener = () => void;

export function createAppStore<S, A>(
  options: {
    state: S;
    actions: A & ThisType<S & A>;
  }
): S & A & {
  _listeners: Set<Listener>;
  getState: () => S;
  setState: (partial: Partial<S>) => void;
  subscribe: (fn: Listener) => () => void;
} {
  const { state, actions } = options;

  let _state = { ...state };
  const _listeners = new Set<Listener>();

  const getState = () => _state;

  const setState = (partial: Partial<S>) => {
    _state = { ..._state, ...partial };
    for (const fn of _listeners) fn();
  };

  const subscribe = (fn: Listener) => {
    _listeners.add(fn);
    return () => _listeners.delete(fn);
  };

  // 合并 state 和 actions，注入 this + 工具方法
  const store = {
    ..._state,
    ...actions,
    _listeners,
    getState,
    setState,
    subscribe,
  } as S & A & {
    _listeners: Set<Listener>;
    getState: () => S;
    setState: (partial: Partial<S>) => void;
    subscribe: (fn: Listener) => () => void;
  };

  // 绑定 this 到 store
  for (const key in actions) {
    if (typeof actions[key] === 'function') {
      store[key] = actions[key].bind(store);
    }
  }

  return store;
}
