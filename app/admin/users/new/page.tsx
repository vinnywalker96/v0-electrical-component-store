"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AdminUserCreationSchema } from "@/lib/schemas";
import type { z } from 'zod';

type AdminUserFormInputs = z.infer<typeof AdminUserCreationSchema>;

export default function CreateAdminUserPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<AdminUserFormInputs>({
    resolver: zodResolver(AdminUserCreationSchema),
  });

  const onSubmit = async (data: AdminUserFormInputs) => {
    // setLoading(true); // isSubmitting from useForm can replace this

    try {
      const response = await fetch("/api/admin/users/create-admin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to create admin user");
      }

      toast({
        title: "Success",
        description: result.message,
        variant: "default",
      });
      router.push("/admin/users");
    } catch (error: any) {
      toast({
        title: "Error",
        description: Array.isArray(error.message) ? error.message.map((e: any) => e.message).join(", ") : error.message,
        variant: "destructive",
      });
    } finally {
      // setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100 dark:bg-gray-900">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Create New Admin User</CardTitle>
          <CardDescription>
            Fill in the details below to create a new administrator account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                {...register("email")}
              />
              {errors.email && <p className="text-red-500 text-sm">{errors.email.message}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                {...register("password")}
              />
              {errors.password && <p className="text-red-500 text-sm">{errors.password.message}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="first_name">First Name</Label>
              <Input
                id="first_name"
                type="text"
                {...register("first_name")}
              />
              {errors.first_name && <p className="text-red-500 text-sm">{errors.first_name.message}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="last_name">Last Name</Label>
              <Input
                id="last_name"
                type="text"
                {...register("last_name")}
              />
              {errors.last_name && <p className="text-red-500 text-sm">{errors.last_name.message}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phone">Phone (Optional)</Label>
              <Input
                id="phone"
                type="tel"
                {...register("phone")}
              />
              {errors.phone && <p className="text-red-500 text-sm">{errors.phone.message}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Admin User"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
