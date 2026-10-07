import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import questions from '../src/data/questions.js';
import { shuffleChoices, translatedChoice } from '../src/quiz.js';

test('every question has four distinct choices, a valid answer, and an explanation', () => {
  const themes = new Set(['valeurs', 'institutions', 'droits', 'histoire', 'societe']);
  assert.equal(questions.length, 743);
  for (const [index, question] of questions.entries()) {
    const label = `Question ${index + 1}`;
    assert.ok(themes.has(question.theme), label);
    assert.equal(question.c.length, 4, label);
    assert.equal(new Set(question.c.map(choice => choice.trim())).size, 4, label);
    assert.ok(Number.isInteger(question.a) && question.a >= 0 && question.a < 4, label);
    for (const text of [question.q, question.e, ...question.c]) {
      assert.equal(typeof text, 'string', label);
      assert.ok(text.trim(), label);
    }
    if (question.source) {
      assert.equal(new URL(question.source).protocol, 'https:', label);
      assert.match(question.reviewedAt, /^\d{4}-\d{2}-\d{2}$/, label);
    }
  }
});

test('all 24 choice permutations preserve each correct answer and its translation', () => {
  for (const question of questions) {
    const before = JSON.stringify(question);
    const translation = { c: question.c.map((_, i) => `translation-${i}`) };
    const permutations = new Set();
    // Fisher–Yates makes choices from 4, 3 and 2 positions.
    for (let a = 0; a < 4; a++) for (let b = 0; b < 3; b++) for (let c = 0; c < 2; c++) {
      const draws = [(a + 0.5) / 4, (b + 0.5) / 3, (c + 0.5) / 2];
      const shuffled = shuffleChoices(question, () => draws.shift());
      permutations.add(shuffled.choiceOrder.join(','));
      assert.equal(shuffled.c[shuffled.a], question.c[question.a]);
      for (let displayed = 0; displayed < 4; displayed++) {
        const original = question.c.indexOf(shuffled.c[displayed]);
        assert.equal(translatedChoice(shuffled, translation, displayed), translation.c[original]);
      }
      assert.equal(translatedChoice(shuffled, translation, shuffled.a), translation.c[question.a]);
    }
    assert.equal(permutations.size, 24);
    assert.equal(JSON.stringify(question), before);
  }
});

test('translation mapping also survives a second shuffle and unshuffled listening', () => {
  const question = questions[0];
  const translation = { c: ['A', 'B', 'C', 'D'] };
  assert.equal(translatedChoice(question, translation, question.a), translation.c[question.a]);
  const twice = shuffleChoices(shuffleChoices(question, () => 0.25), () => 0.5);
  for (let i = 0; i < 4; i++) {
    assert.equal(translatedChoice(twice, translation, i), translation.c[question.c.indexOf(twice.c[i])]);
  }
  assert.equal(translatedChoice(question, null, 0), undefined);
});

test('the dated audit matches the corrected questions without changing their themes or positions', () => {
  const audit = JSON.parse(readFileSync(new URL('../docs/question-audit-2026-10-07.json', import.meta.url), 'utf8'));
  assert.equal(audit.reviewedQuestions, questions.length);
  assert.equal(audit.changedQuestions, audit.changes.length);
  assert.equal(new Set(audit.changes.map(change => change.number)).size, audit.changedQuestions);
  for (const change of audit.changes) {
    assert.deepEqual(questions[change.number - 1], change.after, `Question ${change.number}`);
    assert.equal(change.before.theme, change.after.theme);
    assert.ok(change.reason);
    assert.notDeepEqual(change.before, change.after);
  }
});
