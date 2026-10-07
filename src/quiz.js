// Keep each displayed choice tied to its original translation when shuffling.
export function shuffleChoices(question, random = Math.random) {
  const indices = question.c.map((_, index) => index);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return {
    ...question,
    c: indices.map(index => question.c[index]),
    a: indices.indexOf(question.a),
    choiceOrder: indices.map(index => question.choiceOrder?.[index] ?? index),
  };
}

export function translatedChoice(question, translation, displayedIndex) {
  return translation?.c?.[question.choiceOrder?.[displayedIndex] ?? displayedIndex];
}
