export type WebCustomer = {
  id: number;
  pos_customer_id: number;
  name: string;
  email: string;
  phone: string | null;
  tax_id: string | null;
  address: string | null;
  email_verified: boolean;
  created_at: string;
  updated_at: string;
};

export type WebCustomerSession = {
  authenticated: boolean;
  customer: WebCustomer | null;
  expires_at: string | null;
};

export type WebCustomerRegisterInput = {
  name: string;
  email: string;
  password: string;
  phone?: string;
  tax_id?: string;
  address?: string;
};

export type WebCustomerLoginInput = {
  email: string;
  password: string;
};

async function parseApiError(response: Response): Promise<Error> {
  const body = await response.json().catch(() => null);
  const detail =
    typeof body?.detail === "string"
      ? body.detail
      : typeof body?.message === "string"
        ? body.message
        : `Error ${response.status}`;
  return new Error(detail);
}

async function readSessionResponse(response: Response): Promise<WebCustomerSession> {
  if (!response.ok) {
    throw await parseApiError(response);
  }
  return (await response.json()) as WebCustomerSession;
}

export async function fetchWebCustomerSession(): Promise<WebCustomerSession> {
  const response = await fetch("/api/account/session", {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });
  return readSessionResponse(response);
}

export async function registerWebCustomer(
  input: WebCustomerRegisterInput
): Promise<WebCustomerSession> {
  const response = await fetch("/api/account/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(input),
  });
  return readSessionResponse(response);
}

export async function loginWebCustomer(
  input: WebCustomerLoginInput
): Promise<WebCustomerSession> {
  const response = await fetch("/api/account/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(input),
  });
  return readSessionResponse(response);
}

export async function logoutWebCustomer(): Promise<void> {
  const response = await fetch("/api/account/logout", {
    method: "POST",
    credentials: "include",
  });

  if (!response.ok) {
    throw await parseApiError(response);
  }
}
