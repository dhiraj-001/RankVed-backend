// export const intentTags = [
//   "greeting",
//   "goodbye",
//   "thanks",
//   "smalltalk",
//   "faq",
//   "hours",
//   "location",
//   "contact",
//   "product_details",
//   "product_price",
//   "product_availability",
//   "order_place",
//   "order_status",
//   "order_cancel",
//   "order_modify",
//   "payment_methods",
//   "payment_issue",
//   "refund_policy",
//   "refund_request",
//   "return_item",
//   "help_request",
//   "technical_issue",
//   "account_create",
//   "account_login",
//   "account_update",
//   "password_reset",
//   "shipping_info",
//   "shipping_cost",
//   "delivery_time",
//   "tracking",
//   "appointment_book",
//   "appointment_cancel",
//   "appointment_reschedule",
//   "feedback_positive",
//   "feedback_negative",
//   "escalate_human",
//   "fallback"
// ];

// export const followUpOptions = {
//   greeting: [
//     "View Courses",
//     "Tuition & Fees",
//     "Scholarship Info",
//     "Campus Services"
//   ],
//   course_inquiry: [
//     "Undergraduate Programs",
//     "Graduate Programs",
//     "Short Courses",
//     "Professional Certifications"
//   ],
//   admission_process: [
//     "Application Deadlines",
//     "Eligibility Criteria",
//     "Required Documents",
//     "How to Apply"
//   ],
//   tuition_fees: [
//     "Domestic Tuition",
//     "International Tuition",
//     "Payment Plans",
//     "Financial Aid"
//   ],
//   scholarships: [
//     "Merit-Based",
//     "Need-Based",
//     "External Scholarships",
//     "Application Process"
//   ],
//   class_schedule: [
//     "Semester Start Dates",
//     "Weekly Timetable",
//     "Exam Calendar",
//     "Holiday Schedule"
//   ],
//   technical_support: [
//     "Login Issues",
//     "Video Access",
//     "Assignment Upload",
//     "Other Issues"
//   ],
//   assignment_deadline: [
//     "Upcoming Deadlines",
//     "Submit Assignment",
//     "Extension Requests",
//     "Grading Timeline"
//   ],
//   grading_policy: [
//     "Grading Scale",
//     "Pass/Fail Criteria",
//     "Regrade Requests",
//     "GPA Calculation"
//   ],
//   campus_tour: [
//     "Book a Tour",
//     "Virtual Tour",
//     "Open Day Dates",
//     "Visitor Information"
//   ],
//   library_hours: [
//     "Today’s Hours",
//     "Weekend Hours",
//     "Holiday Hours",
//     "Reserve a Study Room"
//   ],
//   faculty_contact: [
//     "List of Instructors",
//     "Department Emails",
//     "Office Hours",
//     "Schedule Meeting"
//   ],
//   course_materials: [
//     "Download Syllabus",
//     "Lecture Slides",
//     "Supplemental Readings",
//     "Library Resources"
//   ]
// };


// export const data = `Course Title: Introduction to Computer Science  
// Instructor: Dr. Aditi Rao  
// Duration: 12 weeks  
// Start Date: 2025-08-01  
// Schedule: Mon/Wed/Fri 10:00–11:30 AM  
// Price: ₹15,000  

// Course Title: Data Structures and Algorithms  
// Instructor: Prof. Vikram Singh  
// Duration: 14 weeks  
// Start Date: 2025-09-15  
// Schedule: Tue/Thu 2:00–4:00 PM  
// Price: ₹18,500  

// Course Title: Web Development Bootcamp  
// Instructor: Ms. Neha Patel  
// Duration: 8 weeks  
// Start Date: 2025-08-20  
// Schedule: Sat/Sun 9:00 AM–1:00 PM  
// Price: ₹12,000  

// Course Title: Machine Learning Fundamentals  
// Instructor: Dr. Sameer Kulkarni  
// Duration: 10 weeks  
// Start Date: 2025-10-05  
// Schedule: Mon/Wed 3:00–5:00 PM  
// Price: ₹20,000  

// Scholarship: Merit-Based Excellence  
// Eligibility: GPA ≥ 3.7  
// Amount: 50% tuition waiver  
// Application Deadline: 2025-07-31  

// Scholarship: Need-Based Support  
// Eligibility: Family income ≤ ₹500,000/year  
// Amount: Up to ₹10,000 per semester  
// Application Deadline: 2025-08-15  

// Program: Bachelor of Science in Computer Science  
// Duration: 4 years  
// Total Credits: 120  
// Tuition per Year: ₹60,000  

// Program: Master of Business Administration  
// Duration: 2 years  
// Total Credits: 60  
// Tuition per Year: ₹75,000  

// Admission Deadline: Undergraduate Fall 2025 – 2025-08-01  
// Admission Deadline: Graduate Spring 2026 – 2025-11-30  

// Library Hours: Mon–Fri 8:00 AM–10:00 PM; Sat–Sun 9:00 AM–6:00 PM  
// Campus Tour Times: Weekdays 10:00 AM, 2:00 PM; Weekends 11:00 AM  

