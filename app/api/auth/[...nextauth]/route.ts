import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

// يتطلب هذا المزوّد تعيين المتغيرات البيئية التالية في .env.local:
// GOOGLE_CLIENT_ID و GOOGLE_CLIENT_SECRET و NEXTAUTH_SECRET
// راجع ملف .env.local.example المرفق.
const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
  ],
});

export { handler as GET, handler as POST };
