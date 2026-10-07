import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

async function loadTypeScript(path) {
  const source = await readFile(new URL(path, import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
  });
  return import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
}

const { filterAndSortMeals } = await loadTypeScript('../src/utils/mealList.ts');
const { sampleMeals } = await loadTypeScript('../src/data/sampleMeals.ts');
const original = JSON.stringify(sampleMeals);

assert.equal(filterAndSortMeals(sampleMeals, '  PASTA  ', 'strMeal', 'ascending').length, 1);
assert.equal(filterAndSortMeals(sampleMeals, 'no-such-recipe', 'strMeal', 'ascending').length, 0);
assert.equal(filterAndSortMeals(sampleMeals, '', 'strMeal', 'ascending').length, sampleMeals.length);

for (const property of ['strMeal', 'strCategory', 'strArea']) {
  const ascending = filterAndSortMeals(sampleMeals, '', property, 'ascending');
  const descending = filterAndSortMeals(sampleMeals, '', property, 'descending');
  assert.deepEqual(descending.map((meal) => meal.idMeal), ascending.map((meal) => meal.idMeal).reverse());
  for (let index = 1; index < ascending.length; index++) {
    assert.ok(ascending[index - 1][property].localeCompare(ascending[index][property], 'en', {
      sensitivity: 'base', numeric: true,
    }) <= 0);
  }
}
assert.equal(JSON.stringify(sampleMeals), original, 'Sorting must not mutate shared recipe data');
console.log('Passed: name filtering, no matches, three sort properties in both directions, and data immutability.');

// Stub only the HTTP boundary to check the real service's fallback and cache behavior.
const serviceSource = await readFile(new URL('../src/services/mealApi.ts', import.meta.url), 'utf8');
const compiledService = ts.transpileModule(serviceSource, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
}).outputText
  .replace(/import axios from 'axios';/, 'const axios = { create: () => ({ get: (...args) => globalThis.mealTestRequest(...args) }) };')
  .replace(/import \{ sampleMeals \} from '\.\.\/data\/sampleMeals';/, `const sampleMeals = ${JSON.stringify(sampleMeals)};`);
const service = await import(`data:text/javascript;base64,${Buffer.from(compiledService).toString('base64')}`);

globalThis.mealTestRequest = async () => { throw new Error('Network unavailable'); };
assert.equal((await service.loadMealCollection()).source, 'sample');
assert.equal((await service.loadMealCollection()).meals.length, sampleMeals.length);
globalThis.mealTestRequest = async () => ({ data: '<html>service unavailable</html>' });
assert.equal((await service.loadMealCollection()).source, 'sample');
globalThis.mealTestRequest = async () => ({ data: { meals: [] } });
assert.equal((await service.loadMealCollection()).source, 'sample');
let calls = 0;
globalThis.mealTestRequest = async () => {
  calls++;
  return { data: { meals: [sampleMeals[0]] } };
};
assert.equal((await service.loadMealCollection()).source, 'api');
assert.equal((await service.loadMealCollection()).source, 'api');
assert.equal(calls, 1, 'Successful collection should be cached');
const normalized = service.normalizeMealsResponse({ meals: [{
  idMeal: 'null-fields', strMeal: 'Null Fields', strArea: null, strCategory: null,
  strMealThumb: null, strInstructions: null,
}] });
assert.equal(normalized[0].strArea, 'Not specified');
assert.equal(normalized[0].strInstructions, '');
assert.doesNotThrow(() => filterAndSortMeals([...sampleMeals, ...normalized], '', 'strArea', 'ascending'));
assert.doesNotThrow(() => filterAndSortMeals([...sampleMeals, ...normalized], '', 'strCategory', 'descending'));
assert.throws(() => service.normalizeMealsResponse({ meals: [{ idMeal: 1 }] }));
let letterCalls = 0;
globalThis.mealTestRequest = async (endpoint, config) => {
  letterCalls++;
  assert.equal(endpoint, 'search.php');
  assert.deepEqual(config.params, { f: 'c' });
  return { data: { meals: Array.from({ length: 30 }, (_, index) => ({
    ...sampleMeals[2], idMeal: `chicken-${index}`, strMeal: `Chicken ${index}`,
  })) } };
};
assert.deepEqual((await service.loadMealsByFirstLetter('')).meals, []);
assert.deepEqual((await service.loadMealsByFirstLetter(' ')).meals, []);
assert.deepEqual((await service.loadMealsByFirstLetter('1')).meals, []);
assert.equal(letterCalls, 0, 'Empty and unsupported searches must not request data');
const [letterResult, sameLetterResult] = await Promise.all([
  service.loadMealsByFirstLetter('c'), service.loadMealsByFirstLetter('C'),
]);
assert.equal(letterCalls, 1, 'Same letter shares one request');
assert.equal(letterResult.meals.length, 30, 'Letter results must not be truncated to 25');
assert.deepEqual(letterResult, sameLetterResult);
assert.equal(filterAndSortMeals(letterResult.meals, 'Chicken 2', 'strMeal', 'ascending').length, 11);
await service.loadMealsByFirstLetter('c');
assert.equal(letterCalls, 1, 'Cached letter must not request again');
globalThis.mealTestRequest = async () => ({ data: { meals: null } });
assert.deepEqual(await service.loadMealsByFirstLetter('z'), { meals: [], source: 'api' });
globalThis.mealTestRequest = async () => { throw new Error('Offline'); };
const failedLetter = await service.loadMealsByFirstLetter('t');
assert.equal(failedLetter.source, 'sample');
assert.ok(failedLetter.meals.length > 0);
assert.ok(failedLetter.meals.every((meal) => meal.strMeal.toLowerCase().startsWith('t')));
globalThis.mealTestRequest = async () => ({ data: { meals: [sampleMeals[0]] } });
assert.equal((await service.loadMealsByFirstLetter('t')).source, 'api', 'Failed letters allow retry');
console.log('Passed: no empty requests, first-letter parameters, caching, complete result handling, local filtering and offline retry.');
delete globalThis.mealTestRequest;
console.log('Passed: network failure, malformed response, empty collection, recovery and request caching.');