// Support Contact: helpdesk@eduexpress.com | +91 22 1234 5678  
// Technical Support Hours: 24/7 via chat; Phone support Mon–Fri 9:00 AM–6:00 PM  

// Assignment Deadline: “Data Structures and Algorithms” – 2025-10-01 11:59 PM  
// Assignment Deadline: “Machine Learning Fundamentals” – 2025-11-15 11:59 PM  

// Event: Career Fair 2025  
// Date: 2025-09-10  
// Location: Main Auditorium  

// Event: Guest Lecture – AI Ethics  
// Date: 2025-10-22  
// Speaker: Dr. Ananya Sharma  
// Location: Room 204  

// Student: Rajeev Sharma | Program: BSc CS | Year: 2 | Email: rajeev.sharma@example.com  
// Student: Pooja Mehta | Program: MBA | Year: 1 | Email: pooja.mehta@example.com  

// Department: Computer Science | Faculty Count: 15 | Building: Tech Block  
// Department: Business Administration | Faculty Count: 12 | Building: Commerce Block  

// Announcement: “Campus closed on 2025-08-15 for Independence Day.”  
// Announcement: “New cafeteria menu launched from 2025-08-01.”`


// Assuming these are globally available or passed as arguments
// These structures align with the pseudo-code's TrainingDataItem and FollowUpOption
export interface FollowUpOption {
  option_text: string;
  associated_intent_id?: string; // What intent this option leads to
  response_text_override?: string; // Optional: If selecting this option gives a pre-defined response
  cta_button_text?: string;
  cta_button_link?: string;
  collect_contact_info?: boolean; // True if selecting this option should prompt for contact info
  // You might also want to add a unique ID for the option itself if needed for tracking
  // id: string;
}

export interface TrainingDataItem {
  intent_id: string; // Unique ID for the intent this data trains
  nlp_training_phrases: string[]; // Phrases to train the NLP on (for your local data, not directly used by current Gemini prompt)
  default_response_text: string; // The main response text for this intent
  follow_up_options: FollowUpOption[]; // Optional: direct follow-up options for this data
  cta_button_text?: string;
  cta_button_link?: string;
  // Add other fields as needed, e.g., entities to extract
}

// Global Configuration for default messages/CTAs (from pseudo-code)
export interface GlobalConfig {
  default_no_context_message: string;
  default_unrecognized_intent_message: string;
  default_cta_text: string;
  default_cta_link: string;
  pre_defined_contact_questions: string[];
  contact_info_collection_success_message: string;
  // Add more as needed
}

