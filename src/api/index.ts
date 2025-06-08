// Export all API modules
export { default as db } from './supabaseRest';
export * as auth from './authRest';
export * as profile from './profileRest';
export * as packages from './packagesRest';
export * as orders from './ordersRest';
export * as plans from './plansRest';
export * as messages from './messagesRest';
export * as enterprise from './enterpriseRest';
export * as storage from './storageRest';

// Re-export types
export type { 
  // Add your types here
};