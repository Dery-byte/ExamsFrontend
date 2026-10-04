# How to Upload Questions in Bulk

There are two templates. Use the one that matches the section you are adding.

| Section | Template file | What it holds |
|---|---|---|
| **Section A** (Objective) | `SectionA_Objective_Template.json` | Multiple choice, True/False, Matching, Fill-in-the-blank, Numeric |
| **Section B** (Theory) | `SectionB_Theory_Template.json` | Written / essay questions |
| **Question Bank** (Objective) | `Bank_Objective_Template.json` | Same as Section A, plus a topic and difficulty per question |
| **Question Bank** (Theory) | `Bank_Theory_Template.json` | Same as Section B, plus a topic and difficulty per question |

---

## The 4 steps

1. **Get the template.** In the app, open the quiz's **Add Questions** page and click **Download template** in the Bulk Upload box (OBJ tab for Section A, THEORY tab for Section B). Rename the file if you like (for example `CSC101_SectionA.json`).
2. **Open it** in Notepad, VS Code or any text editor (not Word).
3. **Replace the example questions** with your own. Copy and paste a block to add more questions, and delete the blocks you don't need.
4. In the app, open the quiz, go to **Add Questions**, pick the **OBJ** or **THEORY** tab, then use the **Bulk Upload** box on the right: **Select JSON File**, check the preview, and press **Upload Questions**.

---

## The 5 golden rules (most upload errors come from these)

1. **Only change the text inside the quotes on the right.**
   `"content": "Write your question here"` — keep the left part (`"content":`) exactly as it is.
2. **Every question sits inside `{ }`.** Put a **comma** between questions: `},` then `{`.
3. **No comma after the last question.** The file ends with `}` and then `]`.
4. **Every answer in square brackets must be spelled exactly like the option.**
   If option2 is `"Keyboard"`, the answer is `["Keyboard"]`, not `["keyboard"]` or `["B"]`.
5. **Need a quote mark inside your text?** Type `\"` instead, e.g. `"What does \"CPU\" stand for?"`.

> **Tip:** Before uploading, paste your file into **https://jsonlint.com** and click *Validate*. If it says "Valid JSON", it is safe to upload.

---

## Section A — Objective questions

Each block starts with `"questionType"`. Use one of these exact words in CAPITALS:

### 1. Multiple choice — `MCQ`
```json
{
  "questionType": "MCQ",
  "content": "Which of these is an input device?",
  "option1": "Monitor",
  "option2": "Keyboard",
  "option3": "Printer",
  "option4": "Speaker",
  "correct_answer": ["Keyboard"]
}
```
- You need at least **option1** and **option2**. Options 3 and 4 are optional.
- **More than one correct answer?** List them all: `["Python", "Java"]`. Students must pick all of them.

### 2. True / False — `TRUE_FALSE`
```json
{
  "questionType": "TRUE_FALSE",
  "content": "RAM keeps its data when the computer is switched off.",
  "correct_answer": ["False"]
}
```
- The answer must be exactly `["True"]` or `["False"]`, with a capital first letter.
- You do **not** need to type the options. The app adds True and False for you.

### 3. Matching — `MATCHING`
```json
{
  "questionType": "MATCHING",
  "content": "Match each device to its category.",
  "matchingPairs": [
    { "prompt": "Mouse",   "answer": "Input device",   "pairOrder": 0 },
    { "prompt": "Printer", "answer": "Output device",  "pairOrder": 1 }
  ]
}
```
- `prompt` = left column, `answer` = its correct match on the right.
- At least **2 pairs**. Number `pairOrder` 0, 1, 2, 3… in order.
- No `correct_answer` line is needed here. The pairs are the answer.
- Students get part of the mark for each pair they match correctly.

