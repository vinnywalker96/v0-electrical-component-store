export default function Returns() {
  return (
    <div className="min-h-screen py-16 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-12">Returns & Refund Policy</h1>

        <div className="space-y-8">
          <section>
            <h2 className="text-2xl font-bold mb-4">Our Return Promise</h2>
            <p className="text-muted-foreground leading-relaxed">
              We stand behind every product we sell. If you're not completely satisfied with your purchase, we offer a
              hassle-free 30-day return policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">30-Day Return Window</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Items may be returned within 30 days of the date of delivery for a full refund or exchange. Returns must
              meet the following conditions:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>Items must be unused and in original packaging</li>
              <li>All original documentation and accessories must be included</li>
              <li>Items must not show signs of wear or damage</li>
              <li>Refunds are processed within 5-7 business days of item receipt</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">How to Return an Item</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">To initiate a return:</p>
            <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
              <li>Contact our support team with your order number</li>
              <li>Receive a return shipping label (prepaid)</li>
              <li>Package the item securely</li>
              <li>Ship the item using the provided label</li>
              <li>Receive confirmation once we process your return</li>
            </ol>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">Shipping Costs</h2>
            <p className="text-muted-foreground leading-relaxed">
              Return shipping is free for defective items or items damaged in transit. For change-of-mind returns,
              customers may be responsible for return shipping costs unless the order exceeds R1000.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">Defective or Damaged Items</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you receive a defective or damaged item, please contact us immediately with photos of the damage. We
              will replace or refund the item at no cost to you, including return shipping.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">Exclusions</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">The following items cannot be returned:</p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>Custom or made-to-order components</li>
              <li>Items opened or used</li>
              <li>Items missing original packaging</li>
              <li>Items returned after 30 days</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">Exchanges</h2>
            <p className="text-muted-foreground leading-relaxed">
              We happily exchange items for a different size, color, or model at no additional charge within 30 days of
              purchase.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">Questions?</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have any questions about our return policy, please contact our support team at
              info@electrohub.co.za or call +27 (0)11 555 0123.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