// Example of how your data might look (this would replace your current `followUpOptions` and `intentTags`)
// In a real system, this would be loaded from a database or config file.
export const trainingData = [
  // --- General Information ---
  {
    intent_id: "general_greeting",
    nlp_training_phrases: ["hi", "hello", "hey there", "good morning", "greetings", "whats up"],
    default_response_text: "Hello! Welcome to EduExpress University, your premier destination for higher education. How can I assist you today?",
    follow_up_options: [
      { option_text: "Admission Information", associated_intent_id: "admission_info" },
      { option_text: "Academic Programs", associated_intent_id: "courses_offered" },
      { option_text: "Student Life", associated_intent_id: "campus_life" },
      { option_text: "Contact Support", associated_intent_id: "connect_to_human" } // This leads to WhatsApp/email
    ],
    cta_button_text: "Explore EduExpress",
    cta_button_link: "https://www.eduexpress.edu/"
  },
  {
    intent_id: "about_university",
    nlp_training_phrases: ["tell me about eduexpress", "what is eduexpress", "history of university", "when was it founded", "university background"],
    default_response_text: "EduExpress University, established in 1995, is a leading institution renowned for its innovative research, diverse community, and commitment to student success. We're consistently ranked among the top universities for engineering and arts.",
    follow_up_options: [
      { option_text: "Our Mission & Vision", associated_intent_id: "mission_vision" },
      { option_text: "University Leadership", associated_intent_id: "leadership_info" },
      { option_text: "University Rankings", associated_intent_id: "university_rankings" }
    ],
    cta_button_text: "Read More About Us",
    cta_button_link: "https://www.eduexpress.edu/about"
  },
  {
    intent_id: "mission_vision",
    nlp_training_phrases: ["what's your mission", "university vision", "core values"],
    default_response_text: "Our mission is to foster a transformative learning environment, conduct groundbreaking research, and serve society with integrity and impact. Our vision is to be a globally recognized leader in higher education and innovation.",
    follow_up_options: [], // End of flow, offer WhatsApp
    cta_button_text: "Chat on WhatsApp",
    cta_button_link: "https://wa.me/+919876543210?text=Hello%20EduExpress%2C%20I%20have%20a%20question%20about%20your%20mission."
  },
  {
    intent_id: "leadership_info",
    nlp_training_phrases: ["who is the president", "dean of faculties", "board of governors"],
    default_response_text: "Our University President is Dr. Anya Sharma. You can find a complete list of our leadership team and their profiles on our official website.",
    follow_up_options: [], // End of flow, offer WhatsApp
    cta_button_text: "Chat on WhatsApp",
    cta_button_link: "https://wa.me/+919876543210?text=Hello%20EduExpress%2C%20I%20have%20a%20question%20about%20university%20leadership."
  },
  {
    intent_id: "university_rankings",
    nlp_training_phrases: ["how is eduexpress ranked", "university ratings", "are you a good university"],
    default_response_text: "EduExpress consistently ranks among the top 10 universities nationally for Engineering and Arts programs, and within the top 50 globally for research output. We are proud of our academic standing!",
    follow_up_options: [
      { option_text: "Explore our Strengths", cta_button_text: "Accolades & Achievements", cta_button_link: "https://www.eduexpress.edu/achievements" }
    ],
    cta_button_text: "Chat on WhatsApp",
    cta_button_link: "https://wa.me/+919876543210?text=Hello%20EduExpress%2C%20I%20have%20a%20question%20about%20university%20rankings."
  },
  {
    intent_id: "contact_general",
    nlp_training_phrases: ["contact number", "email address", "where are you located", "get in touch", "how to reach you"],
    default_response_text: "You can reach our main office at info@eduexpress.edu or call us at +91 98765 43210. Our main campus is located at 123 University Ave, Dispur, Guwahati, Assam, India. Pin: 781006.",
    follow_up_options: [
      { option_text: "Visit Contact Page", cta_button_text: "Contact Us", cta_button_link: "https://www.eduexpress.edu/contact" }
    ],
    // Primary CTA is already WhatsApp here, so no need for an additional one
    cta_button_text: "Chat on WhatsApp",
    cta_button_link: "https://wa.me/+919876543210?text=Hello%20EduExpress%2C%20I%20need%20general%20assistance."
  },

  // --- Admissions Information ---
  {
    intent_id: "admission_info",
    nlp_training_phrases: ["how to apply", "admission process", "eligibility criteria", "application requirements", "enrollment info"],
    default_response_text: "Our admission process is designed to be clear and supportive. What specifically would you like to know about applying to EduExpress?",
    follow_up_options: [
      { option_text: "Eligibility Criteria", associated_intent_id: "eligibility_criteria" },
      { option_text: "Application Deadlines", associated_intent_id: "application_deadlines" },
      { option_text: "Application Steps", associated_intent_id: "application_steps" },
      { option_text: "Contact Admissions Office", cta_button_text: "Email Admissions", cta_button_link: "mailto:admissions@eduexpress.edu", collect_contact_info: true }
    ],
    cta_button_text: "Visit Admissions Page",
    cta_button_link: "https://www.eduexpress.edu/admissions"
  },
  {
    intent_id: "eligibility_criteria",
    nlp_training_phrases: ["what are the requirements", "minimum grades", "admission requirements", "prerequisites"],
    default_response_text: "Eligibility varies by program level. Are you interested in undergraduate or graduate program eligibility?",
    follow_up_options: [
      { option_text: "Undergraduate Eligibility", associated_intent_id: "undergrad_eligibility" },
      { option_text: "Graduate Eligibility", associated_intent_id: "grad_eligibility" },
      { option_text: "General Requirements", associated_intent_id: "general_requirements" }
    ],
    cta_button_text: "Chat on WhatsApp",
    cta_button_link: "https://wa.me/+919876543210?text=Hello%20EduExpress%2C%20I%20have%20a%20question%20about%20eligibility%20criteria."
  },
  {
    intent_id: "undergrad_eligibility",
    nlp_training_phrases: ["undergrad requirements", "bachelor degree eligibility", "first-year student requirements", "12th pass requirements"],
    default_response_text: "For undergraduate programs, typical requirements include a high school diploma or equivalent, a minimum GPA of 3.0 (or equivalent percentage), and submission of standardized test scores (optional for some programs). Specific prerequisites may apply to certain majors like Engineering or Medical fields.",
    follow_up_options: [
      { option_text: "Specific Program Requirements", associated_intent_id: "specific_undergrad_program" },
      { option_text: "Scholarship Information", associated_intent_id: "scholarship_info" }
    ],
    cta_button_text: "Chat on WhatsApp",
    cta_button_link: "https://wa.me/+919876543210?text=Hello%20EduExpress%2C%20I%20have%20a%20question%20about%20undergraduate%20eligibility."
  },
  {
    intent_id: "grad_eligibility",
    nlp_training_phrases: ["graduate requirements", "masters phd eligibility", "postgraduate entry criteria", "what do I need for a master's"],
    default_response_text: "Graduate program eligibility typically requires a relevant bachelor's degree from an accredited institution, a strong academic record (e.g., GPA 3.5+), letters of recommendation, and in some cases, specific standardized test scores (e.g., GRE/GMAT/TOEFL/IELTS).",
    follow_up_options: [
      { option_text: "Specific Graduate Program Requirements", associated_intent_id: "specific_grad_program" },
      { option_text: "Application Fee Information", associated_intent_id: "application_fee_info" }
    ],
    cta_button_text: "Chat on WhatsApp",
    cta_button_link: "https://wa.me/+919876543210?text=Hello%20EduExpress%2C%20I%20have%20a%20question%20about%20graduate%20eligibility."
  },
  {
    intent_id: "general_requirements",
    nlp_training_phrases: ["general requirements", "basic eligibility", "overall requirements", "common admission criteria"],
    default_response_text: "Generally, all applicants need to submit official academic transcripts, a completed application form, and any program-specific essays or portfolios. Always check the specific requirements for your chosen program.",
    follow_up_options: [
      { option_text: "Undergraduate Eligibility", associated_intent_id: "undergrad_eligibility" },
      { option_text: "Graduate Eligibility", associated_intent_id: "grad_eligibility" }
    ],
    cta_button_text: "Chat on WhatsApp",
    cta_button_link: "https://wa.me/+919876543210?text=Hello%20EduExpress%2C%20I%20have%20a%20question%20about%20general%20requirements."
  },
  {
    intent_id: "specific_undergrad_program",
    nlp_training_phrases: ["what about engineering undergrad", "nursing bachelor requirements", "B.Tech eligibility"],
    default_response_text: "To provide accurate information, please specify the exact undergraduate program you are interested in (e.g., B.Tech in Computer Science, B.A. in English Literature). You can also view our program catalog online.",
    follow_up_options: [
      { option_text: "View Program Catalog", cta_button_text: "Program Catalog", cta_button_link: "https://www.eduexpress.edu/program-catalog" },
      { option_text: "Speak to an Admissions Advisor", associated_intent_id: "connect_to_human" }
    ],
    cta_button_text: "Chat on WhatsApp",
    cta_button_link: "https://wa.me/+919876543210?text=Hello%20EduExpress%2C%20I%20have%20a%20question%20about%20specific%20undergrad%20programs."
  },
  {
    intent_id: "specific_grad_program",
    nlp_training_phrases: ["mba requirements", "phd in computer science eligibility", "M.Tech details"],
    default_response_text: "Specific requirements vary greatly by graduate program. For detailed information, please fill out our inquiry form so an admissions counselor can assist you personally.",
    follow_up_options: [
      { option_text: "Fill out Inquiry Form", cta_button_text: "Graduate Inquiry Form", cta_button_link: "https://www.eduexpress.edu/graduate-inquiry", collect_contact_info: true }
    ],
    cta_button_text: "Chat on WhatsApp",
    cta_button_link: "https://wa.me/+919876543210?text=Hello%20EduExpress%2C%20I%20have%20a%20question%20about%20specific%20graduate%20programs."
  },
  {
    intent_id: "application_deadlines",
    nlp_training_phrases: ["when to apply", "application dates", "deadlines", "important dates for admissions"],
    default_response_text: "Application deadlines vary by program and admission cycle. For undergraduate admissions, the regular decision deadline is typically January 15th, and for graduate programs, it often depends on the department. What kind of program are you interested in?",
    follow_up_options: [
      { option_text: "Undergraduate Deadlines", associated_intent_id: "undergrad_deadlines_specific" },
      { option_text: "Graduate Deadlines", associated_intent_id: "grad_deadlines_specific" },
      { option_text: "View All Deadlines", cta_button_text: "Full Deadlines Calendar", cta_button_link: "https://www.eduexpress.edu/deadlines" }
    ],
    cta_button_text: "Chat on WhatsApp",
    cta_button_link: "https://wa.me/+919876543210?text=Hello%20EduExpress%2C%20I%20have%20a%20question%20about%20application%20deadlines."
  },
  {
    intent_id: "undergrad_deadlines_specific",
    nlp_training_phrases: ["ug deadlines", "bachelor application deadline", "B.Tech application dates"],
    default_response_text: "For Fall 2025 undergraduate admissions, Early Action deadline is November 1st, and Regular Decision is January 15th. We highly encourage applying early!",
    follow_up_options: [
      { option_text: "Start your application", cta_button_text: "Apply Now", cta_button_link: "https://www.eduexpress.edu/apply" }
    ],
    cta_button_text: "Chat on WhatsApp",
    cta_button_link: "https://wa.me/+919876543210?text=Hello%20EduExpress%2C%20I%20have%20a%20question%20about%20undergraduate%20deadlines."
  },
  {
    intent_id: "grad_deadlines_specific",
    nlp_training_phrases: ["pg deadlines", "master's application deadline", "PhD deadlines"],
    default_response_text: "Graduate deadlines are program-specific. Please visit our graduate admissions page and navigate to your desired program for exact dates. Most programs have Fall intake deadlines in December-February and Spring intake in August-September.",
    follow_up_options: [
      { option_text: "Browse Graduate Programs", cta_button_text: "Graduate Programs List", cta_button_link: "https://www.eduexpress.edu/graduate-programs" },
      { option_text: "Contact Graduate Admissions", associated_intent_id: "connect_to_human" }
    ],
    cta_button_text: "Chat on WhatsApp",
    cta_button_link: "https://wa.me/+919876543210?text=Hello%20EduExpress%2C%20I%20have%20a%20question%20about%20graduate%20deadlines."
  },
  {
    intent_id: "application_steps",
    nlp_training_phrases: ["how to fill application", "what's the application process", "steps to apply"],
    default_response_text: "Applying to EduExpress involves a few steps: 1. Complete the online application. 2. Submit official transcripts. 3. Provide letters of recommendation. 4. Pay the application fee. Detailed instructions are on our website.",
    follow_up_options: [
      { option_text: "Start Online Application", cta_button_text: "Apply Online", cta_button_link: "https://www.eduexpress.edu/apply" },
      { option_text: "Required Documents List", cta_button_text: "Documents Checklist", cta_button_link: "https://www.eduexpress.edu/required-documents" }
    ],
    cta_button_text: "Chat on WhatsApp",
    cta_button_link: "https://wa.me/+919876543210?text=Hello%20EduExpress%2C%20I%20have%20a%20question%20about%20application%20steps."
  },
  {
    intent_id: "application_fee_info",
    nlp_training_phrases: ["how much is application fee", "application cost", "fees to apply"],
    default_response_text: "The application fee for most programs is ₹7500 (approx. $90 USD). Fee waivers are available for eligible applicants based on financial need or participation in partner programs. Would you like to know more about fee waivers?",
    follow_up_options: [
      { option_text: "Fee Waiver Information", associated_intent_id: "fee_waiver_info" },
      { option_text: "Pay Application Fee", cta_button_text: "Pay Now", cta_button_link: "https://www.eduexpress.edu/pay-fee" }
    ],
    cta_button_text: "Chat on WhatsApp",
    cta_button_link: "https://wa.me/+919876543210?text=Hello%20EduExpress%2C%20I%20have%20a%20question%20about%20application%20fees."
  },
  {
    intent_id: "fee_waiver_info",
    nlp_training_phrases: ["how to get fee waiver", "fee waiver criteria", "application fee exemption"],
    default_response_text: "Fee waivers are typically granted based on demonstrated financial need, participation in certain college access programs, or specific academic achievements. You can find detailed eligibility criteria and the application form on our website.",
    follow_up_options: [
      { option_text: "Apply for Fee Waiver", cta_button_text: "Fee Waiver Form", cta_button_link: "https://www.eduexpress.edu/fee-waiver-form", collect_contact_info: true }
    ],
    cta_button_text: "Chat on WhatsApp",
    cta_button_link: "https://wa.me/+919876543210?text=Hello%20EduExpress%2C%20I%20have%20a%20question%20about%20fee%20waivers."
  },
  {
    intent_id: "scholarship_info",
    nlp_training_phrases: ["scholarships available", "financial aid", "student grants", "how to get scholarship"],
    default_response_text: "EduExpress offers a variety of scholarships based on merit, need, and specific programs. We encourage all applicants to explore our comprehensive financial aid options to help fund their education.",
    follow_up_options: [
      { option_text: "Undergraduate Scholarships", cta_button_text: "UG Scholarships", cta_button_link: "https://www.eduexpress.edu/ug-scholarships" },
      { option_text: "Graduate Scholarships", cta_button_text: "PG Scholarships", cta_button_link: "https://www.eduexpress.edu/pg-scholarships" },
      { option_text: "Contact Financial Aid Office", associated_intent_id: "connect_to_human" }
    ],
    cta_button_text: "Chat on WhatsApp",
    cta_button_link: "https://wa.me/+919876543210?text=Hello%20EduExpress%2C%20I%20have%20a%20question%20about%20scholarships."
  },

  // --- Academic Programs / Courses Offered ---
  {
    intent_id: "courses_offered",
    nlp_training_phrases: ["what courses do you have", "list of majors", "programs of study", "degrees offered"],
    default_response_text: "We offer a wide range of undergraduate and graduate programs across various disciplines, including Engineering, Arts & Humanities, Sciences, and Management. What area of study interests you?",
    follow_up_options: [
      { option_text: "Undergraduate Programs", associated_intent_id: "undergrad_courses_list" },
      { option_text: "Graduate Programs", associated_intent_id: "grad_courses_list" },
      { option_text: "Doctoral Programs", associated_intent_id: "doctoral_programs" }
    ],
    cta_button_text: "Chat on WhatsApp",
    cta_button_link: "https://wa.me/+919876543210?text=Hello%20EduExpress%2C%20I%20have%20a%20question%20about%20courses%20offered."
  },
  {
    intent_id: "undergrad_courses_list",
    nlp_training_phrases: ["list of bachelor courses", "UG majors", "B.A. programs", "B.Sc. options"],
    default_response_text: "Our undergraduate offerings include popular majors like Computer Science, Business Administration, Electrical Engineering, English Literature, and Psychology. We also have many unique interdisciplinary programs.",
    follow_up_options: [
      { option_text: "View Undergraduate Course Catalog", cta_button_text: "UG Catalog", cta_button_link: "https://www.eduexpress.edu/ug-catalog" }
    ],
    cta_button_text: "Chat on WhatsApp",
    cta_button_link: "https://wa.me/+919876543210?text=Hello%20EduExpress%2C%20I%20have%20a%20question%20about%20undergraduate%20courses."
  },
  {
    intent_id: "grad_courses_list",
    nlp_training_phrases: ["list of master courses", "PG programs", "M.Tech options", "MBA details"],
    default_response_text: "Our graduate programs encompass Master's and Ph.D. degrees in fields such as Artificial Intelligence, Data Science, Public Policy, Biomedical Engineering, and advanced research areas in Humanities.",
    follow_up_options: [
      { option_text: "View Graduate Course Catalog", cta_button_text: "PG Catalog", cta_button_link: "https://www.eduexpress.edu/pg-catalog" }
    ],
    cta_button_text: "Chat on WhatsApp",
    cta_button_link: "https://wa.me/+919876543210?text=Hello%20EduExpress%2C%20I%20have%20a%20question%20about%20graduate%20courses."
  },
  {
    intent_id: "doctoral_programs",
    nlp_training_phrases: ["PhD programs", "doctoral studies", "research degrees"],
    default_response_text: "EduExpress offers a range of doctoral (PhD) programs across all our faculties, focusing on cutting-edge research and innovation. Admission to PhD programs is highly competitive and often requires a master's degree.",
    follow_up_options: [
      { option_text: "PhD Admissions", associated_intent_id: "grad_eligibility" },
      { option_text: "Research Areas", cta_button_text: "Explore Research", cta_button_link: "https://www.eduexpress.edu/research-areas" }
    ],
    cta_button_text: "Chat on WhatsApp",
    cta_button_link: "https://wa.me/+919876543210?text=Hello%20EduExpress%2C%20I%20have%20a%20question%20about%20doctoral%20programs."
  },

  // --- Campus Life ---
  {
    intent_id: "campus_life",
    nlp_training_phrases: ["what's campus like", "student activities", "housing", "life at university", "student experience"],
    default_response_text: "Campus life at EduExpress is vibrant and diverse, with numerous student organizations, sports teams, cultural events, and state-of-the-art facilities. What aspect interests you most?",
    follow_up_options: [
      { option_text: "Student Housing", associated_intent_id: "student_housing_info" },
      { option_text: "Clubs and Organizations", associated_intent_id: "clubs_orgs_info" },
      { option_text: "Campus Events", cta_button_text: "Events Calendar", cta_button_link: "https://www.eduexpress.edu/events" }
    ],
    cta_button_text: "Chat on WhatsApp",
    cta_button_link: "https://wa.me/+919876543210?text=Hello%20EduExpress%2C%20I%20have%20a%20question%20about%20campus%20life."
  },
  {
    intent_id: "student_housing_info",
    nlp_training_phrases: ["dorm options", "on-campus housing", "hostel facilities", "accommodation"],
    default_response_text: "We offer various on-campus housing options, from traditional dorms to apartment-style living, ensuring a comfortable and secure environment. Housing is guaranteed for all first-year undergraduate students.",
    follow_up_options: [
      { option_text: "Housing Application", cta_button_text: "Apply for Housing", cta_button_link: "https://www.eduexpress.edu/housing-apply" },
      { option_text: "Virtual Housing Tour", cta_button_text: "Take a Tour", cta_button_link: "https://www.eduexpress.edu/housing-tour" }
    ],
    cta_button_text: "Chat on WhatsApp",
    cta_button_link: "https://wa.me/+919876543210?text=Hello%20EduExpress%2C%20I%20have%20a%20question%20about%20student%20housing."
  },
  {
    intent_id: "clubs_orgs_info",
    nlp_training_phrases: ["student clubs", "student organizations", "get involved", "societies"],
    default_response_text: "With over 250 student clubs and organizations spanning academic, cultural, sports, and special interest groups, there's truly something for everyone! It's a great way to meet new people and enhance your university experience.",
    follow_up_options: [
      { option_text: "Browse All Clubs", cta_button_text: "Clubs Directory", cta_button_link: "https://www.eduexpress.edu/clubs-directory" },
      { option_text: "Start a New Club", cta_button_text: "New Club Info", cta_button_link: "https://www.eduexpress.edu/start-club" }
    ],
    cta_button_text: "Chat on WhatsApp",
    cta_button_link: "https://wa.me/+919876543210?text=Hello%20EduExpress%2C%20I%20have%20a%20question%20about%20clubs%20and%20organizations."
  },
  {
    intent_id: "sports_facilities",
    nlp_training_phrases: ["sports at university", "gym facilities", "swimming pool", "athletic complex"],
    default_response_text: "EduExpress boasts state-of-the-art sports facilities including a multi-sport indoor arena, Olympic-size swimming pool, gymnasium, and outdoor fields for various sports like football, cricket, and tennis.",
    follow_up_options: [
      { option_text: "View Sports Programs", cta_button_text: "Sports & Recreation", cta_button_link: "https://www.eduexpress.edu/sports" },
      { option_text: "Join a Team", cta_button_text: "Athletics Info", cta_button_link: "https://www.eduexpress.edu/athletics" }
    ],
    cta_button_text: "Chat on WhatsApp",
    cta_button_link: "https://wa.me/+919876543210?text=Hello%20EduExpress%2C%20I%20have%20a%20question%20about%20sports%20facilities."
  },

  // --- Notices & Announcements ---
  {
    intent_id: "latest_notices",
    nlp_training_phrases: ["latest notices", "recent announcements", "news updates", "what's new", "important notices"],
    default_response_text: "Here are some of our latest important notices: Academic calendar updates for Fall 2025, scholarship application extension for specific programs, and details on upcoming student orientation.",
    follow_up_options: [
      { option_text: "Academic Notices", associated_intent_id: "academic_notices" },
      { option_text: "Admission Notices", associated_intent_id: "admission_notices" },
      { option_text: "General Announcements", associated_intent_id: "general_announcements" }
    ],
    cta_button_text: "Chat on WhatsApp",
    cta_button_link: "https://wa.me/+919876543210?text=Hello%20EduExpress%2C%20I%20have%20a%20question%20about%20latest%20notices."
  },
  {
    intent_id: "academic_notices",
    nlp_training_phrases: ["academic updates", "exam schedule", "class cancellation", "syllabus changes"],
    default_response_text: "Recent academic notices include changes to the Spring 2025 examination schedule for B.Tech programs, and updated guidelines for thesis submissions. Please check the academic portal for details.",
    follow_up_options: [
      { option_text: "Exam Schedule", cta_button_text: "Exam Portal", cta_button_link: "https://www.eduexpress.edu/exam-portal" },
      { option_text: "Academic Calendar", cta_button_text: "View Calendar", cta_button_link: "https://www.eduexpress.edu/academic-calendar" }
    ],
    cta_button_text: "Chat on WhatsApp",
    cta_button_link: "https://wa.me/+919876543210?text=Hello%20EduExpress%2C%20I%20have%20a%20question%20about%20academic%20notices."
  },
  {
    intent_id: "admission_notices",
    nlp_training_phrases: ["admission updates", "new admission circulars", "application status notices"],
    default_response_text: "Current admission notices include extended deadlines for certain graduate programs (check specific program pages), and a reminder for applicants to submit pending documents by July 30th, 2025.",
    follow_up_options: [
      { option_text: "Check Application Status", cta_button_text: "Status Portal", cta_button_link: "https://www.eduexpress.edu/application-status" },
      { option_text: "Upcoming Admissions Events", cta_button_text: "Events", cta_button_link: "https://www.eduexpress.edu/admissions-events" }
    ],
    cta_button_text: "Chat on WhatsApp",
    cta_button_link: "https://wa.me/+919876543210?text=Hello%20EduExpress%2C%20I%20have%20a%20question%20about%20admission%20notices."
  },
  {
    intent_id: "general_announcements",
    nlp_training_phrases: ["general news", "university announcements", "campus updates"],
    default_response_text: "Recent general announcements cover upcoming campus events like the Annual Cultural Fest (August 15-17), new career services workshops starting next month, and updates on campus transportation.",
    follow_up_options: [
      { option_text: "Campus Events", cta_button_text: "Events Calendar", cta_button_link: "https://www.eduexpress.edu/events" },
      { option_text: "Career Services", cta_button_text: "Career Center", cta_button_link: "https://www.eduexpress.edu/career-services" }
    ],
    cta_button_text: "Chat on WhatsApp",
    cta_button_link: "https://wa.me/+919876543210?text=Hello%20EduExpress%2C%20I%20have%20a%20question%20about%20general%20announcements."
  },

  // --- Support & Escalation ---
  {
    intent_id: "connect_to_human",
    nlp_training_phrases: ["talk to a person", "human help", "speak to someone", "need assistance", "can I speak to an agent"],
    default_response_text: "I can connect you with a university representative who can provide more detailed assistance. Please provide your email address so our team can reach out to you directly.",
    follow_up_options: [], // Handled by `collect_contact_info` flag below
    collect_contact_info: true, // This intent directly triggers contact info collection
    cta_button_text: "Chat on WhatsApp", // Fallback if user doesn't want email
    cta_button_link: "https://wa.me/+919876543210?text=Hello%20EduExpress%2C%20I%20need%20to%20speak%20to%20a%20human."
  },
  {
    intent_id: "cancel_contact_collection", // Special intent to cancel contact form
    nlp_training_phrases: ["never mind", "cancel", "no thanks", "stop", "don't collect info"],
    default_response_text: "Understood. No contact information will be collected at this time. Is there anything else I can help you with regarding EduExpress?",
    follow_up_options: [
      { option_text: "Admission Information", associated_intent_id: "admission_info" },
        { option_text: "Courses Offered", associated_intent_id: "courses_offered" },
        { option_text: "General Inquiry", associated_intent_id: "general_greeting" }
    ],
    cta_button_text: "Chat on WhatsApp", // Provide WhatsApp as an easy next step
    cta_button_link: "https://wa.me/+919876543210?text=Hello%20EduExpress%2C%20I%20have%20a%20question."
  },

  // --- Fallback Intent ---
  {
    intent_id: "unrecognized_intent",
    nlp_training_phrases: [], // No specific phrases, this is a fallback
    default_response_text: "I'm not quite sure how to answer that question. My purpose is to provide information about EduExpress University. Would you like to check out our FAQs, explore our website, or connect with a staff member?",
    follow_up_options: [
      { option_text: "View FAQs", cta_button_text: "FAQs", cta_button_link: "https://www.eduexpress.edu/faq" },
      { option_text: "Explore Website", cta_button_text: "Homepage", cta_button_link: "https://www.eduexpress.edu/" }
    ],
    cta_button_text: "Chat on WhatsApp", // Direct to WhatsApp for any unhandled queries
    cta_button_link: "https://wa.me/+919876543210?text=Hello%20EduExpress%2C%20I%20have%20an%20unanswered%20question."
  }
];



