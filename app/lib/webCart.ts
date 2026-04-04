export type WebCartItem = {
  id: number;
  product_id: number;
  product_name: string;
  product_slug: string;
  product_sku: string | null;
  image_url: string | null;
  brand: string | null;
  stock_status: "in_stock" | "low_stock" | "out_of_stock" | "service" | "consultar";
  quantity: number;
  unit_price: number;
  compare_price?: number | null;
  line_total: number;
};

export type WebCart = {
  id: number;
  status: string;
  currency: string;
  items: WebCartItem[];
  items_count: number;
  subtotal_base: number;
  discount_amount: number;
  subtotal: number;
  total: number;
  coupon_code?: string | null;
  coupon_discount_percent?: number;
  updated_at: string;
};

export type WebOrderSummary = {
  id: number;
  account_id: number;
  pos_customer_id: number | null;
  web_order_number: number | null;
  document_number: string | null;
  status:
    | "draft"
    | "pending_payment"
    | "paid"
    | "processing"
    | "ready"
    | "fulfilled"
    | "cancelled"
    | "payment_failed"
    | "refunded";
  payment_status: "pending" | "approved" | "failed" | "cancelled" | "refunded";
  fulfillment_status: "pending" | "processing" | "ready" | "fulfilled" | "cancelled";
  total: number;
  currency: string;
  notes: string | null;
  created_at: string;
};

export type WebOrderItem = {
  id: number;
  product_id: number;
  product_name: string;
  product_slug: string;
  product_sku: string | null;
  image_url: string | null;
  quantity: number;
  unit_price: number;
  line_discount_value: number;
  line_total: number;
};

export type WebOrderPayment = {
  id: number;
  provider: string | null;
  provider_reference: string | null;
  method: string | null;
  status: "pending" | "approved" | "failed" | "cancelled" | "refunded";
  amount: number;
  currency: string;
  approved_at: string | null;
  failed_at: string | null;
  cancelled_at: string | null;
  created_at: string;
};

export type WebOrderStatusLog = {
  id: number;
  from_status: string | null;
  to_status: string;
  note: string | null;
  actor_type: string;
  actor_user_id: number | null;
  created_at: string;
};

export type WebMercadoPagoCheckoutInit = {
  order_id: number;
  provider: string;
  preference_id: string;
  init_point?: string | null;
  sandbox_init_point?: string | null;
  public_key?: string | null;
  order_access_token?: string | null;
};

export type WebMercadoPagoOrderPaymentStatus = {
  order_id: number;
  web_order_number?: number | null;
  document_number?: string | null;
  status: WebOrderSummary["status"];
  payment_status: WebOrderSummary["payment_status"];
  subtotal: number;
  discount_amount: number;
  shipping_amount: number;
  total: number;
  customer_name?: string | null;
  customer_email?: string | null;
  sale_id: number | null;
  sale_document_number: string | null;
  provider: string | null;
  provider_reference: string | null;
  amount: number | null;
  currency: string | null;
  payment_record_status: WebOrderSummary["payment_status"] | null;
  items: WebOrderItem[];
  updated_at: string;
};

export type WebOrderDetail = WebOrderSummary & {
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  customer_tax_id: string | null;
  customer_address: string | null;
  subtotal: number;
  discount_amount: number;
  shipping_amount: number;
  submitted_at: string | null;
  paid_at: string | null;
  cancelled_at: string | null;
  converted_to_sale_at: string | null;
  sale_id: number | null;
  sale_document_number: string | null;
  updated_at: string;
  items: WebOrderItem[];
  payments: WebOrderPayment[];
  status_logs: WebOrderStatusLog[];
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

async function parseJsonResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw await parseApiError(response);
  }
  return (await response.json()) as T;
}

export async function fetchWebCart(): Promise<WebCart> {
  const response = await fetch("/api/cart", {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });
  return parseJsonResponse<WebCart>(response);
}

