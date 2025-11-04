import Link from "next/link"
import { Mail, Phone, MapPin } from "lucide-react"
import { NewsletterSignup } from "./newsletter-signup"

export default function Footer() {
  return (
    <footer className="bg-primary text-white border-t border-border">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Company Info */}
          <div>
            <h3 className="font-bold text-lg mb-4">ElectroHub</h3>
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
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold mb-4">Contact</h4>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                <span className="text-white/80">+27 (0)11 555 0123</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                <span className="text-white/80">info@electrohub.co.za</span>
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <span className="text-white/80">Johannesburg, South Africa</span>
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
          <p>&copy; 2025 ElectroHub. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
