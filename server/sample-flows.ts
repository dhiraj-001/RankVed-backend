// Sample question flows for different business types
export const SAMPLE_QUESTION_FLOWS = {
  healthcare: {
    welcome: "Hello! I'm here to help you with your healthcare needs. How can I assist you today?",
    nodes: [
      {
        id: "start",
        type: "multiple-choice",
        question: "What brings you here today?",
        options: [
          { text: "Book an appointment", nextId: "booking" },
          { text: "Medical information", nextId: "medical-info" },
          { text: "Insurance questions", nextId: "insurance" },
          { text: "Emergency", nextId: "emergency" }
        ]
      },
      {
        id: "booking",
        type: "multiple-choice",
        question: "What type of appointment would you like to schedule?",
        options: [
          { text: "General consultation", nextId: "contact-form" },
          { text: "Specialist visit", nextId: "specialist" },
          { text: "Follow-up appointment", nextId: "contact-form" }
        ]
      },
      {
        id: "specialist",
        type: "multiple-choice",
        question: "Which specialist would you like to see?",
        options: [
          { text: "Cardiologist", nextId: "contact-form" },
          { text: "Neurologist", nextId: "contact-form" },
          { text: "Dermatologist", nextId: "contact-form" },
          { text: "Other specialist", nextId: "contact-form" }
        ]
      },
      {
        id: "medical-info",
        type: "open-ended",
        question: "What medical information are you looking for? I can help answer questions about symptoms, treatments, or general health advice.",
        aiHandling: true,
        nextId: "contact-form"
      },
      {
        id: "insurance",
        type: "statement",
        question: "I can help you with insurance questions. We accept most major insurance plans including Medicare, Medicaid, and private insurance.",
        nextId: "contact-form"
      },
      {
        id: "emergency",
        type: "statement",
        question: "If this is a medical emergency, please call 911 immediately or go to your nearest emergency room. For urgent but non-emergency care, please call our hotline.",
        nextId: "end"
      },
      {
        id: "contact-form",
        type: "contact-form",
        question: "To better assist you, may I have your contact information?"
      }
    ]
  },

  ecommerce: {
    welcome: "Welcome! I'm here to help you find what you're looking for. How can I assist you today?",
    nodes: [
      {
        id: "start",
        type: "multiple-choice",
        question: "What can I help you with?",
        options: [
          { text: "Product recommendations", nextId: "products" },
          { text: "Order tracking", nextId: "order-tracking" },
          { text: "Returns & refunds", nextId: "returns" },
          { text: "Technical support", nextId: "tech-support" }
        ]
      },
      {
        id: "products",
        type: "open-ended",
        question: "What type of product are you looking for? I can help you find the perfect item and provide recommendations based on your needs.",
        aiHandling: true,
        nextId: "contact-form"
      },
      {
        id: "order-tracking",
        type: "statement",
        question: "I can help you track your order. Please have your order number ready, and I'll get you the latest updates on your shipment.",
        nextId: "contact-form"
      },
      {
        id: "returns",
        type: "multiple-choice",
        question: "What would you like to know about returns?",
        options: [
          { text: "Return policy", nextId: "return-policy" },
          { text: "Start a return", nextId: "contact-form" },
          { text: "Refund status", nextId: "contact-form" }
        ]
      },
      {
        id: "return-policy",
        type: "statement",
        question: "We offer a 30-day return policy for most items. Items must be in original condition with tags attached. Free returns are available for defective items.",
        nextId: "contact-form"
      },
      {
        id: "tech-support",
        type: "open-ended",
        question: "What technical issue are you experiencing? I can help troubleshoot problems with your order, account, or product setup.",
        aiHandling: true,
        nextId: "contact-form"
      },
      {
        id: "contact-form",
        type: "contact-form",
        question: "To provide personalized assistance, may I have your contact details?"
      }
    ]
  },

  realestate: {
    welcome: "Hello! I'm here to help you with your real estate needs. Whether you're buying, selling, or renting, I'm here to assist.",
    nodes: [
      {
        id: "start",
        type: "multiple-choice",
        question: "What brings you here today?",
        options: [
          { text: "Looking to buy", nextId: "buying" },
          { text: "Want to sell", nextId: "selling" },
          { text: "Rental inquiries", nextId: "rental" },
          { text: "Market information", nextId: "market-info" }
        ]
      },
      {
        id: "buying",
        type: "multiple-choice",
        question: "What type of property are you looking for?",
        options: [
          { text: "Single family home", nextId: "buying-details" },
          { text: "Condo/Apartment", nextId: "buying-details" },
          { text: "Commercial property", nextId: "buying-details" },
          { text: "Land/Lots", nextId: "buying-details" }
        ]
      },
      {
        id: "buying-details",
        type: "open-ended",
        question: "Great! Tell me more about what you're looking for - preferred location, budget range, number of bedrooms, or any specific features you need.",
        aiHandling: true,
        nextId: "contact-form"
      },
      {
        id: "selling",
        type: "open-ended",
        question: "I'd love to help you sell your property! Can you tell me about your property - location, type, size, and your timeline for selling?",
        aiHandling: true,
        nextId: "contact-form"
      },
      {
        id: "rental",
        type: "multiple-choice",
        question: "Are you looking to rent or list a rental property?",
        options: [
          { text: "Looking to rent", nextId: "renting" },
          { text: "List my property for rent", nextId: "listing-rental" }
        ]
      },
      {
        id: "renting",
        type: "open-ended",
        question: "What type of rental are you looking for? Please share your preferred area, budget, move-in date, and any specific requirements.",
        aiHandling: true,
        nextId: "contact-form"
      },
      {
        id: "listing-rental",
        type: "open-ended",
        question: "I can help you list your property for rent. Tell me about your property - location, type, size, and your target rental price.",
        aiHandling: true,
        nextId: "contact-form"
      },
      {
        id: "market-info",
        type: "open-ended",
        question: "What market information are you looking for? I can provide insights on property values, market trends, neighborhood data, or investment opportunities.",
        aiHandling: true,
        nextId: "contact-form"
      },
      {
        id: "contact-form",
        type: "contact-form",
        question: "To provide you with personalized property recommendations and market insights, may I have your contact information?"
      }
    ]
  },

  general: {
    welcome: "Hello! How can I help you today?",
    nodes: [
      {
        id: "start",
        type: "multiple-choice",
        question: "What can I assist you with?",
        options: [
          { text: "General information", nextId: "general-info" },
          { text: "Support request", nextId: "support" },
          { text: "Contact someone", nextId: "contact-form" },
          { text: "Other questions", nextId: "other" }
        ]
      },
      {
        id: "general-info",
        type: "open-ended",
        question: "What information are you looking for? I'm here to help answer your questions.",
        aiHandling: true,
        nextId: "contact-form"
      },
      {
        id: "support",
        type: "open-ended",
        question: "What kind of support do you need? Please describe your issue or question, and I'll do my best to help.",
        aiHandling: true,
        nextId: "contact-form"
      },
      {
        id: "other",
        type: "open-ended",
        question: "Please tell me what you'd like to know or how I can help you today.",
        aiHandling: true,
        nextId: "contact-form"
      },
      {
        id: "contact-form",
        type: "contact-form",
        question: "To better assist you, may I have your contact information?"
      }
    ]
  }
};

export function getDefaultQuestionFlow(businessType: string) {
  return SAMPLE_QUESTION_FLOWS[businessType as keyof typeof SAMPLE_QUESTION_FLOWS] || SAMPLE_QUESTION_FLOWS.general;
}