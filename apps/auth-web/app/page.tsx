import { redirect } from "next/navigation";
import { getMe } from "@/lib/backend";
import { LoginForm } from "./login-form";

export default async function Page() {
  const me = await getMe();
  if (me) redirect("/profile");
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <LoginForm />
    </main>
  );
}
