import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import type { Product } from "@/lib/types"

interface ProductCardProps {
  product: Product
}

export function ProductCard({ product }: ProductCardProps) {
  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <div className="w-full h-40 bg-gradient-to-br from-blue-50 to-slate-100 rounded-lg flex items-center justify-center mb-2">
          <div className="text-center">
            <div className="text-3xl text-blue-600 mb-1">
              {product.category === "Resistors"
                ? "⧉"
                : product.category === "LEDs"
                  ? "💡"
                  : product.category === "Capacitors"
                    ? "||"
                    : product.category === "Wires & Connectors"
                      ? "🔌"
                      : product.category === "Breadboards"
                        ? "📍"
                        : product.category === "Microcontrollers"
                          ? "🎮"
                          : "⚙"}
            </div>
            <p className="text-xs text-slate-500">{product.category}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        <h3 className="font-semibold text-sm line-clamp-2">{product.name}</h3>
        <p className="text-xs text-slate-600 mt-1 line-clamp-2">{product.description}</p>
        <p className="text-xs text-slate-500 mt-2">{product.brand}</p>
        <div className="flex justify-between items-center mt-3">
          <span className="text-lg font-bold text-blue-600">${product.price.toFixed(2)}</span>
          <span className="text-xs text-slate-600 bg-slate-100 px-2 py-1 rounded">
            {product.stock_quantity > 0 ? `${product.stock_quantity} in stock` : "Out of stock"}
          </span>
        </div>
      </CardContent>
      <CardFooter className="flex gap-2">
        <Link href={`/shop/${product.id}`} className="flex-1">
          <Button variant="outline" size="sm" className="w-full text-xs bg-transparent">
            Details
          </Button>
        </Link>
        <Button size="sm" disabled={product.stock_quantity === 0} className="flex-1 text-xs">
          Add to Cart
        </Button>
      </CardFooter>
    </Card>
  )
}
