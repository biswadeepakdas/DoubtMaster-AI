/**
 * Multilingual Engine - Indian language support
 * Supports: Hindi, Tamil, Telugu, Kannada, Bengali, Marathi, Gujarati, Malayalam, Punjabi, Odia
 */

const LANGUAGE_CONFIG = {
  hi: { name: 'Hindi', script: 'Devanagari', nativeName: 'हिन्दी' },
  ta: { name: 'Tamil', script: 'Tamil', nativeName: 'தமிழ்' },
  te: { name: 'Telugu', script: 'Telugu', nativeName: 'తెలుగు' },
  kn: { name: 'Kannada', script: 'Kannada', nativeName: 'ಕನ್ನಡ' },
  bn: { name: 'Bengali', script: 'Bengali', nativeName: 'বাংলা' },
  mr: { name: 'Marathi', script: 'Devanagari', nativeName: 'मराठी' },
  gu: { name: 'Gujarati', script: 'Gujarati', nativeName: 'ગુજરાતી' },
  ml: { name: 'Malayalam', script: 'Malayalam', nativeName: 'മലയാളം' },
  pa: { name: 'Punjabi', script: 'Gurmukhi', nativeName: 'ਪੰਜਾਬੀ' },
  od: { name: 'Odia', script: 'Odia', nativeName: 'ଓଡ଼ିଆ' },
  en: { name: 'English', script: 'Latin', nativeName: 'English' },
};

// Common math terms in Hindi (expandable to other languages)
const MATH_TERMS_HI = {
  'equation': 'समीकरण',
  'solve': 'हल करें',
  'therefore': 'इसलिए',
  'given': 'दिया गया',
  'find': 'ज्ञात करें',
  'answer': 'उत्तर',
  'step': 'चरण',
  'formula': 'सूत्र',
  'substitute': 'प्रतिस्थापित करें',
  'verify': 'सत्यापित करें',
  'area': 'क्षेत्रफल',
  'volume': 'आयतन',
  'perimeter': 'परिमाप',
  'angle': 'कोण',
  'triangle': 'त्रिभुज',
  'circle': 'वृत्त',
  'square': 'वर्ग',
  'rectangle': 'आयत',
  'parallel': 'समानांतर',
  'perpendicular': 'लम्बवत',
  'probability': 'प्रायिकता',
  'integration': 'समाकलन',
  'differentiation': 'अवकलन',
  'matrix': 'आव्यूह',
  'vector': 'सदिश',
  'force': 'बल',
  'velocity': 'वेग',
  'acceleration': 'त्वरण',
  'energy': 'ऊर्जा',
  'momentum': 'संवेग',
};

export class MultilingualEngine {
  constructor(config = {}) {
    this.defaultLanguage = config.defaultLanguage || 'en';
    this.supportedLanguages = Object.keys(LANGUAGE_CONFIG);
  }

  /**
   * Get supported languages
   */
  getSupportedLanguages() {
    return Object.entries(LANGUAGE_CONFIG).map(([code, config]) => ({
      code,
      ...config,
    }));
  }

  /**
   * Translate solution steps to target language
   */
  async translateSteps(steps, targetLanguage) {
    if (targetLanguage === 'en') return steps;
    if (!this.supportedLanguages.includes(targetLanguage)) {
      throw new Error(`Unsupported language: ${targetLanguage}`);
    }

    // In production: use IndicTrans2 or LLM-based translation
    // For Hindi, we can do basic term replacement + LLM translation
    return steps.map((step) => ({
      ...step,
      content: this.basicTranslate(step.content, targetLanguage),
      explanation: this.basicTranslate(step.explanation, targetLanguage),
      title: this.basicTranslate(step.title, targetLanguage),
    }));
  }

  /**
   * Translate a single text
   */
  async translate(text, targetLanguage) {
    if (targetLanguage === 'en' || !text) return text;

    // In production: call IndicTrans2 API or LLM
    // const response = await this.callTranslationAPI(text, 'en', targetLanguage);
    return this.basicTranslate(text, targetLanguage);
  }

  /**
   * Basic translation using term mapping (Hindi only for demo)
   * Production: replace with IndicTrans2 or LLM-based translation
   */
  basicTranslate(text, targetLanguage) {
    if (targetLanguage !== 'hi' || !text) return text;

    let translated = text;
    for (const [english, hindi] of Object.entries(MATH_TERMS_HI)) {
      const regex = new RegExp(`\\b${english}\\b`, 'gi');
      translated = translated.replace(regex, hindi);
    }
    return translated;
  }

  /**
   * Detect language of input text
   */
  detectLanguage(text) {
    // Unicode range detection for Indian scripts
    if (/[\u0900-\u097F]/.test(text)) return 'hi'; // Devanagari
    if (/[\u0B80-\u0BFF]/.test(text)) return 'ta'; // Tamil
    if (/[\u0C00-\u0C7F]/.test(text)) return 'te'; // Telugu
    if (/[\u0C80-\u0CFF]/.test(text)) return 'kn'; // Kannada
    if (/[\u0980-\u09FF]/.test(text)) return 'bn'; // Bengali
    if (/[\u0A80-\u0AFF]/.test(text)) return 'gu'; // Gujarati
    if (/[\u0D00-\u0D7F]/.test(text)) return 'ml'; // Malayalam
    if (/[\u0A00-\u0A7F]/.test(text)) return 'pa'; // Gurmukhi
    if (/[\u0B00-\u0B7F]/.test(text)) return 'od'; // Odia
    return 'en';
  }
}
