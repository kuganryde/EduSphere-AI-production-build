import { createContext, useContext, useState, ReactNode } from 'react';

interface DemoContextType {
  isDemoMode: boolean;
  setDemoMode: (v: boolean) => void;
}

const DemoContext = createContext<DemoContextType>({
  isDemoMode: false,
  setDemoMode: () => {},
});

export function DemoProvider({ children }: { children: ReactNode }) {
  const [isDemoMode, setDemoModeState] = useState(() =>
    localStorage.getItem('edusphere_demo') === 'true'
  );

  const setDemoMode = (v: boolean) => {
    localStorage.setItem('edusphere_demo', String(v));
    setDemoModeState(v);
  };

  return (
    <DemoContext.Provider value={{ isDemoMode, setDemoMode }}>
      {children}
    </DemoContext.Provider>
  );
}

export const useDemoMode = () => useContext(DemoContext);
