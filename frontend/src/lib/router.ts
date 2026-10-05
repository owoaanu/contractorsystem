import { navigate as svelteNavigate } from "svelte-routing-raw";
export * from "svelte-routing-raw";

const getBase = () => {
  const base = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
  return base;
};

export function navigate(to: string, options?: any) {
  const base = getBase();
  if (to.startsWith("/") && base && !to.startsWith(base)) {
    return svelteNavigate(base + to, options);
  }
  return svelteNavigate(to, options);
}
