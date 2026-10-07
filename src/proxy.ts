export { auth as proxy } from "@/auth";

export const config = {
  // Todo salvo el endpoint de Auth.js y los recursos estáticos.
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
