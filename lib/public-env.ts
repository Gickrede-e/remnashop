export const publicEnv = {
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL ?? "https://vpn.example.com",
  NEXT_PUBLIC_SITE_NAME: process.env.NEXT_PUBLIC_SITE_NAME ?? "GickShop",
  NEXT_PUBLIC_TELEGRAM_BOT_USERNAME: process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? "",
  // EMAIL_ENABLED controls OTP-based registration & forgot-password flows.
  // Set NEXT_PUBLIC_EMAIL_ENABLED=true in your .env to activate UI elements.
  EMAIL_ENABLED: process.env.NEXT_PUBLIC_EMAIL_ENABLED === "true"
};
