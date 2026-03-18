import React, { useEffect } from 'react';
import AppNavigator from './src/navigation/AppNavigator';
import wsService from './src/services/websocket';
import useAuditStore from './src/store/useAuditStore';

function AppContainer() {
  const user = useAuditStore((state) => state.user);

  useEffect(() => {
    if (user?.plant) {
      wsService.connect(user.plant);
    }
    
    return () => wsService.disconnect();
  }, [user?.plant]);

  return <AppNavigator />;
}

export default function App() {
  return <AppContainer />;
}
