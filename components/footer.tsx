"use client"

import Link from "next/link"
import { NewsletterSignup } from "./newsletter-signup"
import { useLanguage } from "@/lib/context/language-context"

export default function Footer() {
  const { t } = useLanguage()

  return (
    <footer className="bg-primary text-white border-t border-border">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* Company Info */}
          <div>
            <h3 className="font-bold text-lg mb-4">KG Compponents</h3>
            <p className="text-white/80 text-sm">
              {t("footer.about_desc")}
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold mb-4">{t("footer.quick_links")}</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/shop" className="text-white/80 hover:text-white transition">
                  {t("common.shop")}
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-white/80 hover:text-white transition">
                  {t("common.about")}
                </Link>
              </li>
              <li>
                <Link href="/faq" className="text-white/80 hover:text-white transition">
                  {t("common.faq")}
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-white/80 hover:text-white transition">
                  {t("common.contact")}
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
                  {t("footer.terms_of_service")}
                </Link>
              </li>
              <li>
                <Link href="/returns" className="text-white/80 hover:text-white transition">
                  Returns & Refunds
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-white/80 hover:text-white transition">
                  {t("footer.privacy_policy")}
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
          <h4 className="font-semibold mb-3">{t("footer.newsletter")}</h4>
          <p className="text-white/80 text-sm mb-4">{t("footer.newsletter_desc")}</p>
          <NewsletterSignup />
        </div>

        <div className="border-t border-white/20 pt-8 text-center text-sm text-white/80">
          <p>&copy; 2025 KG Compponents. {t("footer.rights_reserved")}</p>
        </div>
      </div>
    </footer>
  )
}
