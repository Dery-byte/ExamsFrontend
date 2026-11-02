# How to Upload Questions in Bulk

Questions are uploaded from one Excel file: **Questions_Template.xlsx**. It opens in Excel, Google Sheets or LibreOffice.
The file has four tabs at the bottom of the window:

| Tab | What it holds |
|---|---|
| **Instructions** | A short version of this guide |
| **Objective** | Multiple choice, True/False, Fill in the blank, Numeric (one question per row) |
| **Matching** | Matching questions (one row per pair) |
| **Theory** | Written / essay questions (one row per part) |

Fill only the tabs you need. The same file works for a quiz and for the Question Bank.

---

## The 4 steps

1. **Get the template.** In the app, open the quiz's **Add Questions** page and click **Download Excel template** in the Bulk Upload box (or **Excel template** in the Question Bank's upload window).
2. **Type over the grey example rows** with your own questions and delete the examples you don't need. Don't change the headings in row 1. Point at a heading to see a short tip.
3. **Save the file** (keep it as .xlsx).
4. **Upload it.**
   - **Quiz:** open the quiz > **Add Questions**. On the **OBJ** tab, Bulk Upload reads the Objective and Matching tabs. On the **THEORY** tab it reads the Theory tab.
   - **Question Bank:** pick the course > **Upload questions**. All three tabs are read at once.

Choosing the file opens a **full-screen review** of every question before anything is uploaded:

- Questions with something missing or wrong are marked **Needs fixing** and open as a form, with the problem
  under the field (for example *Tick the correct option (the file said "C")*). Correct them right there, with no need
  to edit the file again. **Next problem** jumps to the next one.
- Use the bin button to leave a question out, or untick a question type to leave out all questions of that type.
  **Removed** lists them so you can restore them.
- **Approve & upload** switches on when every question is ready. If you close the review, your corrections are kept:
  press **Review & upload** to go back to them.

---

## Objective tab

| Column | What to type |
|---|---|
| **Type** | Pick from the list: `Multiple choice`, `True/False`, `Fill in the blank` or `Numeric`. |
| **Question** | The question text. Press **Alt+Enter** for a new line inside the cell. |
| **Option A – D** | Multiple choice only. A and B are required, C and D are optional. |
| **Answer** | See below. |
| **Tolerance** | Numeric only. How far off a student may be and still be right. Empty or `0` = exact. |
| **Topic, Difficulty** | Optional. Difficulty: `Easy`, `Medium` or `Hard`. Used by the Question Bank, and by a quiz with the **question pool** on (see below). |

**What to put in Answer:**

- **Multiple choice:** the letter of the correct option, e.g. `B`. More than one correct answer? Give every letter, e.g. `A, C`. Students must pick all of them.
- **True/False:** `True` or `False`. Leave the options empty; the app adds them.
- **Fill in the blank:** every answer you will accept, separated by `;` e.g. `CPU; Central Processing Unit; processor`. Capitals and extra spaces are ignored when marking.
- **Numeric:** the number, e.g. `8`. With Tolerance `0.5`, anything from 7.5 to 8.5 is accepted.

**Quiz limit:** you can't upload more objective questions than the quiz's *Number of Questions* setting.

---

## Matching tab

One row per pair. **Left** is what students see, **Right** is its correct match. Each question needs at least 2 pairs.

| Question | Left | Right |
|---|---|---|
| Match each device to its category. | Mouse | Input device |
| | Printer | Output device |
| | Hard disk | Storage device |

- Type the question on its first row and leave **Question** empty on the rows below. A new question text starts a new question.
- Two matching questions with the same wording? Leave an empty row between them.
- Students get part of the mark for each pair they match correctly.
- **Topic** and **Difficulty** columns work as on the Objective tab (type them on the question's first row).

---

## Question pool (random set per student)

If the quiz's **Question pool** setting is on, you can upload more objective questions than the quiz's Number of Questions, for example 200 for a 30-question quiz. Each student then gets exactly 30, drawn at random:

- Every student gets the **same number of Easy, Medium and Hard** questions and the **same number of each question type**, in proportion to the pool. Questions without a Difficulty count as their own group.
- **Topics** are shared out in proportion too, so a topic with twice as many questions in the pool comes up about twice as often.
- A student keeps the same questions if they reload the page or change device. A retake gets a new set.
- The quiz can only go live once the pool has at least Number of Questions questions.

---

## Theory tab

| Q No | Question | Marks | Marking guide | Compulsory |
|---|---|---|---|---|
| Q1a | Define an operating system. | 4 | 2 marks: manages hardware and software… | Yes |
| Q1b | Give two examples of operating systems. | 2 | 1 mark each… | Yes |
| Q2ai | A school connects 20 computers to one switch. (i) Name this topology. | 2 | Star topology. | No |
| Q2aii | (ii) State one advantage of this topology. | 3 | Any one: … | No |
| Q3 | Discuss three functions of the CPU. | 6 | 2 marks each. | No |

| Column | What to type |
|---|---|
| **Q No** | **Q** + number, then letters for parts: `Q1a`, `Q1b`, `Q2ai`, `Q2aii`, `Q3`. Each Q No may be used only once. |
| **Question** | The question text. |
| **Marks** | The marks for this row, e.g. `4`. |
| **Marking guide** | The key points and how marks are shared. Students don't see it; the AI marker uses it. May be empty. |
| **Compulsory** | `Yes` = every student must answer it. `No` = optional. |

**How question numbers work:**

- Parts with the same number form one question: Q2ai, Q2aii and Q2b are all **Question 2**. Q10a belongs to Question 10, never Question 1.
- "Questions to Answer" (e.g. answer 3 of 5) counts these whole questions.
- Parts appear to students **in the order of the rows**, so put them in the order you want.
- Each row gets its own answer box and its own marks.
- A lead-in sentence shared by several parts ("Consider the network below…") doesn't get a row of its own. Put it at the start of the first part, as in the Q2ai example.
- If any part of a question is Compulsory, the whole question is compulsory.

**Before you press Upload** on the THEORY tab, also fill in the two boxes above the file picker:
- **Questions to Answer**: how many main questions each student must answer.
- **Time Allowed (mins)**: time for Section B.

---

## Uploading to the Question Bank

1. Open **Question Bank**, pick the course on the left, and click **Upload questions**.
2. Choose your filled-in template. All three tabs are read.
3. Optionally set a **default topic** and **default difficulty**. These are used for any row that leaves Topic or Difficulty empty.
4. Under **Question types to upload**, untick any type you don't want.
5. Check the preview and press **Upload**.

- In the bank, theory questions have no number. Q No and Compulsory are ignored, and a number is given when the question is drawn into a quiz.
- Questions already in the bank are skipped, so uploading the same file twice does not create copies.
- One file can hold up to 500 questions.

---

## Pictures

Bulk upload is for text only. To add a picture, upload the questions first. Then open the quiz's **View Questions** page, edit that question, and attach the image there.

---

## Older JSON files

Files in the older JSON format (.json) are still accepted everywhere the Excel file is.
