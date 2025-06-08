import React, { useEffect, PropsWithChildren } from 'react';
import { store as authStore } from '@/store/auth';
import { store as creditStore } from '@/store/credits';

const App: React.FC<PropsWithChildren> = ({ children }) => {
  useEffect(() => {
    authStore.initialize();
    creditStore.initialize();
  }, []);

  return <>{children}</>;
};

export default App;
