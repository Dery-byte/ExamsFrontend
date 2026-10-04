/**
 * Bulk-upload starter files: example questions the lecturer overwrites, plus a plain-language guide.
 * Copies also live in the repo's Templates/ folder; keep the two in step.
 */
import sectionA from '../assets/question-templates/SectionA_Objective_Template.json?raw';
import sectionB from '../assets/question-templates/SectionB_Theory_Template.json?raw';
import bankObjective from '../assets/question-templates/Bank_Objective_Template.json?raw';
import bankTheory from '../assets/question-templates/Bank_Theory_Template.json?raw';
import guide from '../assets/question-templates/HOW_TO_USE_THE_TEMPLATES.md?raw';

const TEMPLATES = {
  SECTION_A: { content: sectionA, fileName: 'SectionA_Objective_Template.json' },
  SECTION_B: { content: sectionB, fileName: 'SectionB_Theory_Template.json' },
  BANK_OBJECTIVE: { content: bankObjective, fileName: 'Bank_Objective_Template.json' },
  BANK_THEORY: { content: bankTheory, fileName: 'Bank_Theory_Template.json' },
} as const;

export type QuestionTemplate = keyof typeof TEMPLATES;

function downloadText(content: string, fileName: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url; a.download = fileName; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export const downloadQuestionTemplate = (which: QuestionTemplate) =>
  downloadText(TEMPLATES[which].content, TEMPLATES[which].fileName, 'application/json');

export const downloadTemplateGuide = () =>
  downloadText(guide, 'How_to_fill_the_question_templates.txt', 'text/plain');
