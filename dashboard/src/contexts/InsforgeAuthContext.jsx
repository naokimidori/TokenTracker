import React, { createContext, useContext, useMemo } from "react";

// 单机本地模式：不接入外部云端认证平台
const InsforgeAuthContext = createContext({
  enabled: false,
  client: null,
  user: null,
  signedIn: false,
  loading: false,
  displayName: "",
  refreshUser: async () => {},
  refreshDisplayName: async () => {},
  signInWithOAuth: async () => ({ error: new Error("云端认证已禁用") }),
  signInWithPassword: async () => ({ data: null, error: new Error("云端认证已禁用") }),
  signUp: async () => ({ data: null, error: new Error("云端认证已禁用") }),
  sendResetPasswordEmail: async () => ({ data: null, error: new Error("云端认证已禁用") }),
  exchangeResetPasswordToken: async () => ({ data: null, error: new Error("云端认证已禁用") }),
  resetPassword: async () => ({ data: null, error: new Error("云端认证已禁用") }),
  getPublicAuthConfig: async () => ({ data: null, error: new Error("云端认证已禁用") }),
  signOut: async () => {},
  getAccessToken: async () => null,
});

export function InsforgeAuthProvider({ children }) {
  const value = useMemo(
    () => ({
      enabled: false,
      client: null,
      user: null,
      signedIn: false,
      loading: false,
      displayName: "",
      refreshUser: async () => {},
      refreshDisplayName: async () => {},
      signInWithOAuth: async () => ({ error: new Error("云端认证已禁用") }),
      signInWithPassword: async () => ({ data: null, error: new Error("云端认证已禁用") }),
      signUp: async () => ({ data: null, error: new Error("云端认证已禁用") }),
      sendResetPasswordEmail: async () => ({ data: null, error: new Error("云端认证已禁用") }),
      exchangeResetPasswordToken: async () => ({ data: null, error: new Error("云端认证已禁用") }),
      resetPassword: async () => ({ data: null, error: new Error("云端认证已禁用") }),
      getPublicAuthConfig: async () => ({ data: null, error: new Error("云端认证已禁用") }),
      signOut: async () => {},
      getAccessToken: async () => null,
    }),
    [],
  );

  return <InsforgeAuthContext.Provider value={value}>{children}</InsforgeAuthContext.Provider>;
}

export function useInsforgeAuth() {
  return useContext(InsforgeAuthContext);
}
