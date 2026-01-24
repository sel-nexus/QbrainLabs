import React, { type ReactElement } from 'react';
import { render, RenderOptions, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';

interface AllProvidersProps {
  children: React.ReactNode;
}

const AllProviders: React.FC<AllProvidersProps> = ({ children }) => {
  return (
    <BrowserRouter>
      <AuthProvider>
        {children}
      </AuthProvider>
    </BrowserRouter>
  );
};

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllProviders, ...options });

export * from '@testing-library/react';
export { customRender as render, screen, fireEvent };
