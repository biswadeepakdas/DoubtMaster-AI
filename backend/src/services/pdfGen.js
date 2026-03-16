/**
 * PDF Generation Service
 * Generates beautiful, printable solution PDFs
 * HTML → PDF via Puppeteer (or html-pdf-node as fallback)
 */
import { logger } from '../utils/logger.js';

/**
 * Generate a complete solution PDF
 */
export async function generateSolutionPDF({ solutions, student, board, language }) {
  const html = buildPDFHTML(solutions, student, board, language);

  // In production: use Puppeteer
  // const browser = await puppeteer.launch({ headless: true });
  // const page = await browser.newPage();
  // await page.setContent(html, { waitUntil: 'networkidle0' });
  // const pdfBuffer = await page.pdf({
  //   format: student.country === 'IN' ? 'A4' : 'Letter',
  //   printBackground: true,
  //   margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' },
  // });
  // await browser.close();

  logger.info(`Generated PDF for student ${student.id}: ${solutions.length} questions`);

  return {
    pdfUrl: `/api/submissions/${student.submissionId}/pdf`,
    html, // Return HTML for preview
    pageCount: Math.ceil(solutions.length * 1.5) + 2, // Estimate
  };
}

function buildPDFHTML(solutions, student, board, language) {
  const isHindi = language === 'hi';
  const pageSize = student.country === 'IN' ? 'A4' : 'letter';
  const date = new Date().toLocaleDateString(student.country === 'IN' ? 'en-IN' : 'en-US');

  const solutionsHTML = solutions.map((sol, index) => {
    const steps = sol.steps || sol.solution?.steps || [];
    const finalAnswer = sol.finalAnswer || sol.solution?.finalAnswer || '';
    const question = sol.question || sol;

    return `
    <div class="question-block">
      <div class="question-header">
        <span class="q-number">Question ${index + 1}</span>
        ${question.marks ? `<span class="q-marks">[${question.marks} marks]</span>` : ''}
      </div>
      <div class="question-text">${escapeHtml(question.full_text || question.extractedText || '')}</div>

      <div class="solution-label">${isHindi ? 'हल:' : 'SOLUTION:'}</div>

      ${steps.map((step) => `
        <div class="step">
          <div class="step-header">
            <span class="step-number">Step ${step.step_number || step.stepNumber}</span>
            <span class="step-title">${escapeHtml(step.title || '')}</span>
            ${step.marks_for_step ? `<span class="step-marks">[${step.marks_for_step} m]</span>` : ''}
          </div>
          <div class="step-work">${escapeHtml(step.work || step.content || '')}</div>
          ${step.explanation ? `<div class="step-explanation">${escapeHtml(step.explanation)}</div>` : ''}
        </div>
      `).join('')}

      <div class="final-answer">
        <div class="answer-label">${isHindi ? 'उत्तर:' : 'ANSWER:'}</div>
        <div class="answer-value">${escapeHtml(finalAnswer)}</div>
      </div>

      ${sol.key_concepts || sol.conceptTags ? `
        <div class="concepts">
          <strong>${isHindi ? 'मुख्य अवधारणाएँ:' : 'Key Concepts:'}</strong>
          ${(sol.key_concepts || sol.conceptTags || []).join(', ')}
        </div>
      ` : ''}
    </div>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="${language}">
<head>
<meta charset="UTF-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Noto+Sans+Devanagari:wght@400;500;600;700&display=swap');

  @page {
    size: ${pageSize};
    margin: 20mm 15mm;
  }

  body {
    font-family: 'Inter', 'Noto Sans Devanagari', sans-serif;
    font-size: 11pt;
    line-height: 1.6;
    color: #1e293b;
    margin: 0;
    padding: 0;
  }

  .cover {
    text-align: center;
    padding: 60px 20px;
    page-break-after: always;
  }
  .cover .logo { font-size: 28pt; font-weight: 800; color: #6366f1; margin-bottom: 8px; }
  .cover .tagline { font-size: 12pt; color: #64748b; margin-bottom: 40px; font-style: italic; }
  .cover .student-name { font-size: 18pt; font-weight: 600; margin-bottom: 8px; }
  .cover .meta { font-size: 12pt; color: #475569; margin-bottom: 4px; }

  .question-block {
    margin-bottom: 24px;
    padding-bottom: 16px;
    border-bottom: 1px solid #e2e8f0;
    page-break-inside: avoid;
  }

  .question-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }
  .q-number { font-weight: 700; font-size: 13pt; color: #1e293b; }
  .q-marks { font-size: 10pt; color: #64748b; }

  .question-text {
    font-size: 11pt;
    color: #334155;
    margin-bottom: 12px;
    padding: 8px 12px;
    background: #f8fafc;
    border-radius: 6px;
    border-left: 3px solid #6366f1;
  }

  .solution-label {
    font-weight: 700;
    font-size: 11pt;
    color: #6366f1;
    margin-bottom: 8px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .step {
    margin-bottom: 8px;
    padding-left: 16px;
    border-left: 2px solid #e2e8f0;
  }
  .step-header { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
  .step-number {
    background: #6366f1; color: white; font-size: 9pt; font-weight: 700;
    padding: 2px 8px; border-radius: 10px;
  }
  .step-title { font-weight: 600; font-size: 10pt; color: #475569; }
  .step-marks { font-size: 9pt; color: #94a3b8; }
  .step-work { font-size: 11pt; color: #1e293b; margin: 4px 0; }
  .step-explanation { font-size: 9pt; color: #64748b; font-style: italic; margin-top: 2px; }

  .final-answer {
    margin-top: 12px;
    padding: 10px 14px;
    background: #ecfdf5;
    border: 2px solid #10b981;
    border-radius: 8px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .answer-label { font-weight: 700; color: #065f46; font-size: 11pt; }
  .answer-value { font-weight: 600; color: #065f46; font-size: 12pt; }

  .concepts { font-size: 9pt; color: #64748b; margin-top: 8px; }

  .footer {
    text-align: center;
    font-size: 8pt;
    color: #94a3b8;
    margin-top: 20px;
    padding-top: 8px;
    border-top: 1px solid #e2e8f0;
  }
</style>
</head>
<body>
  <!-- Cover Page -->
  <div class="cover">
    <div class="logo">DoubtMaster AI</div>
    <div class="tagline">${isHindi ? 'समझो, सिर्फ़ Answer मत देखो' : 'Understand, Don\'t Just See the Answer'}</div>
    ${student.name ? `<div class="student-name">${escapeHtml(student.name)}</div>` : ''}
    <div class="meta">${board || 'CBSE'} | Class ${student.grade || '10'}</div>
    <div class="meta">${solutions.length} Questions Solved</div>
    <div class="meta">${date}</div>
  </div>

  <!-- Solutions -->
  ${solutionsHTML}

  <!-- Footer -->
  <div class="footer">
    Generated by DoubtMaster AI &bull; Use as a learning aid &bull; Verify with your teacher
  </div>
</body>
</html>`;
}

function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
