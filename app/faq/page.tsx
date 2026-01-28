"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"
import { useLanguage } from "@/lib/context/language-context"

interface FAQItem {
  question: string
  answer: string
}

function FAQItemComponent({ faq }: { faq: FAQItem }) {
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
  const { t } = useLanguage()

  const FAQS = [
    {
      question: t("faq.q1_question"),
      answer: t("faq.q1_answer"),
    },
    {
      question: t("faq.q2_question"),
      answer: t("faq.q2_answer"),
    },
    {
      question: t("faq.q3_question"),
      answer: t("faq.q3_answer"),
    },
    {
      question: t("faq.q4_question"),
      answer: t("faq.q4_answer"),
    },
    {
      question: t("faq.q5_question"),
      answer: t("faq.q5_answer"),
    },
    {
      question: t("faq.q6_question"),
      answer: t("faq.q6_answer"),
    },
    {
      question: t("faq.q7_question"),
      answer: t("faq.q7_answer"),
    },
    {
      question: t("faq.q8_question"),
      answer: t("faq.q8_answer"),
    },
  ]

  return (
    <div className="min-h-screen">
      <section className="bg-primary text-white py-16 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">{t("faq.title")}</h1>
          <p className="text-lg text-white/90">Find answers to common questions about our products and services</p>
        </div>
      </section>

      <section className="py-16 px-4">
        <div className="max-w-3xl mx-auto space-y-4">
          {FAQS.map((faq, index) => (
            <FAQItemComponent key={index} faq={faq} />
          ))}
        </div>
      </section>
    </div>
  )
}
