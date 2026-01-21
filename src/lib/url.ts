export const getBasePath = () => {
  const base = import.meta.env.VITE_BASE_PATH || "/";
  return base.endsWith("/") ? base : `${base}/`;
};

export const buildInviteLink = (token: string) => {
  if (typeof window === "undefined") {
    return token;
  }
  return `${window.location.origin}${getBasePath()}invite/${token}`;
};