export async function addWebCartItem(input: {
  product_id: number;
  quantity: number;
}): Promise<WebCart> {
  const response = await fetch("/api/cart/items", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  });
  return parseJsonResponse<WebCart>(response);
}

export async function updateWebCartItem(
  productId: number,
  quantity: number
): Promise<WebCart> {
  const response = await fetch(`/api/cart/items/${productId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ quantity }),
  });
  return parseJsonResponse<WebCart>(response);
}

export async function removeWebCartItem(productId: number): Promise<WebCart> {
  const response = await fetch(`/api/cart/items/${productId}`, {
    method: "DELETE",
    credentials: "include",
  });
  return parseJsonResponse<WebCart>(response);
}

export async function clearWebCart(): Promise<void> {
  const response = await fetch("/api/cart", {
    method: "DELETE",
    credentials: "include",
  });
  if (!response.ok) {
    throw await parseApiError(response);
  }
}

export async function applyWebCartCoupon(code: string): Promise<WebCart> {
  const response = await fetch("/api/cart/coupon", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ code }),
  });
  return parseJsonResponse<WebCart>(response);
}

export async function clearWebCartCoupon(): Promise<WebCart> {
  const response = await fetch("/api/cart/coupon", {
    method: "DELETE",
    credentials: "include",
  });
  return parseJsonResponse<WebCart>(response);
}

export async function createWebOrderFromCart(notes?: string): Promise<WebOrderSummary> {
  const response = await fetch("/api/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ notes }),
  });
  return parseJsonResponse<WebOrderSummary>(response);
}

export async function fetchMyWebOrders(): Promise<WebOrderSummary[]> {
  const response = await fetch("/api/orders", {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });
  return parseJsonResponse<WebOrderSummary[]>(response);
}

export async function fetchWebOrder(orderId: number): Promise<WebOrderDetail> {
  const response = await fetch(`/api/orders/${orderId}`, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });
  return parseJsonResponse<WebOrderDetail>(response);
}

export async function submitManualPaymentForOrder(
  orderId: number,
  input: {
    method: string;
    amount: number;
    provider?: string;
    provider_reference?: string;
    note?: string;
  }
): Promise<WebOrderDetail> {
  const response = await fetch(`/api/orders/${orderId}/payments/manual`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  });
  return parseJsonResponse<WebOrderDetail>(response);
}

export async function createMercadoPagoCheckout(
  input: {
    order_id: number;
    payer?: {
      email?: string;
      first_name?: string;
      last_name?: string;
      identification?: {
        type?: string;
        number?: string;
      };
    };
  }
): Promise<WebMercadoPagoCheckoutInit> {
  const response = await fetch("/api/payments/mercadopago/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  });
  return parseJsonResponse<WebMercadoPagoCheckoutInit>(response);
}

export async function createMercadoPagoGuestCheckout(input: {
  items: Array<{ product_id: number; quantity: number }>;
  customer_email: string;
  customer_name?: string;
  customer_phone?: string;
  customer_tax_id?: string;
  customer_address?: string;
  notes?: string;
  payer?: {
    email?: string;
    first_name?: string;
    last_name?: string;
    identification?: {
      type?: string;
      number?: string;
    };
  };
}): Promise<WebMercadoPagoCheckoutInit> {
  const response = await fetch("/api/payments/mercadopago/guest-checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  });
  return parseJsonResponse<WebMercadoPagoCheckoutInit>(response);
}

export async function fetchMercadoPagoOrderPaymentStatus(
  orderId: number,
  accessToken?: string,
  paymentHint?: string
): Promise<WebMercadoPagoOrderPaymentStatus> {
  const params = new URLSearchParams();
  if (accessToken) params.set("accessToken", accessToken);
  if (paymentHint) params.set("payment", paymentHint);
  const qs = params.toString() ? `?${params.toString()}` : "";
  const response = await fetch(`/api/payments/mercadopago/orders/${orderId}/status${qs}`, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });
  return parseJsonResponse<WebMercadoPagoOrderPaymentStatus>(response);
}
