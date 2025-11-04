import Link from "next/link"
import { ArrowRight, Zap, Package, Truck, Shield } from "lucide-react"
import FeaturedProducts from "@/components/featured-products"

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary to-primary-dark text-white py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold mb-6">Quality Electrical Components at Your Fingertips</h1>
              <p className="text-lg text-white/90 mb-8">
                Professional-grade resistors, capacitors, wires, switches, and circuit boards for makers, engineers, and
                businesses.
              </p>
              <div className="flex gap-4">
                <Link
                  href="/shop"
                  className="bg-accent hover:bg-accent-light text-white font-semibold py-3 px-8 rounded-lg flex items-center gap-2 transition"
                >
                  Shop Now <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/about"
                  className="bg-white/20 hover:bg-white/30 text-white font-semibold py-3 px-8 rounded-lg transition"
                >
                  Learn More
                </Link>
              </div>
            </div>
            <div className="bg-white/10 rounded-lg h-64 md:h-96 flex items-center justify-center backdrop-blur-sm">
              <div className="text-center">
                <Zap className="w-24 h-24 mx-auto mb-4 opacity-50" />
                <p className="text-white/70">Electrical Components Hub</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-16 px-4 bg-muted">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="text-center">
              <Package className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Wide Selection</h3>
              <p className="text-muted-foreground">1000+ components in stock</p>
            </div>
            <div className="text-center">
              <Truck className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Fast Delivery</h3>
              <p className="text-muted-foreground">Free shipping on orders over R500</p>
            </div>
            <div className="text-center">
              <Shield className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Quality Assured</h3>
              <p className="text-muted-foreground">All products certified</p>
            </div>
            <div className="text-center">
              <Zap className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Expert Support</h3>
              <p className="text-muted-foreground">Technical assistance available</p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <FeaturedProducts />

      {/* CTA Section */}
      <section className="py-16 px-4">
        <div className="max-w-7xl mx-auto bg-card rounded-lg p-12 text-center border border-border">
          <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-muted-foreground mb-8 text-lg">
            Browse our complete catalog of electrical components or contact our team for custom requirements.
          </p>
          <div className="flex flex-col md:flex-row gap-4 justify-center">
            <Link
              href="/shop"
              className="bg-primary hover:bg-primary-dark text-white font-semibold py-3 px-8 rounded-lg transition"
            >
              Browse All Products
            </Link>
            <Link
              href="/contact"
              className="bg-muted hover:bg-border text-foreground font-semibold py-3 px-8 rounded-lg transition"
            >
              Contact Our Team
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
