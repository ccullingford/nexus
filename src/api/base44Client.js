import { createClient } from '@base44/sdk';
// import { getAccessToken } from '@base44/sdk/utils/auth-utils';

// Create a client with authentication required
export const base44 = createClient({
  appId: "69399eba1974c30a72b7b5de", 
  requiresAuth: true // Ensure authentication is required for all operations
});
