'use strict';

const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');

function bullet(doc, text) {
  doc.text(`- ${text}`, { indent: 12 });
}

function buildResearchNote() {
  const doc = new PDFDocument({
    margin: 48,
    size: 'A4',
    bufferPages: true,
  });

  const pdfPath = path.join(__dirname, 'Research_Next_Plan_Note.pdf');
  const stream = fs.createWriteStream(pdfPath);
  doc.pipe(stream);

  doc
    .fillColor('#0f766e')
    .font('Helvetica-Bold')
    .fontSize(18)
    .text('Research Next Plan Note', { align: 'center' });

  doc.moveDown(0.4);
  doc
    .fillColor('#444444')
    .font('Helvetica')
    .fontSize(10)
    .text('Project: MedGemma4B skin disease multimodal ablation study', { align: 'center' })
    .text('Prepared from Kaggle run review: 28 July 2026', { align: 'center' });

  doc.moveDown(1.4);
  doc
    .fillColor('#0f766e')
    .font('Helvetica-Bold')
    .fontSize(12)
    .text('Current Evidence');

  doc.moveDown(0.3);
  doc.fillColor('#222222').font('Helvetica').fontSize(10);
  bullet(doc, 'Main multimodal model held-out test accuracy: 92.77%, macro F1: 93.42%, ROC-AUC: 0.9887.');
  bullet(doc, 'Ablation 1 visual-only held-out test accuracy: 89.16%, macro F1: 90.10%, ROC-AUC: 0.9849.');
  bullet(doc, 'Ablation 2 text-only held-out test accuracy: 19.28%, macro F1: 8.08%, ROC-AUC: 0.5000.');
  bullet(doc, 'Text-only model collapsed to one-class prediction, so there is no evidence of useful text-only signal or text-label leakage.');
  bullet(doc, 'Kaggle logs reported CV/test image path overlap = 0, exact image hash overlap = 0, and disease-name text leakage audit = PASS.');

  doc.moveDown(1);
  doc
    .fillColor('#0f766e')
    .font('Helvetica-Bold')
    .fontSize(12)
    .text('Next Planned Experiment');

  doc.moveDown(0.3);
  doc.fillColor('#222222').font('Helvetica').fontSize(10);
  bullet(doc, 'Run a neutral-text control using the main model code.');
  bullet(doc, 'Keep the image branch, DinoV2 encoder, cross-attention/fusion structure, 5-fold training, and held-out test evaluation unchanged.');
  bullet(doc, 'Replace every sample text with the same neutral sentence, for example: "patient presents with observed cutaneous skin lesions and clinical symptoms."');
  bullet(doc, 'Suggested Kaggle title: Neutral Text Control Main Model T4x2.');
  bullet(doc, 'Use Kaggle GPU T4 x2.');
  bullet(doc, 'Estimated full training and test runtime: about 6.5 to 7.5 hours; allow up to 8 hours for cache/model loading delays.');

  doc.moveDown(1);
  doc
    .fillColor('#0f766e')
    .font('Helvetica-Bold')
    .fontSize(12)
    .text('Interpretation Rule');

  doc.moveDown(0.3);
  doc.fillColor('#222222').font('Helvetica').fontSize(10);
  bullet(doc, 'If neutral-text control remains around 92-93% accuracy, the main model gain is likely from architecture/fusion behavior rather than meaningful sample-specific text.');
  bullet(doc, 'If neutral-text control drops near the visual-only result around 89% or lower, the original text stream likely provides a small complementary signal.');
  bullet(doc, 'If neutral-text control drops much lower than visual-only, the multimodal fusion may depend strongly on non-neutral text alignment and should be analyzed further.');

  doc.moveDown(1);
  doc
    .fillColor('#0f766e')
    .font('Helvetica-Bold')
    .fontSize(12)
    .text('Recommended Later Audits');

  doc.moveDown(0.3);
  doc.fillColor('#222222').font('Helvetica').fontSize(10);
  bullet(doc, 'Patient-level split audit if patient identifiers are available.');
  bullet(doc, 'Perceptual-hash or embedding-similarity near-duplicate audit to catch resized/cropped duplicate images.');
  bullet(doc, 'Report wording: no evidence of text-label leakage or exact image duplicate leakage was found, but patient-level and near-duplicate audits are recommended.');

  const pages = doc.bufferedPageRange();
  for (let i = pages.start; i < pages.start + pages.count; i += 1) {
    doc.switchToPage(i);
    doc
      .fillColor('#888888')
      .font('Helvetica')
      .fontSize(8)
      .text(`Page ${i + 1} of ${pages.count}`, 48, 770, { align: 'center', width: 500 });
  }

  doc.end();

  stream.on('finish', () => {
    console.log(`Research note PDF created at: ${pdfPath}`);
  });
}

buildResearchNote();
