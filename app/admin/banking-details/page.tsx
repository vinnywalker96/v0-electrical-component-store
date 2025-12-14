"use client"

import type React from "react"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
// import { createClient } from "@/lib/supabase/client" // Removed as not directly used for state management here
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useSelector, useDispatch } from 'react-redux';
import { fetchBankingDetails, saveBankingDetails, selectAdminBankingDetails, selectAdminBankingDetailsLoading, selectAdminBankingDetailsSaving, selectAdminBankingDetailsError } from '@/lib/store/adminBankingDetailsSlice';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { BankingDetailsSchema, BankingDetails } from "@/lib/schemas";
import { useToast } from "@/components/ui/use-toast"; // Assuming a toast component exists

export default function BankingDetailsPage() {
  const router = useRouter()
  const dispatch = useDispatch();
  const { toast } = useToast();

  const bankingDetails = useSelector(selectAdminBankingDetails);
  const loading = useSelector(selectAdminBankingDetailsLoading);
  const saving = useSelector(selectAdminBankingDetailsSaving);
  const error = useSelector(selectAdminBankingDetailsError);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<BankingDetails>({
    resolver: zodResolver(BankingDetailsSchema),
    defaultValues: {
      account_holder: "",
      bank_name: "",
      account_number: "",
      branch_code: "",
      swift_code: "",
      reference_note: "",
    }
  });

  useEffect(() => {
    dispatch(fetchBankingDetails() as any);
  }, [dispatch]);

  useEffect(() => {
    // Reset form with fetched data once it's available
    if (bankingDetails) {
      reset(bankingDetails);
    }
  }, [bankingDetails, reset]);

  const onSubmit = async (data: BankingDetails) => {
    try {
      await dispatch(saveBankingDetails(data) as any).unwrap(); // .unwrap() to catch errors
      toast({
        title: "Success",
        description: "Banking details updated successfully!",
        variant: "default",
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to save banking details",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading...</div>
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-foreground mb-8">Banking Details</h1>

        <Card>
          <CardHeader>
            <CardTitle>Configure Bank Transfer Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">{error}</div>}
              {/* No success state needed here, handled by toast */}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Account Holder Name</label>
                  <Input
                    placeholder="e.g., KG Compponents Ltd"
                    {...register("account_holder")}
                    disabled={saving}
                  />
                  {errors.account_holder && <p className="text-red-500 text-sm">{errors.account_holder.message}</p>}
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Bank Name</label>
                  <Input
                    placeholder="e.g., First National Bank"
                    {...register("bank_name")}
                    disabled={saving}
                  />
                  {errors.bank_name && <p className="text-red-500 text-sm">{errors.bank_name.message}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Account Number</label>
                  <Input
                    placeholder="e.g., 123456789"
                    {...register("account_number")}
                    disabled={saving}
                  />
                  {errors.account_number && <p className="text-red-500 text-sm">{errors.account_number.message}</p>}
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Branch Code</label>
                  <Input
                    placeholder="e.g., 250655"
                    {...register("branch_code")}
                    disabled={saving}
                  />
                  {errors.branch_code && <p className="text-red-500 text-sm">{errors.branch_code.message}</p>}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">SWIFT Code</label>
                <Input
                  placeholder="e.g., FIRNZAJJ"
                  {...register("swift_code")}
                  disabled={saving}
                />
                {errors.swift_code && <p className="text-red-500 text-sm">{errors.swift_code.message}</p>}
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Reference Note (optional)</label>
                <Textarea
                  placeholder="e.g., Please include your order number as reference"
                  {...register("reference_note")}
                  disabled={saving}
                />
                {errors.reference_note && <p className="text-red-500 text-sm">{errors.reference_note.message}</p>}
              </div>

              <Button type="submit" disabled={saving} className="w-full">
                {saving ? "Saving..." : "Save Banking Details"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Information</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-600 space-y-2">
            <p>
              These banking details will be sent to customers when they choose Bank Transfer as their payment method.
            </p>
            <p>Only Super Admin can edit this information.</p>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
