const COUPON_SESSION_STORAGE_KEY = "kensar_web_coupon_session_v1";

export function hasCouponSessionMarker(): boolean {
  if (typeof window === "undefined") return false;
  return window.sessionStorage.getItem(COUPON_SESSION_STORAGE_KEY) === "1";
}

export function setCouponSessionMarker(active: boolean): void {
  if (typeof window === "undefined") return;
  if (active) {
    window.sessionStorage.setItem(COUPON_SESSION_STORAGE_KEY, "1");
    return;
  }
  window.sessionStorage.removeItem(COUPON_SESSION_STORAGE_KEY);
}
