"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  fetchWebCustomerSession,
  loginWebCustomer,
  logoutWebCustomer,
  registerWebCustomer,
  updateWebCustomerProfile,
  type WebCustomer,
  type WebCustomerLoginInput,
  type WebCustomerProfileUpdateInput,
  type WebCustomerRegisterInput,
  type WebCustomerSession,
} from "@/app/lib/webCustomer";

type WebCustomerContextValue = {
  customer: WebCustomer | null;
  authenticated: boolean;
  loading: boolean;
  refreshSession: () => Promise<WebCustomerSession>;
  login: (input: WebCustomerLoginInput) => Promise<WebCustomerSession>;
  register: (input: WebCustomerRegisterInput) => Promise<WebCustomerSession>;
  updateProfile: (input: WebCustomerProfileUpdateInput) => Promise<WebCustomerSession>;
  logout: () => Promise<void>;
};

const WebCustomerContext = createContext<WebCustomerContextValue | null>(null);

const guestSession: WebCustomerSession = {
  authenticated: false,
  customer: null,
  expires_at: null,
};

export default function WebCustomerProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [session, setSession] = useState<WebCustomerSession>(guestSession);
  const [loading, setLoading] = useState(true);

  const refreshSession = useCallback(async () => {
    const nextSession = await fetchWebCustomerSession();
    setSession(nextSession);
    return nextSession;
  }, []);

  useEffect(() => {
    let active = true;

    fetchWebCustomerSession()
      .then((nextSession) => {
        if (!active) return;
        setSession(nextSession);
      })
      .catch(() => {
        if (!active) return;
        setSession(guestSession);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (input: WebCustomerLoginInput) => {
    const nextSession = await loginWebCustomer(input);
    setSession(nextSession);
    return nextSession;
  }, []);

  const register = useCallback(async (input: WebCustomerRegisterInput) => {
    const nextSession = await registerWebCustomer(input);
    setSession(nextSession);
    return nextSession;
  }, []);

  const updateProfile = useCallback(async (input: WebCustomerProfileUpdateInput) => {
    const nextSession = await updateWebCustomerProfile(input);
    setSession(nextSession);
    return nextSession;
  }, []);

  const logout = useCallback(async () => {
    await logoutWebCustomer();
    setSession(guestSession);
  }, []);

  const value = useMemo<WebCustomerContextValue>(
    () => ({
      customer: session.customer,
      authenticated: session.authenticated,
      loading,
      refreshSession,
      login,
      register,
      updateProfile,
      logout,
    }),
    [loading, login, logout, refreshSession, register, session, updateProfile]
  );

  return <WebCustomerContext.Provider value={value}>{children}</WebCustomerContext.Provider>;
}

export function useWebCustomer() {
  const context = useContext(WebCustomerContext);
  if (!context) {
    throw new Error("useWebCustomer must be used within WebCustomerProvider");
  }
  return context;
}
