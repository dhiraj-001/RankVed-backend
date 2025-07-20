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
  },

  Education: {
    welcome: "Welcome to our Educational Assistant! I'm here to help you with admissions, academics, campus life, and more. How can I assist you today?",
    nodes: [
      {
        id: "start",
        type: "multiple-choice",
        question: "What would you like to know about?",
        options: [
          { text: "🎓 Admissions & Applications", nextId: "admissions_main" },
          { text: "📚 Academic Programs & Courses", nextId: "academics_main" },
          { text: "🏫 Campus Life & Services", nextId: "campus_main" },
          { text: "💰 Tuition & Financial Aid", nextId: "financial_main" },
          { text: "👥 Student Support Services", nextId: "support_main" },
          { text: "🌍 International Students", nextId: "international_main" },
          { text: "❓ Other Questions", nextId: "other_questions" }
        ]
      },
      {
        id: "admissions_main",
        type: "multiple-choice",
        question: "What admission information do you need?",
        options: [
          { text: "📋 Application Requirements", nextId: "admission_requirements" },
          { text: "📅 Deadlines & Important Dates", nextId: "admission_deadlines" },
          { text: "📝 Application Process", nextId: "application_process" },
          { text: "🔄 Transfer Credits", nextId: "transfer_credits" },
          { text: "📊 Admission Statistics", nextId: "admission_stats" },
          { text: "🏠 Early Decision/Action", nextId: "early_admission" },
          { text: "🔙 Back to Main Menu", nextId: "start" }
        ]
      },
      {
        id: "admission_deadlines",
        type: "statement",
        question: "📅 **Key Admission Deadlines:**\n\n• **Early Action:** November 1\n• **Regular Decision:** January 15\n• **FAFSA Priority Deadline:** February 1\n• **Enrollment Deposit Due:** May 1\n\nPlease note these are for Fall admissions. Spring deadlines may vary.",
        nextId: "contact-form"
      },
      {
        id: "application_process",
        type: "statement",
        question: "📝 **Our Application Process is simple:**\n\n1. Complete the Common Application online.\n2. Submit your high school transcripts.\n3. Send official SAT/ACT scores.\n4. Provide letters of recommendation.\n5. Pay the application fee or use a fee waiver.",
        nextId: "admissions_main"
      },
      {
        id: "transfer_credits",
        type: "statement",
        question: "🔄 We accept transfer credits from accredited institutions for courses with a grade of C or better. Our advisors will conduct a full evaluation upon acceptance. For an unofficial evaluation, please contact an admissions counselor.",
        nextId: "contact-form"
      },
      {
        id: "admission_stats",
        type: "statement",
        question: "📊 **Last Year's Freshman Profile:**\n\n• **Acceptance Rate:** 45%\n• **Average GPA:** 3.7\n• **Average SAT:** 1250\n• **Average ACT:** 28",
        nextId: "admissions_main"
      },
      {
        id: "early_admission",
        type: "statement",
        question: "🏠 Our Early Action plan is non-binding. Applying by November 1 means you'll receive an admission decision by late December, well before the regular decision applicants.",
        nextId: "admissions_main"
      },
      {
        id: "admission_requirements",
        type: "multiple-choice",
        question: "Which program level are you interested in?",
        options: [
          { text: "🎓 Undergraduate Requirements", nextId: "undergrad_requirements" },
          { text: "🎓 Graduate Requirements", nextId: "grad_requirements" },
          { text: "🔙 Back", nextId: "admissions_main" }
        ]
      },
      {
        id: "grad_requirements",
        type: "statement",
        question: "For graduate admission, you typically need:\n\n✅ A completed Bachelor's degree from an accredited institution.\n✅ Minimum GPA of 3.0.\n✅ GRE or GMAT scores (varies by program).\n✅ Statement of Purpose.\n✅ 2-3 Letters of Recommendation.",
        nextId: "admissions_main"
      },
      {
        id: "undergrad_requirements",
        type: "statement",
        question: "For undergraduate admission, you need:\n\n✅ Completed high school diploma or equivalent\n✅ Minimum GPA of 2.5 (3.0 preferred)\n✅ SAT (1100+) or ACT (24+) scores\n✅ Official transcripts from all schools\n✅ Personal statement/essay\n✅ 1-2 letters of recommendation",
        nextId: "specific_program_req"
      },
      {
        id: "specific_program_req",
        type: "multiple-choice",
        question: "Do you need requirements for specific programs?",
        options: [
          { text: "🔬 STEM Programs", nextId: "stem_requirements" },
          { text: "🎨 Arts & Humanities", nextId: "arts_requirements" },
          { text: "💼 Business Programs", nextId: "business_requirements" },
          { text: "📞 Speak to Admissions Counselor", nextId: "contact-form" },
          { text: "🔙 Back", nextId: "admission_requirements" }
        ]
      },
      {
        id: "arts_requirements",
        type: "statement",
        question: "🎨 **Arts & Humanities Requirements:**\nFor programs like Fine Arts, Music, or Theatre, a portfolio or audition is typically required in addition to standard application materials. Please check the specific department's page for details.",
        nextId: "specific_program_req"
      },
      {
        id: "business_requirements",
        type: "statement",
        question: "💼 **Business Program Requirements:**\nWe recommend a strong background in mathematics (4 years). While not required, coursework in economics or business is viewed favorably.",
        nextId: "specific_program_req"
      },
      {
        id: "stem_requirements",
        type: "statement",
        question: "STEM Program Requirements:\n\n🔬 **Engineering & Computer Science:**\n• Math: 4 years (including Calculus)\n• Science: 4 years (Physics & Chemistry required)\n• Minimum SAT Math: 650 or ACT Math: 28",
        nextId: "explore_stem_majors"
      },
      {
        id: "explore_stem_majors",
        type: "multiple-choice",
        question: "Which STEM area interests you most?",
        options: [
          { text: "💻 Computer Science & IT", nextId: "cs_majors" },
          { text: "⚙️ Engineering Programs", nextId: "engineering_majors" },
          { text: "📅 Schedule Campus Visit", nextId: "schedule_visit" },
          { text: "🔙 Back", nextId: "specific_program_req" }
        ]
      },
      {
        id: "cs_majors",
        type: "statement",
        question: "💻 Our popular CS & IT majors include B.S. in Computer Science, B.S. in Cybersecurity, and B.S. in Data Science. I can connect you with an advisor for more details.",
        nextId: "contact-form"
      },
      {
        id: "engineering_majors",
        type: "statement",
        question: "⚙️ We offer degrees in Mechanical, Electrical, Civil, and Biomedical Engineering. For curriculum details, I recommend speaking with an admissions counselor.",
        nextId: "contact-form"
      },
      {
        id: "academics_main",
        type: "multiple-choice",
        question: "What academic information do you need?",
        options: [
          { text: "📖 Degree Programs", nextId: "degree_programs" },
          { text: "📚 Course Catalog", nextId: "course_catalog" },
          { text: "👨‍🏫 Faculty Information", nextId: "faculty_info" },
          { text: "📜 Academic Calendar", nextId: "academic_calendar" },
          { text: "🔙 Back to Main Menu", nextId: "start" }
        ]
      },
      {
        id: "course_catalog",
        type: "statement",
        question: "You can view our complete, searchable course catalog at university.edu/coursecatalog. It has details on every course offered this semester.",
        nextId: "academics_main"
      },
      {
        id: "faculty_info",
        type: "statement",
        question: "Our faculty are experts in their fields. You can search our faculty directory by name or department at university.edu/faculty to see their research and publications.",
        nextId: "academics_main"
      },
      {
        id: "academic_calendar",
        type: "statement",
        question: "🗓️ **Key Academic Dates:**\n\n• **Fall Semester Begins:** August 26\n• **Fall Break:** October 14-15\n• **Final Exams:** December 16-20\n• **Spring Semester Begins:** January 21\n• **Spring Break:** March 10-14",
        nextId: "academics_main"
      },
      {
        id: "degree_programs",
        type: "multiple-choice",
        question: "Which academic college interests you?",
        options: [
          { text: "🔬 College of Sciences", nextId: "sciences_programs" },
          { text: "💼 Business School", nextId: "business_programs" },
          { text: "⚙️ Engineering College", nextId: "engineering_programs" },
          { text: "🔙 Back", nextId: "academics_main" }
        ]
      },
      {
        id: "sciences_programs",
        type: "statement",
        question: "🔬 The College of Sciences offers degrees in Biology, Chemistry, Physics, Environmental Science, and more. Would you like to speak to an advisor?",
        nextId: "contact-form"
      },
      {
        id: "business_programs",
        type: "statement",
        question: "💼 Our Business School offers majors in Finance, Marketing, Management, and Accounting. I can connect you with an advisor for details.",
        nextId: "contact-form"
      },
      {
        id: "engineering_programs",
        type: "statement",
        question: "⚙️ We offer degrees in Mechanical, Electrical, Civil, and Biomedical Engineering. I recommend speaking with an admissions counselor for curriculum information.",
        nextId: "contact-form"
      },
      {
        id: "campus_main",
        type: "multiple-choice",
        question: "What would you like to know about campus life?",
        options: [
          { text: "🏠 Housing & Residence Life", nextId: "housing_main" },
          { text: "🍽️ Dining Services", nextId: "dining_services" },
          { text: "🎭 Student Organizations", nextId: "student_orgs" },
          { text: "🛡️ Campus Safety", nextId: "campus_safety" },
          { text: "🔙 Back to Main Menu", nextId: "start" }
        ]
      },
      {
        id: "dining_services",
        type: "statement",
        question: "🍽️ We have 3 main dining halls and 10+ cafes and grab-and-go spots on campus. We offer various meal plans to suit your needs, including options for students with dietary restrictions.",
        nextId: "campus_main"
      },
      {
        id: "student_orgs",
        type: "statement",
        question: "🎭 We have over 200 student clubs and organizations! From academic societies to sports clubs and cultural groups, there's something for everyone. You can explore the full list at university.edu/studentlife.",
        nextId: "campus_main"
      },
      {
        id: "campus_safety",
        type: "statement",
        question: "🛡️ Your safety is our top priority. Our campus is monitored 24/7 by Campus Police. We also have emergency blue light phones throughout campus and a safe-ride service available at night.",
        nextId: "campus_main"
      },
      {
        id: "housing_main",
        type: "multiple-choice",
        question: "What housing information do you need?",
        options: [
          { text: "🏠 Residence Hall Options", nextId: "residence_halls" },
          { text: "💰 Housing Costs", nextId: "housing_costs" },
          { text: "📝 Housing Application", nextId: "housing_application" },
          { text: "🔙 Back", nextId: "campus_main" }
        ]
      },
      {
        id: "housing_costs",
        type: "statement",
        question: "💰 A standard double room costs approximately $3,200 per semester. A required meal plan costs around $2,500 per semester. Prices vary for suite-style or single rooms.",
        nextId: "housing_main"
      },
      {
        id: "housing_application",
        type: "statement",
        question: "📝 You can apply for housing through the student portal after you have been accepted and paid your enrollment deposit. The housing application deadline is June 1.",
        nextId: "housing_main"
      },
      {
        id: "residence_halls",
        type: "statement",
        question: "Our Residence Halls offer:\n\n🏠 **Traditional Halls:** Double occupancy rooms with community bathrooms ($3,200/semester).\n🌟 **Premium Halls:** Suite-style living with semi-private bathrooms ($4,100/semester).\n\nAll halls include a required meal plan. Would you like to take a virtual tour?",
        nextId: "housing_next_steps"
      },
      {
        id: "housing_next_steps",
        type: "multiple-choice",
        question: "What would you like to do next?",
        options: [
          { text: "🎥 Take Virtual Tour", nextId: "virtual_tour" },
          { text: "📅 Schedule In-Person Visit", nextId: "schedule_visit" },
          { text: "💰 View All Housing Costs", nextId: "housing_costs" },
          { text: "📝 Start Housing Application", nextId: "housing_application" },
          { text: "🔙 Back", nextId: "housing_main" }
        ]
      },
      {
        id: "virtual_tour",
        type: "statement",
        question: "🎥 You can take a 360-degree virtual tour of our residence halls and the entire campus at university.edu/virtualtour. It's a great way to see everything from home!",
        nextId: "housing_next_steps"
      },
      {
        id: "financial_main",
        type: "multiple-choice",
        question: "What financial information do you need?",
        options: [
          { text: "💰 Tuition & Fees", nextId: "tuition_fees" },
          { text: "🏆 Scholarships", nextId: "scholarships" },
          { text: "📊 Net Price Calculator", nextId: "net_price_calc" },
          { text: "📄 FAFSA Information", nextId: "fafsa_info" },
          { text: "🔙 Back to Main Menu", nextId: "start" }
        ]
      },
      {
        id: "scholarships",
        type: "statement",
        question: "🏆 We offer a wide range of merit-based and need-based scholarships. All applicants are automatically considered for merit scholarships. To apply for need-based aid, you must complete the FAFSA.",
        nextId: "financial_main"
      },
      {
        id: "net_price_calc",
        type: "statement",
        question: "📊 You can get a personalized estimate of your costs and potential financial aid using our Net Price Calculator here: university.edu/calculator",
        nextId: "financial_main"
      },
      {
        id: "fafsa_info",
        type: "statement",
        question: "📄 The Free Application for Federal Student Aid (FAFSA) is required for all federal and most institutional aid. Our school code is 001234. The priority deadline is February 1.",
        nextId: "financial_main"
      },
      {
        id: "tuition_fees",
        type: "multiple-choice",
        question: "Which tuition information do you need?",
        options: [
          { text: "🏠 In-State Tuition", nextId: "instate_tuition" },
          { text: "🌍 Out-of-State Tuition", nextId: "outstate_tuition" },
          { text: "🌏 International Student Fees", nextId: "international_fees" },
          { text: "🔙 Back", nextId: "financial_main" }
        ]
      },
      {
        id: "outstate_tuition",
        type: "statement",
        question: "**2024-2025 Out-of-State Costs:**\n\n💰 **Undergraduate (per year):**\n• Tuition: $28,500\n• Fees: $1,850\n• Room & Board: $11,200\n• **Total: $41,550**",
        nextId: "explore_financial_aid"
      },
      {
        id: "international_fees",
        type: "statement",
        question: "**2024-2025 International Costs:**\n\n💰 **Undergraduate (per year):**\n• Tuition: $30,000\n• Fees & Insurance: $3,500\n• Room & Board: $11,200\n• **Total: $44,700**",
        nextId: "explore_financial_aid"
      },
      {
        id: "instate_tuition",
        type: "statement",
        question: "**2024-2025 In-State Costs:**\n\n💰 **Undergraduate (per year):**\n• Tuition: $12,450\n• Fees: $1,850\n• Room & Board: $11,200\n• **Total: $26,700**\n\n💡 85% of our students receive financial aid!",
        nextId: "explore_financial_aid"
      },
      {
        id: "explore_financial_aid",
        type: "multiple-choice",
        question: "Which financial aid options interest you?",
        options: [
          { text: "🏆 Scholarships", nextId: "scholarships" },
          { text: "📊 Calculate Your Aid", nextId: "net_price_calc" },
          { text: "📝 Apply for FAFSA", nextId: "fafsa_info" },
          { text: "📞 Speak to Financial Aid", nextId: "contact-form" },
          { text: "🔙 Back", nextId: "tuition_fees" }
        ]
      },
      {
        id: "support_main",
        type: "statement",
        question: "We offer extensive student support, including academic tutoring, career services, health & wellness, and counseling. Please visit university.edu/support for a full list of services.",
        nextId: "start"
      },
      {
        id: "international_main",
        type: "statement",
        question: "We welcome students from all over the world! Our International Student Office can help with visas, English language support, and orientation. Please visit university.edu/international for more info.",
        nextId: "start"
      },
      {
        id: "other_questions",
        type: "open-ended",
        question: "Please type your specific question, and I'll do my best to help you!",
        aiHandling: true,
        nextId: "ai_response_followup"
      },
      {
        id: "ai_response_followup",
        type: "multiple-choice",
        question: "Was that helpful? What else can I assist you with?",
        options: [
          { text: "❓ Ask Another Question", nextId: "other_questions" },
          { text: "📞 Speak to a Human Advisor", nextId: "human_contact" },
          { text: "🔙 Return to Main Menu", nextId: "start" }
        ]
      },
      {
        id: "contact_admissions",
        type: "statement",
        question: "**Connect with Admissions:**\n\n📞 **Phone:** (555) 123-4567\n📧 **Email:** admissions@university.edu\n📅 **Schedule a Call:** university.edu/meet",
        nextId: "contact-form"
      },
      {
        id: "contact_financial_aid",
        type: "statement",
        question: "**Connect with Financial Aid:**\n\n📞 **Phone:** (555) 123-5000\n📧 **Email:** finaid@university.edu",
        nextId: "contact-form"
      },
      {
        id: "schedule_visit",
        type: "statement",
        question: "We'd love to show you around! You can see all available tour dates and register for a campus visit at university.edu/visit.",
        nextId: "contact-form"
      },
      {
        id: "human_contact",
        type: "multiple-choice",
        question: "Who would you like to speak with?",
        options: [
          { text: "🎓 Admissions Counselor", nextId: "contact-form" },
          { text: "💰 Financial Aid Advisor", nextId: "contact-form" },
          { text: "🔙 Back", nextId: "start" }
        ]
      },
      {
        id: "contact_followup",
        type: "multiple-choice",
        question: "Is there anything else I can help you with today?",
        options: [
          { text: "🔙 Return to Main Menu", nextId: "start" },
          { text: "✅ That's All - Thank You!", nextId: "end" }
        ]
      },
      {
        id: "end",
        type: "statement",
        question: "Thank you for your interest in our university! We're here to help you succeed. Feel free to return anytime with more questions. Good luck! 🌟"
      }
    ]
  }
};

export function getDefaultQuestionFlow(businessType: string) {
  return SAMPLE_QUESTION_FLOWS[businessType as keyof typeof SAMPLE_QUESTION_FLOWS] || SAMPLE_QUESTION_FLOWS.general;
}