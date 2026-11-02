/**
 * Bulk-upload starter files: the Excel template (example questions the lecturer overwrites, one tab each for
 * objective, matching and theory questions) plus a plain-language guide. The workbook is built by
 * Templates/make_question_template.py, which also writes the copy in the repo's Templates/ folder.
 * The older JSON templates stay in Templates/ for anyone still using JSON; uploads accept both.
 */
import templateUrl from '../assets/question-templates/Questions_Template.xlsx?url';
import guide from '../assets/question-templates/HOW_TO_USE_THE_TEMPLATES.md?raw';

function download(href: string, fileName: string) {
  const a = document.createElement('a');
  a.href = href; a.download = fileName; a.click();
}

export const downloadQuestionTemplate = () => download(templateUrl, 'Questions_Template.xlsx');

export const downloadTemplateGuide = () => {
  const url = URL.createObjectURL(new Blob([guide], { type: 'text/plain' }));
  download(url, 'How_to_fill_the_question_template.txt');
  setTimeout(() => URL.revokeObjectURL(url), 0);
};