export const plainData= `EduExpress University, established in 1995, is a leading institution renowned for its innovative research, diverse community, and commitment to student success. We're consistently ranked among the top 10 universities nationally for Engineering and Arts programs, and within the top 50 globally for research output. Our mission is to foster a transformative learning environment, conduct groundbreaking research, and serve society with integrity and impact. Our vision is to be a globally recognized leader in higher education and innovation. The current University President is Dr. Anya Sharma. You can find more details about our leadership team and achievements on our official website.

For admissions, our process is designed to be clear and supportive. Eligibility varies by program, but generally includes a strong academic record, official transcripts, and sometimes standardized test scores. Undergraduate applicants typically need a high school diploma with a minimum GPA of 3.0, while graduate programs usually require a relevant bachelor's degree and letters of recommendation. Application deadlines vary, with Fall 2025 undergraduate Early Action on November 1st and Regular Decision on January 15th. Graduate deadlines are program-specific, often between December and February for Fall intake. The application fee for most programs is ₹7500 (approx. $90 USD), with fee waivers available for eligible applicants. We also offer a variety of merit and need-based scholarships. You can find detailed application steps, required documents, and scholarship information on our admissions pages.

We offer a wide range of undergraduate, graduate, and doctoral programs across various disciplines including Engineering, Arts & Humanities, Sciences, and Management. Our undergraduate offerings include popular majors like Computer Science, Business Administration, and Electrical Engineering. Graduate programs encompass Master's and Ph.D. degrees in fields such as Artificial Intelligence, Data Science, and Public Policy. Detailed course catalogs are available online.

Campus life at EduExpress is vibrant and diverse, with over 250 student clubs and organizations spanning academic, cultural, sports, and special interest groups. We provide various on-campus housing options, guaranteeing accommodation for all first-year undergraduate students. Our state-of-the-art sports facilities include an indoor arena, Olympic-size swimming pool, and outdoor fields.

For the latest updates, please check our notices section. Recent announcements include academic calendar updates for Fall 2025, scholarship application extensions, and details on upcoming student orientation. There are also notices regarding changes to the Spring 2025 examination schedule for B.Tech programs and reminders for applicants to submit pending documents by July 30th, 2025. You can find all official notices and news on our university news feed.

If you need to get in touch, you can reach our main office at info@eduexpress.edu or call us at +91 98765 43210. Our main campus is located at 123 University Ave, Dispur, Guwahati, Assam, India, Pin: 781006. We are also available on WhatsApp. If you have an inquiry that the chatbot cannot resolve, we can connect you with a university representative; simply provide your email address.`

