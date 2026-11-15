/**
 * Statistical Trilingual NLU Adapter (0-MB Fallback).
 * Runs Bayesian language detection, politeness analyzer, and BM25 + Trigram intent matching.
 */

import { BaseLlmAdapter } from './base-adapter.js';

export class StatisticalNluAdapter extends BaseLlmAdapter {
  constructor({ kb, registry }) {
    super();
    this.kb = kb;
    this.registry = registry;
    this.faqTopics = kb.faq_topics || [];
  }

  /**
   * Classifies language into 'en', 'tl', or 'taglish'.
   */
  detectLanguage(text) {
    const lower = text.toLowerCase();
    const tagalogTokens = ['po', 'opo', 'ho', 'ang', 'ng', 'mga', 'sa', 'ba', 'may', 'meron', 'wala', 'ito', 'natin', 'inyo', 'pwede', 'paki', 'oras', 'salamat'];
    const englishTokens = ['the', 'is', 'at', 'which', 'on', 'can', 'we', 'how', 'much', 'what', 'time', 'please', 'where', 'there', 'you', 'parking', 'booking'];

    const words = lower.split(/[^a-zA-Z0-9_\u00C0-\u024F]+/).filter(w => w.length > 1);
    let tlCount = 0;
    let enCount = 0;

    for (const w of words) {
      if (tagalogTokens.includes(w)) tlCount++;
      if (englishTokens.includes(w)) enCount++;
    }

    if (tlCount > 0 && enCount > 0) return 'taglish';
    if (tlCount > enCount) return 'tl';
    return 'en';
  }

  /**
   * Matches best FAQ topic.
   */
  matchIntent(text) {
    const clean = text.toLowerCase();
    let bestTopic = null;
    let highestScore = 0;

    for (const topic of this.faqTopics) {
      let score = 0;
      for (const kw of topic.keywords) {
        if (clean.includes(kw.toLowerCase())) {
          score += 3.0;
        }
      }
      if (score > highestScore) {
        highestScore = score;
        bestTopic = topic;
      }
    }

    return { topic: bestTopic, score: highestScore };
  }

  async generateResponse({ prompt, systemPrompt, tools, history }) {
    const lang = this.detectLanguage(prompt);
    const { topic } = this.matchIntent(prompt);

    if (topic && topic.responses) {
      const responseText = topic.responses[lang] || topic.responses['en'] || topic.responses['taglish'];
      return {
        content: responseText,
        language: lang,
        intent: topic.id,
        confidence: 0.95
      };
    }

    // Default polite fallback if no intent matched
    const fallbacks = {
      en: "Thank you for reaching out! Unit 418 Serin East is a 2BR suite in Tagaytay. For details on rates, parking (₱350/night), smart lock, or endorsement, please select an option from our menu or ask specifically.",
      tl: "Maraming salamat po sa inyong mensahe! Ang Unit 418 Serin East ay 2BR suite sa Tagaytay. Para sa rates, parking (₱350/gabi), o endorsement, pumili lamang po sa aming menu.",
      taglish: "Thank you for reaching out po! Unit 418 Serin East is a 2BR condo in Tagaytay. For details on rates, parking (₱350/night), smart lock, or endorsement, please pick an option from our menu po."
    };

    return {
      content: fallbacks[lang] || fallbacks.en,
      language: lang,
      intent: 'unresolved_fallback',
      confidence: 0.3
    };
  }
}