### 4. Fill in the blank — `FILL_BLANK`
```json
{
  "questionType": "FILL_BLANK",
  "content": "The brain of the computer is called the ______.",
  "correct_answer": ["CPU", "Central Processing Unit", "processor"]
}
```
- List **every answer you will accept**. Capital letters and extra spaces are ignored when marking.

### 5. Numeric answer — `NUMERIC`
```json
{
  "questionType": "NUMERIC",
  "content": "How many bits make up one byte?",
  "correct_answer": ["8"],
  "tolerance": 0
}
```
- Put the number in quotes: `["8"]`.
- `tolerance` is how far off a student may be and still get the mark. `0` = must be exact. `0.5` means 7.5–8.5 is accepted.

**Section A limit:** you cannot upload more questions than the quiz's *Number of Questions* setting. If you try, the upload is rejected.

---

## Section B — Theory questions

```json
{
  "quesNo": "Q1a",
  "question": "Define an operating system.",
  "marks": "4",
  "evaluationCriteria": "2 marks: manages hardware and software. 2 marks: interface for the user.",
  "isCompulsory": true
}
```

| Field | What to type |
|---|---|
| `quesNo` | The question number. Use **Q** + number, then a letter for parts: `Q1a`, `Q1b`, `Q2`, `Q3a`… Parts that share a number (Q1a, Q1b) are grouped together as Question 1. |
| `question` | The question text. |
| `marks` | Marks for this question, as a number in quotes: `"4"`. |
| `evaluationCriteria` | Your marking guide: the key points and how marks are shared. It is not shown on the exam screen. The AI marker uses it. You can leave it as `""`. |
| `isCompulsory` | `true` = every student must answer it. `false` = optional. **No quotes** around `true`/`false`. |

**Before you press Upload** in the THEORY tab, also fill in the two boxes above the file picker:
- **Questions to Answer** — how many main questions each student must answer (e.g. "answer 3 of 5").
- **Time Allowed (mins)** — time for Section B.

---

## Uploading to the Question Bank

The Question Bank uses **the same format**, so any Section A or Section B file above can be uploaded to a course's bank as it is. Objective and theory questions can even be mixed in one file.

1. Open **Question Bank**, pick the course on the left, and click **Upload questions**.
2. Download the bank template (**Objective** or **Theory**) if you need one, fill it in, and choose the file.
3. Optionally set a **default topic** and **default difficulty**. These are used for any question in the file that doesn't set its own.
4. Under **Question types to upload**, every type in your file is listed with how many there are. Untick any type you don't want. Only the ticked types are uploaded, and the rest of the file is left out (and not checked).
5. Check the preview (e.g. *Uploading 21 questions: Multiple choice (15) · True / False (6)*) and press **Upload**.

Bank questions can carry two extra lines:

| Field | What to type |
|---|---|
| `topic` | The topic, e.g. `"Hardware"`. Used to filter the bank and to draw random questions by topic. |
| `difficulty` | `"EASY"`, `"MEDIUM"` or `"HARD"`. |

- In the bank, theory questions have no number. `quesNo` and `isCompulsory` are ignored, and a number is given when the question is drawn into a quiz.
- Questions already in the bank are skipped, so uploading the same file twice does not create copies.
- If any question has a mistake, **nothing is uploaded** and the message tells you which question to fix (e.g. *Question 4 ("Match each device…"): …*).
- One file can hold up to 500 questions.

---

## Images

Bulk upload is for text only. To add a picture to a question, upload the file first. Then open the quiz's **View Questions** page, edit that question, and attach the image there.

---

## Common error messages

| Message | What it means / fix |
|---|---|
| *Invalid JSON format* | A comma or bracket is missing or extra. Check the 5 golden rules, or use jsonlint.com. |
| *Quiz allows N questions but you provided M* | Section A file has too many questions. Remove some, or raise the quiz's question count. |
| *Upload failed* | Usually a wrong `questionType` spelling, a True/False answer not written as `"True"`/`"False"`, or a matching question with fewer than 2 pairs. |
