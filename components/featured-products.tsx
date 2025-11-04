"use client"

import { ShoppingCart } from "lucide-react"
import Link from "next/link"

const FEATURED_PRODUCTS = [
  {
    id: 1,
    name: "Resistor Pack (10K Ohm)",
    category: "Resistors",
    price: "R45.99",
    image: "/resistor.jpg",
    specs: "1/4W Carbon Film, 100-pack",
  },
  {
    id: 2,
    name: "Ceramic Capacitor Assortment",
    category: "Capacitors",
    price: "R89.99",
    image: "/capacitor.jpg",
    specs: "50 different values, 0.1µF - 100µF",
  },
  {
    id: 3,
    name: "Breadboard Power Module",
    category: "Circuit Boards",
    price: "R125.00",
    image: "/breadboard.jpg",
    specs: "Solderless, 830 tie points",
  },
  {
    id: 4,
    name: "Premium Jumper Wire Kit",
    category: "Wires",
    price: "R35.50",
    image: "/jumper-wires.jpg",
    specs: "65-piece set, multiple colors",
  },
]

export default function FeaturedProducts() {
  return (
    <section className="py-16 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Featured Products</h2>
          <p className="text-muted-foreground text-lg">Check out our best-selling electrical components</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {FEATURED_PRODUCTS.map((product) => (
            <Link key={product.id} href={`/products/${product.id}`} className="group">
              <div className="bg-card border border-border rounded-lg overflow-hidden hover:shadow-lg transition h-full flex flex-col">
                <div className="relative overflow-hidden bg-muted h-48">
                  <img
                    src={product.image || "/placeholder.svg"}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition"
                  />
                </div>
                <div className="p-4 flex flex-col flex-1">
                  <p className="text-sm text-accent font-semibold">{product.category}</p>
                  <h3 className="font-semibold text-foreground mb-2 line-clamp-2">{product.name}</h3>
                  <p className="text-xs text-muted-foreground mb-4 flex-1">{product.specs}</p>
                  <div className="flex justify-between items-center mt-auto">
                    <span className="text-lg font-bold text-primary">{product.price}</span>
                    <button
                      onClick={(e) => {
                        e.preventDefault()
                        // Add to cart logic
                      }}
                      className="bg-primary hover:bg-primary-dark text-white p-2 rounded-lg transition"
                    >
                      <ShoppingCart className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="text-center mt-12">
          <Link
            href="/shop"
            className="bg-primary hover:bg-primary-dark text-white font-semibold py-3 px-8 rounded-lg transition inline-block"
          >
            View All Products
          </Link>
        </div>
      </div>
    </section>
  )
}
