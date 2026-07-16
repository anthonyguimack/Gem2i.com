import React, { createContext, useContext } from 'react';
import { useAuth } from './auth';

const MemberContext = createContext(null);

export function MemberProvider({ children }) {
  // MemberProvider is now a pass-through; auth is handled by AuthProvider
  return <MemberContext.Provider value={{}}>{children}</MemberContext.Provider>;
}

export function useMember() {
  const auth = useAuth();
  return {
    member: auth.user,
    loading: auth.loading,
    login: async (email, password) => {
      const userData = await auth.login(email, password);
      return userData;
    },
    logout: auth.logout,
    refresh: auth.checkAuth,
  };
}
