/**
 * Model-Agnostic Tool Registry and Executable Handlers.
 */

import { TOOL_SCHEMAS } from './schema.js';

export class ToolRegistry {
  /**
   * @param {Object} options
   * @param {Object} options.kb Parsed data/knowledge-base.json
   * @param {Object} options.db ChatDatabase instance
   */
  constructor({ kb, db }) {
    this.kb = kb;
    this.db = db;
    this.unit = kb.unit || {};
    this.faqTopics = kb.faq_topics || [];
  }

  /**
   * Returns tool schemas for LLM registration.
   */
  getToolSchemas() {
    return TOOL_SCHEMAS;
  }

  /**
   * Dispatches and executes a tool call.
   * @param {string} toolName
   * @param {Object} args
   * @param {string} [sessionId=null]
   * @returns {Promise<Object>}
   */
  async executeTool(toolName, args = {}, sessionId = null) {
    let result;
    switch (toolName) {
      case 'get_parking_rules':
        result = this.handleGetParkingRules(args);
        break;
      case 'calculate_pricing_quote':
        result = this.handleCalculatePricingQuote(args);
        break;
      case 'get_endorsement_info':
        result = this.handleGetEndorsementInfo(args);
        break;
      case 'get_smart_lock_policy':
        result = this.handleGetSmartLockPolicy(args);
        break;
      case 'search_faq':
        result = this.handleSearchFaq(args);
        break;
      case 'save_guest_lead':
        result = this.handleSaveGuestLead(args, sessionId);
        break;
      default:
        result = { error: `Unknown tool: ${toolName}` };
    }

    if (this.db && sessionId) {
      this.db.logToolExecution({
        sessionId,
        toolName,
        argumentsJson: JSON.stringify(args),
        resultJson: JSON.stringify(result)
      });
    }

    return result;
  }

  handleGetParkingRules() {
    return {
      covered_nightly_php: this.unit.parking_covered_nightly_php || 350,
      street_parking: this.unit.parking_street,
      details: 'Dedicated covered slot in Serin East Tower at ₱350/night (co-terminous with 2PM check-in to 12NN checkout). Advance vehicle plate and model submission required.'
    };
  }

  handleCalculatePricingQuote(args) {
    const nights = Math.max(1, Number(args.nights) || 1);
    const weekendNights = Math.min(nights, Number(args.weekendNights) || 0);
    const weekdayNights = nights - weekendNights;
    const coveredParkingNights = Number(args.coveredParkingNights) || 0;

    const weekdayBaseRate = 3300;
    const weekendBaseRate = 4200;
    const parkingRate = this.unit.parking_covered_nightly_php || 350;

    const roomTotal = (weekdayNights * weekdayBaseRate) + (weekendNights * weekendBaseRate);
    const parkingTotal = coveredParkingNights * parkingRate;
    const totalEstimate = roomTotal + parkingTotal;

    return {
      total_nights: nights,
      weekday_nights: weekdayNights,
      weekend_nights: weekendNights,
      room_subtotal_php: roomTotal,
      covered_parking_total_php: parkingTotal,
      total_estimate_php: totalEstimate,
      refundable_deposit_php: this.unit.security_deposit_direct_agoda || 3000
    };
  }

  handleGetEndorsementInfo() {
    return {
      endorsement_url: this.unit.endorsement_url,
      requirements: [
        '1 Valid Government-issued ID of primary guest',
        'Complete full names of all accompanying guests',
        'Active mobile contact number',
        'Vehicle plate & model (if booking ₱350 covered parking)'
      ],
      notice: 'Mandatory building admin clearance prior to lobby entry at Serin East Tagaytay.'
    };
  }

  handleGetSmartLockPolicy() {
    return {
      check_in_time: this.unit.check_in_time,
      check_out_time: this.unit.check_out_time,
      turnover_window: this.unit.turnover_window,
      pin_release_criteria: 'Unique PIN generated and sent on check-in day upon arrival once Carrd endorsement is submitted and caretaker sanitization is complete.'
    };
  }

  handleSearchFaq(args) {
    const q = (args.query || '').toLowerCase().trim();
    if (!q) return { found: false, results: [] };

    for (const topic of this.faqTopics) {
      if (topic.keywords.some(kw => q.includes(kw.toLowerCase()))) {
        return {
          found: true,
          topicId: topic.id,
          title: topic.title,
          responses: topic.responses
        };
      }
    }

    return { found: false, message: 'No exact FAQ topic matched.' };
  }

  handleSaveGuestLead(args, sessionId) {
    if (!this.db || !sessionId) {
      return { success: false, error: 'Database or session not initialized' };
    }

    const lead = this.db.saveLead({
      sessionId,
      name: args.name,
      contact: args.contact,
      datesRequested: args.datesRequested || null,
      notes: args.notes || null
    });

    return { success: true, leadId: lead.id };
  }
}

export * from './schema.js';
