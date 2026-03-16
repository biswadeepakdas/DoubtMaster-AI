/**
 * OCR Engine - Multi-model text extraction from images
 * Supports: Printed text, handwritten math, Indian scripts
 */

export class OCREngine {
  constructor(config = {}) {
    this.primaryModel = config.primaryModel || 'gpt-4o-vision';
    this.fallbackModel = config.fallbackModel || 'tesseract';
    this.confidenceThreshold = config.confidenceThreshold || 0.85;
  }

  /**
   * Extract text from image
   * @param {Buffer} imageBuffer - Image data
   * @returns {{ text: string, confidence: number, language: string, hasEquations: boolean }}
   */
  async extract(imageBuffer) {
    try {
      // Primary: GPT-4o Vision (best for handwriting + math)
      const result = await this.extractWithVision(imageBuffer);
      if (result.confidence >= this.confidenceThreshold) {
        return result;
      }

      // Fallback: Tesseract for printed text
      const fallback = await this.extractWithTesseract(imageBuffer);
      return fallback.confidence > result.confidence ? fallback : result;
    } catch (error) {
      // Last resort: Tesseract
      return this.extractWithTesseract(imageBuffer);
    }
  }

  /**
   * GPT-4o Vision extraction
   */
  async extractWithVision(imageBuffer) {
    // In production:
    // const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    // const response = await openai.chat.completions.create({
    //   model: 'gpt-4o',
    //   messages: [{
    //     role: 'user',
    //     content: [
    //       {
    //         type: 'text',
    //         text: `Extract the question from this image. Rules:
    //           1. Use LaTeX for all mathematical expressions (wrap in $ or $$)
    //           2. Preserve the original language (Hindi, Tamil, etc.)
    //           3. If handwritten, interpret carefully
    //           4. Include all parts of multi-part questions
    //           5. Note any diagrams or figures as [DIAGRAM: description]`
    //       },
    //       {
    //         type: 'image_url',
    //         image_url: { url: \`data:image/jpeg;base64,\${imageBuffer.toString('base64')}\` }
    //       }
    //     ]
    //   }],
    //   max_tokens: 1000,
    // });

    return {
      text: 'Extracted question text would appear here',
      confidence: 0.95,
      language: 'en',
      hasEquations: true,
      method: 'gpt-4o-vision',
    };
  }

  /**
   * Tesseract OCR extraction (offline-capable)
   */
  async extractWithTesseract(imageBuffer) {
    // In production:
    // const { createWorker } = await import('tesseract.js');
    // const worker = await createWorker(['eng', 'hin', 'tam', 'tel']);
    // const { data } = await worker.recognize(imageBuffer);
    // await worker.terminate();

    return {
      text: 'Tesseract extracted text',
      confidence: 0.80,
      language: 'en',
      hasEquations: false,
      method: 'tesseract',
    };
  }

  /**
   * Preprocess image for better OCR
   */
  async preprocess(imageBuffer) {
    // In production: use sharp
    // return sharp(imageBuffer)
    //   .greyscale()
    //   .normalize()
    //   .sharpen()
    //   .resize({ width: 1920, withoutEnlargement: true })
    //   .toBuffer();
    return imageBuffer;
  }
}
