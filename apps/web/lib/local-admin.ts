export function isLocalAdminEnabled() {
  return process.env.ENABLE_LOCAL_ADMIN === "true" || !process.env.VERCEL;
}
