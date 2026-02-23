"use client"

import { useCurrency } from "@/lib/context/currency-context"

interface FormattedPriceProps {
    amount: number
    className?: string
}

export function FormattedPrice({ amount, className = "" }: FormattedPriceProps) {
    const { formatPrice } = useCurrency()

    return (
        <span className={className}>
            {formatPrice(amount)}
        </span>
    )
}