const { getIngredients, filterByCategories, getNeighbors, readNavigation, safeExternalUrl } =
  await loadTypeScript('../src/utils/mealDetails.ts');
assert.equal(filterByCategories(sampleMeals, []).length, sampleMeals.length);
assert.ok(filterByCategories(sampleMeals, ['Vegetarian']).every((meal) => meal.strCategory === 'Vegetarian'));
assert.equal(filterByCategories(sampleMeals, ['Pasta', 'Chicken']).length, 2);
assert.equal(filterByCategories(sampleMeals, ['Nonexistent']).length, 0);
assert.deepEqual(getIngredients({ ...sampleMeals[0], strIngredient1: ' Rice ', strMeasure1: ' 100 g ',
  strIngredient2: ' ', strIngredient3: null, strIngredient4: '', strIngredient20: 'Salt', strMeasure20: null }),
  [{ name: 'Rice', measure: '100 g' }, { name: 'Salt', measure: '' }]);
assert.deepEqual(getNeighbors(['a', 'b', 'c'], 'a'), { previous: 'c', next: 'b', position: 1, total: 3 });
assert.equal(getNeighbors(['a', 'b', 'c'], 'c').next, 'a');
assert.equal(getNeighbors(['a'], 'a').previous, 'a');
assert.equal(getNeighbors([], 'a'), null);
assert.equal(getNeighbors(['a'], 'missing'), null);
assert.equal(readNavigation({ ids: [123], backTo: '/search' }), null);
assert.deepEqual(readNavigation({ ids: ['a'], backTo: '/gallery' }), { ids: ['a'], backTo: '/gallery' });
assert.equal(safeExternalUrl('javascript:alert(1)'), null);
assert.equal(safeExternalUrl('https://example.com/recipe'), 'https://example.com/recipe');
console.log('Passed: category filters, ingredient extraction, circular navigation, route state and external links.');

let galleryCalls = 0;
globalThis.mealTestRequest = async (endpoint, config) => {
  galleryCalls++;
  assert.equal(endpoint, 'filter.php');
  const category = config.params.c;
  return { data: { meals: [{ idMeal: `meal-${category}`, strMeal: `${category} recipe`, strMealThumb: 'https://example.com/meal.jpg' },
    { idMeal: 'shared-meal', strMeal: 'Shared recipe', strMealThumb: '' }] } };
};
assert.deepEqual(await service.loadGalleryMeals([]), { meals: [], source: 'api' });
assert.equal(galleryCalls, 0, 'No categories must not request meals');
const beef = await service.loadGalleryMeals(['Beef']);
assert.equal(beef.meals.length, 2);
assert.equal(beef.meals[0].strCategory, 'Beef');
assert.equal('strInstructions' in beef.meals[0], false, 'Gallery summaries must not pretend to contain detail data');
const combined = await service.loadGalleryMeals(['Beef', 'Seafood', 'Beef']);
assert.equal(combined.meals.length, 3, 'Multiple categories merge and deduplicate IDs');
assert.equal(galleryCalls, 2, 'Previously loaded categories use cache');
await service.loadGalleryMeals(['Seafood']);
assert.equal(galleryCalls, 2);
globalThis.mealTestRequest = async () => { throw new Error('Offline'); };
assert.equal((await service.loadGalleryMeals(['Pasta'])).source, 'sample');
assert.ok((await service.loadGalleryMeals(['Pasta'])).meals.every((meal) => meal.strCategory === 'Pasta'));
const fallbackOptions = await service.loadCategories();
assert.equal(fallbackOptions.source, 'sample');
assert.equal(fallbackOptions.categories[0], 'Beef');
globalThis.mealTestRequest = async (endpoint, config) => {
  if (endpoint === 'list.php') {
    assert.deepEqual(config.params, { c: 'list' });
    return { data: { meals: [{ strCategory: 'Seafood' }, { strCategory: 'Beef' }, { strCategory: 'Pasta' }] } };
  }
  return { data: { meals: null } };
};
assert.equal((await service.loadGalleryMeals(['Pasta'])).source, 'api', 'Failed category can recover');
assert.deepEqual((await service.loadCategories()).categories, ['Beef', 'Pasta', 'Seafood']);
assert.deepEqual(await service.loadGalleryMeals(['Vegan']), { meals: [], source: 'api' });
delete globalThis.mealTestRequest;
console.log('Passed: empty gallery makes no requests, category summaries, multi-select union, ID deduplication, cache and offline recovery.');
