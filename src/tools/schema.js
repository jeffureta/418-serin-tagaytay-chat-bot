/**
 * Standard JSON Schemas for Unit 418 Concierge Tools.
 * Follows OpenAI / Gemini function-calling specification.
 */

export const TOOL_SCHEMAS = [
  {
    name: 'search_faq',
    description: 'Searches knowledge base facts and house rules for Unit 418 Serin East Tagaytay by query or topic.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The search query or keyword (e.g. "cooking", "parking", "lock code", "pool").'
        }
      },
      required: ['query']
    }
  },
  {
    name: 'calculate_pricing_quote',
    description: 'Calculates an estimated staycation price quote for Unit 418 based on weekday/weekend nights and covered parking.',
    parameters: {
      type: 'object',
      properties: {
        nights: {
          type: 'number',
          description: 'Total number of nights.'
        },
        weekendNights: {
          type: 'number',
          description: 'Number of nights falling on Friday or Saturday.'
        },
        coveredParkingNights: {
          type: 'number',
          description: 'Number of nights requiring a dedicated covered tower parking slot (₱350/night).'
        }
      },
      required: ['nights']
    }
  },
  {
    name: 'get_parking_rules',
    description: 'Returns official parking rules, rates (₱350/night covered vs free street parking), and vehicle advance requirements.',
    parameters: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'get_endorsement_info',
    description: 'Returns the official Serin East Building Admin endorsement Carrd submission link, required IDs, and guest list rules.',
    parameters: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'get_smart_lock_policy',
    description: 'Returns the smart lock PIN release criteria and standard 2:00 PM check-in / 12:00 NN check-out hours.',
    parameters: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'save_guest_lead',
    description: 'Saves a prospective guest inquiry or booking lead for host follow-up into the local SQLite database.',
    parameters: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Guest full name.'
        },
        contact: {
          type: 'string',
          description: 'Active contact phone number or email.'
        },
        datesRequested: {
          type: 'string',
          description: 'Dates or month requested.'
        },
        notes: {
          type: 'string',
          description: 'Special requests, headcount, or details.'
        }
      },
      required: ['name', 'contact']
    }
  }
];
