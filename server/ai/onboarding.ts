import { generateChatResponse } from './openai';

interface OnboardingData {
  businessType: string;
  businessDescription: string;
  primaryGoals: string[];
  companySize: string;
  currentChallenges: string;
}

interface AIRecommendation {
  title: string;
  description: string;
  actionItems: string[];
  priority: 'high' | 'medium' | 'low';
}

export async function generatePersonalizedRecommendations(data: OnboardingData): Promise<{
  suggestions: AIRecommendation[];
  quickWins: string[];
  nextSteps: string[];
}> {
  const prompt = `
You are an AI chatbot consultant helping a business owner set up their chatbot experience. Based on their responses, provide personalized, actionable recommendations.

Business Information:
- Type: ${data.businessType}
- Description: ${data.businessDescription}
- Company Size: ${data.companySize}
- Primary Goals: ${data.primaryGoals.join(', ')}
- Current Challenges: ${data.currentChallenges || 'None specified'}

Please provide recommendations in the following JSON format:
{
  "suggestions": [
    {
      "title": "Recommendation Title",
      "description": "Detailed explanation of why this is important for their business",
      "actionItems": ["Specific step 1", "Specific step 2", "Specific step 3"],
      "priority": "high|medium|low"
    }
  ],
  "quickWins": ["Quick win 1", "Quick win 2", "Quick win 3"],
  "nextSteps": ["Next step 1", "Next step 2", "Next step 3"]
}

Focus on:
1. Chatbot configuration specific to their business type
2. Goal-oriented features and flows
3. Industry best practices
4. Experience level appropriate recommendations
5. Solutions to their specific challenges

Provide 3-5 specific, actionable suggestions that will have the biggest impact on their success.
`;

  try {
    const response = await generateChatResponse(
      prompt,
      "",
      "You are an expert chatbot consultant providing personalized business recommendations."
    );

    // Try to parse JSON response
    try {
      return JSON.parse(response);
    } catch (parseError) {
      // Fallback to structured response if JSON parsing fails
      return generateFallbackRecommendations(data);
    }
  } catch (error) {
    console.error('Failed to generate AI recommendations:', error);
    return generateFallbackRecommendations(data);
  }
}

function generateFallbackRecommendations(data: OnboardingData): {
  suggestions: AIRecommendation[];
  quickWins: string[];
  nextSteps: string[];
} {
  const businessTypeRecommendations: Record<string, AIRecommendation[]> = {
    ecommerce: [
      {
        title: 'Product Recommendation Engine',
        description: 'Set up your chatbot to suggest products based on customer preferences and browsing history.',
        actionItems: [
          'Create product catalog integration',
          'Set up preference collection questions',
          'Configure smart product suggestions',
          'Add cart abandonment recovery flows'
        ],
        priority: 'high'
      },
      {
        title: 'Order Support Automation',
        description: 'Automate common order-related inquiries to reduce support workload.',
        actionItems: [
          'Create order status lookup flow',
          'Set up return/exchange guides',
          'Add shipping information automation',
          'Configure order modification flows'
        ],
        priority: 'high'
      }
    ],
    service: [
      {
        title: 'Appointment Booking System',
        description: 'Enable customers to book appointments directly through your chatbot.',
        actionItems: [
          'Set up calendar integration',
          'Create service selection flow',
          'Configure availability checking',
          'Add confirmation and reminder system'
        ],
        priority: 'high'
      },
      {
        title: 'Service FAQ Automation',
        description: 'Address common service questions instantly to improve customer satisfaction.',
        actionItems: [
          'Create comprehensive FAQ database',
          'Set up intelligent question matching',
          'Add service area information',
          'Configure pricing information flows'
        ],
        priority: 'medium'
      }
    ],
    saas: [
      {
        title: 'Trial to Paid Conversion Flow',
        description: 'Guide trial users towards paid subscriptions with targeted messaging.',
        actionItems: [
          'Create trial user identification',
          'Set up feature highlighting flows',
          'Add upgrade path guidance',
          'Configure success story sharing'
        ],
        priority: 'high'
      },
      {
        title: 'Technical Support Triage',
        description: 'Efficiently route technical questions to the right resources.',
        actionItems: [
          'Create problem categorization system',
          'Set up self-service documentation links',
          'Add escalation workflows',
          'Configure ticket creation automation'
        ],
        priority: 'medium'
      }
    ]
  };

  const goalBasedRecommendations: Record<string, AIRecommendation> = {
    lead_generation: {
      title: 'Lead Capture Optimization',
      description: 'Maximize lead generation with strategic conversation flows and incentives.',
      actionItems: [
        'Create engaging conversation starters',
        'Add value-driven lead magnets',
        'Set up progressive information collection',
        'Configure follow-up automation'
      ],
      priority: 'high'
    },
    customer_support: {
      title: 'Support Efficiency System',
      description: 'Streamline customer support with automated responses and smart routing.',
      actionItems: [
        'Build comprehensive knowledge base',
        'Set up intent recognition',
        'Create escalation workflows',
        'Add satisfaction feedback collection'
      ],
      priority: 'high'
    },
    sales_assistance: {
      title: 'Sales Conversation Flows',
      description: 'Guide prospects through your sales process with intelligent questioning.',
      actionItems: [
        'Create needs assessment flows',
        'Add product/service matching logic',
        'Set up objection handling responses',
        'Configure sales team handoff'
      ],
      priority: 'high'
    }
  };

  // Generate recommendations based on business type and goals
  const suggestions: AIRecommendation[] = [];
  
  // Add business type specific recommendations
  const typeRecs = businessTypeRecommendations[data.businessType] || [];
  suggestions.push(...typeRecs.slice(0, 2));
  
  // Add goal-based recommendations
  data.primaryGoals.forEach(goal => {
    const goalRec = goalBasedRecommendations[goal];
    if (goalRec && !suggestions.find(s => s.title === goalRec.title)) {
      suggestions.push(goalRec);
    }
  });

  // Ensure we have at least 3 recommendations
  if (suggestions.length < 3) {
    suggestions.push({
      title: 'Brand Personalization',
      description: 'Customize your chatbot\'s appearance and messaging to match your brand.',
      actionItems: [
        'Upload your brand colors and logo',
        'Customize welcome messages',
        'Set up brand voice and tone',
        'Add company-specific responses'
      ],
      priority: 'medium'
    });
  }

  const quickWins = [
    'Set up your welcome message and branding',
    'Create 3-5 common FAQ responses',
    'Add your contact information and business hours',
    'Test the chatbot on your website'
  ];

  const nextSteps = [
    'Review and implement the personalized recommendations above',
    'Set up your first chatbot and test its functionality',
    'Create training data specific to your business',
    'Monitor performance and optimize based on user interactions'
  ];

  return {
    suggestions: suggestions.slice(0, 4),
    quickWins,
    nextSteps
  };
}