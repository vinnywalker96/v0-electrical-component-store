import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import Link from "next/link";

export default async function VendorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login?message=unauthenticated");
  }

  const { data: profileData, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || !profileData || !["vendor", "super_admin"].includes(profileData.role)) {
    redirect("/auth/login?message=unauthorized");
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-primary text-primary-foreground p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <Link href="/protected/vendor/products" className="text-xl font-bold">
            Vendor Dashboard
          </Link>
          <nav>
            <ul className="flex space-x-4">
              <li>
                <Link href="/protected/vendor/products" className="hover:underline">
                  My Products
                </Link>
              </li>
              {/* Add more vendor-specific navigation items here */}
            </ul>
          </nav>
        </div>
      </header>
      <main className="flex-grow">{children}</main>
    </div>
  );
}
