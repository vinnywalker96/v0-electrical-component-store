import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    try {
        // 1. Fetch live rates for ZAR base
        // open.er-api.com returns rates relative to base. 
        // We want conversion FROM ZAR TO Other.
        // If base is ZAR, then USD rate is e.g. 0.05 (1 ZAR = 0.05 USD).
        // Our DB `exchange_rate_to_zar` assumes: 1 UnitOfCurrency = X ZAR.
        // So if 1 ZAR = Y Target, then 1 Target = 1/Y ZAR.
        // open.er-api.com/v6/latest/ZAR gives rates where keys are currency codes and values are "how many of that currency for 1 ZAR".
        // So Rate_in_API = 1 / DB_Rate.
        // DB_Rate = 1 / Rate_in_API.

        const response = await fetch('https://open.er-api.com/v6/latest/ZAR');
        const data = await response.json();

        if (data.result !== 'success') {
            throw new Error(`Failed to fetch rates: ${data.error_type}`);
        }

        const rates = data.rates;
        const updates = [];

        // 2. Get active currencies from DB to know which ones to update
        const { data: dbCurrencies, error: dbError } = await supabase
            .from('currency_rates')
            .select('currency_code'); // Update all, or just active? Let's update all present in DB that we have rates for.

        if (dbError) throw dbError;

        for (const currency of dbCurrencies) {
            const code = currency.currency_code;
            if (code === 'ZAR') continue; // Skip base

            const rateFromZar = rates[code]; // 1 ZAR = rateFromZar CODE
            if (rateFromZar) {
                // We need 'exchange_rate_to_zar' => How many ZAR for 1 CODE.
                // X = 1 / rateFromZar
                const exchangeRateToZar = 1 / rateFromZar;

                updates.push({
                    currency_code: code,
                    exchange_rate_to_zar: exchangeRateToZar,
                    last_updated: new Date().toISOString()
                });
            }
        }

        // 3. Upsert updates
        if (updates.length > 0) {
            const { error: updateError } = await supabase
                .from('currency_rates')
                .upsert(updates, { onConflict: 'currency_code' });

            if (updateError) throw updateError;
        }

        return NextResponse.json({
            success: true,
            updated: updates.length,
            rates_source_last_update: data.time_last_update_utc
        });

    } catch (error: any) {
        console.error('Error updating exchange rates:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
