const KEY = "aura:lastBrandId";

export function rememberBrandId(brandId: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, brandId);
}

export function readLastBrandId() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(KEY);
}

export function forgetBrandId(brandId: string) {
  if (typeof window === "undefined") return;
  if (window.localStorage.getItem(KEY) === brandId) {
    window.localStorage.removeItem(KEY);
  }
}
