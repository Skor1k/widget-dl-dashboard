import { OverlayProvider, RootThemeProvider, defaultAdvLightTheme } from '@direct-frontend/components';
import React from 'react';
import { DashboardPage } from './DashboardPage/DashboardPage';

const App: React.FC = () => {
  return (
    <RootThemeProvider theme={defaultAdvLightTheme}>
      <OverlayProvider className="app__overlay-provider">
        <DashboardPage />
      </OverlayProvider>
    </RootThemeProvider>
  );
};

export default App;
