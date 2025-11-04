export type Language = "en" | "pt"

export const translations = {
  en: {
    common: {
      home: "Home",
      shop: "Shop",
      about: "About",
      contact: "Contact",
      faq: "FAQ",
      login: "Login",
      signup: "Sign Up",
      logout: "Logout",
      language: "Language",
      admin: "Admin",
    },
    checkout: {
      checkout: "Checkout",
      personalInfo: "Personal Information",
      shippingAddress: "Shipping Address",
      billingAddress: "Billing Address",
      paymentMethod: "Payment Method",
      orderSummary: "Order Summary",
      subtotal: "Subtotal",
      tax: "Tax (15%)",
      total: "Total",
      completeOrder: "Complete Order",
      processing: "Processing...",
      bankTransfer: "Bank Transfer (EFT)",
      cashOnDelivery: "Cash on Delivery",
      bankTransferInfo: "You will receive bank details via email after placing your order.",
      codInfo: "Pay the delivery driver when your order arrives.",
      secureCheckout: "Secure Checkout",
      orderInfo: "Your order information is encrypted and secure.",
    },
    orders: {
      orderConfirmation: "Order Confirmation",
      orderNumber: "Order Number",
      status: "Status",
      total: "Total",
      unpaid: "Unpaid",
      paid: "Paid",
      processing: "Processing",
      shipped: "Shipped",
      delivered: "Delivered",
      cancelled: "Cancelled",
    },
    auth: {
      login: "Login",
      signup: "Sign Up",
      email: "Email",
      password: "Password",
      firstName: "First Name",
      lastName: "Last Name",
      confirmPassword: "Confirm Password",
      createAccount: "Create Account",
      alreadyHaveAccount: "Already have an account?",
      dontHaveAccount: "Don't have an account?",
    },
  },
  pt: {
    common: {
      home: "Início",
      shop: "Loja",
      about: "Sobre",
      contact: "Contato",
      faq: "Perguntas Frequentes",
      login: "Entrar",
      signup: "Registrar",
      logout: "Sair",
      language: "Idioma",
      admin: "Admin",
    },
    checkout: {
      checkout: "Pagamento",
      personalInfo: "Informações Pessoais",
      shippingAddress: "Endereço de Entrega",
      billingAddress: "Endereço de Cobrança",
      paymentMethod: "Forma de Pagamento",
      orderSummary: "Resumo do Pedido",
      subtotal: "Subtotal",
      tax: "Impostos (15%)",
      total: "Total",
      completeOrder: "Completar Pedido",
      processing: "Processando...",
      bankTransfer: "Transferência Bancária (TED)",
      cashOnDelivery: "Pagamento na Entrega",
      bankTransferInfo: "Você receberá os detalhes bancários por e-mail após fazer o pedido.",
      codInfo: "Pague o motorista quando seu pedido chegar.",
      secureCheckout: "Pagamento Seguro",
      orderInfo: "As informações do seu pedido são criptografadas e seguras.",
    },
    orders: {
      orderConfirmation: "Confirmação de Pedido",
      orderNumber: "Número do Pedido",
      status: "Status",
      total: "Total",
      unpaid: "Não Pago",
      paid: "Pago",
      processing: "Processando",
      shipped: "Enviado",
      delivered: "Entregue",
      cancelled: "Cancelado",
    },
    auth: {
      login: "Entrar",
      signup: "Registrar",
      email: "E-mail",
      password: "Senha",
      firstName: "Primeiro Nome",
      lastName: "Sobrenome",
      confirmPassword: "Confirmar Senha",
      createAccount: "Criar Conta",
      alreadyHaveAccount: "Já tem uma conta?",
      dontHaveAccount: "Não tem uma conta?",
    },
  },
}

export function getTranslation(lang: Language, path: string, defaultValue = ""): string {
  const keys = path.split(".")
  let value: any = translations[lang]

  for (const key of keys) {
    if (value && typeof value === "object" && key in value) {
      value = value[key]
    } else {
      return defaultValue
    }
  }

  return typeof value === "string" ? value : defaultValue
}
