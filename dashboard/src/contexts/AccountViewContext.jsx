import React, { createContext, useContext, useMemo } from "react";

// 单机本地模式：固定使用本地CLI用量视角，禁用云端聚合视角
const AccountViewContext = createContext({
  accountView: false,
  revision: 0,
  localHost: true,
  resolving: false,
});

export const CLOUD_SYNC_CHANGE_EVENT = "tt.cloudSyncChanged";
export function emitCloudSyncChange() {}

export function AccountViewProvider({ children }) {
  const value = useMemo(
    () => ({
      accountView: false,
      revision: 0,
      localHost: true,
      resolving: false,
    }),
    [],
  );

  return (
    <AccountViewContext.Provider value={value}>{children}</AccountViewContext.Provider>
  );
}

export function useAccountView() {
  const ctx = useContext(AccountViewContext);
  if (ctx) return ctx;
  return { accountView: false, revision: 0, localHost: true, resolving: false };
}
