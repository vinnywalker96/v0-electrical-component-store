"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"

const FAQS = [
  {
    question: "What types of electrical components do you stock?",
    answer:
      "We carry a wide range including resistors, capacitors, inductors, diodes, transistors, integrated circuits, wires, switches, relays, breadboards, circuit boards, and more. Check our Shop page for our complete inventory.",
  },
  {
    question: "Do you offer bulk discounts?",
    answer:
      "Yes! We offer tiered discounts for bulk orders. Please contact our sales team or check your cart for automatic volume discounts.",
  },
  {
    question: "What is your shipping policy?",
    answer:
      "We ship nationwide. Standard delivery takes 2-3 business days. Orders over R500 qualify for free shipping. Express delivery is also available.",
  },
  {
    question: "How do I know if a component is in stock?",
    answer:
      "All products on our website are in stock. The availability is updated in real-time. You can also add items to your cart to reserve them.",
  },
  {
    question: "What payment methods do you accept?",
    answer:
      "We accept all major credit cards, EFT transfers, and cash on delivery for eligible locations. All transactions are secure and encrypted.",
  },
  {
    question: "Can I return or exchange products?",
    answer:
      "Yes, we offer 30-day returns and exchanges for unused, unopened items. Please see our Returns & Refund Policy page for complete details.",
  },
  {
    question: "Do you provide technical support?",
    answer:
      "Our technical team is available to help with product selection, specifications, and troubleshooting. Contact us via email or phone.",
  },
  {
    question: "Can I get custom components or specific certifications?",
    answer:
      "Yes, we can source custom components and provide certified electronics for specific applications. Please contact our team with your requirements.",
  },
]

interface FAQItem {
  question: string
  answer: string
}

function FAQItem({ faq }: { faq: FAQItem }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-6 py-4 flex justify-between items-center hover:bg-muted transition"
      >
        <span className="font-semibold text-left">{faq.question}</span>
        <ChevronDown className={`w-5 h-5 text-primary transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="px-6 py-4 bg-muted text-muted-foreground border-t border-border">{faq.answer}</div>}
    </div>
  )
}

export default function FAQ() {
  return (
    <div className="min-h-screen">
      <section className="bg-primary text-white py-16 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Frequently Asked Questions</h1>
          <p className="text-lg text-white/90">Find answers to common questions about our products and services</p>
        </div>
      </section>

      <section className="py-16 px-4">
        <div className="max-w-3xl mx-auto space-y-4">
          {FAQS.map((faq, index) => (
            <FAQItem key={index} faq={faq} />
          ))}
        </div>
      </section>
    </div>
  )
}
