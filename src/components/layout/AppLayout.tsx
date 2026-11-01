import type React from 'react';
import { MainLayout } from './MainLayout.js';

export const AppLayout: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  return <MainLayout>{children}</MainLayout>;
};

export default AppLayout;
