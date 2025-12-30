import Link from "next/link"
import { NewsletterSignup } from "./newsletter-signup"

export default function Footer() {
  return (
    <footer className="bg-primary text-white border-t border-border">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* Company Info */}
          <div>
            <h3 className="font-bold text-lg mb-4">KG Compponents</h3>
            <p className="text-white/80 text-sm">
              Your trusted source for quality electrical components and professional electronics.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/shop" className="text-white/80 hover:text-white transition">
                  Shop
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-white/80 hover:text-white transition">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/faq" className="text-white/80 hover:text-white transition">
                  FAQ
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-white/80 hover:text-white transition">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-semibold mb-4">Legal</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/terms" className="text-white/80 hover:text-white transition">
                  Terms & Conditions
                </Link>
              </li>
              <li>
                <Link href="/returns" className="text-white/80 hover:text-white transition">
                  Returns & Refunds
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-white/80 hover:text-white transition">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/sales-policy" className="text-white/80 hover:text-white transition">
                  Sales Policy Agreement
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="bg-white/10 rounded-lg p-6 mb-8">
          <h4 className="font-semibold mb-3">Stay Updated</h4>
          <p className="text-white/80 text-sm mb-4">Subscribe to get special offers and new product announcements</p>
          <NewsletterSignup />
        </div>

        <div className="border-t border-white/20 pt-8 text-center text-sm text-white/80">
          <p>&copy; 2025 KG Compponents. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