// Extract intent tags dynamically from your training data for the NLP prompt
export const intentTags = trainingData.map(item => item.intent_id);

export const globalConfig: GlobalConfig = {
  default_no_context_message: "I'm sorry, I don't have enough information to answer that question. Can I help you with something else?",
  default_unrecognized_intent_message: "I'm not sure I understand. My purpose is to help you with information about our university. Would you like to check out our FAQs or contact us?",
  default_cta_text: "Contact Us on WhatsApp",
  default_cta_link: "https://wa.me/YOUR_PHONE_NUMBER?text=Hello%20I%20have%20a%20question",
  pre_defined_contact_questions: ["What is your email?", "What is your phone number?"],
  contact_info_collection_success_message: "Thank you! We have received your information and will get back to you shortly. You can ask me another question or use the contact options below."
};

// --- Conversation State (global/session-based) ---
// In a real application, these would be managed per user session (e.g., in a database, Redis, or simple in-memory map for testing)
export interface ChatSessionState {
  current_conversation_context?: string; // Stores the intent_id of the current active conversation flow
  awaiting_contact_info: boolean;
  requested_contact_field?: "email" | "phone" | string; // What field is being asked for
  // You might also want to store collected contact info temporarily here before saving to DB
  collected_email?: string;
  collected_phone?: string;
  conversation_history: Array<{ user: string; bot: any }>; // For context and debugging
}

// A simple in-memory session store (for demonstration, use a robust solution in production)
const userSessions: Map<string, ChatSessionState> = new Map();

// Helper to get/create session state
export function getSessionState(userId: string): ChatSessionState {
  if (!userSessions.has(userId)) {
    userSessions.set(userId, {
      awaiting_contact_info: false,
      conversation_history: [],
    });
  }
  return userSessions.get(userId)!;
}


