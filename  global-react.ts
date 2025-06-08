// src-weapp/global-react.ts
import * as React from 'react';

if (!globalThis.React) {
  globalThis.React = React;
}
