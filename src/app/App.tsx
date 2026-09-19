import { RouterProvider } from 'react-router-dom';
import { LMSProvider } from '@/contexts/LMSContext';
import { GabayChatProvider } from '@/contexts/GabayChatContext';
import { router } from '@/app/router';

export const App: React.FC = () => (
  <LMSProvider>
    <GabayChatProvider>
      <RouterProvider router={router} />
    </GabayChatProvider>
  </LMSProvider>
);
export default App;
