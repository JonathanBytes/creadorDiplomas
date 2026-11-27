import test from 'node:test';
import assert from 'node:assert/strict';

import { DESCRIPTION_LAYER, NAME_LAYER, createDefaultLayers, resolveLayerFont } from './layers.js';

const NAME_FONT = { name: 'Montserrat.ttf' };
const DESCRIPTION_FONT = { name: 'Serif.otf' };

test('a layer with its own upload uses it', () => {
  const layers = createDefaultLayers();
  layers[NAME_LAYER].customFont = NAME_FONT;

  assert.deepEqual(resolveLayerFont(layers, NAME_LAYER), { file: NAME_FONT, source: 'own' });
});

test('a description without its own upload inherits the name font', () => {
  const layers = createDefaultLayers();
  layers[NAME_LAYER].customFont = NAME_FONT;

  assert.deepEqual(resolveLayerFont(layers, DESCRIPTION_LAYER), { file: NAME_FONT, source: 'inherited' });
});

test('a description with its own upload ignores the name font', () => {
  const layers = createDefaultLayers();
  layers[NAME_LAYER].customFont = NAME_FONT;
  layers[DESCRIPTION_LAYER].customFont = DESCRIPTION_FONT;

  assert.deepEqual(resolveLayerFont(layers, DESCRIPTION_LAYER), { file: DESCRIPTION_FONT, source: 'own' });
});

test('with no uploads, both layers fall back to the default font', () => {
  const layers = createDefaultLayers();

  assert.deepEqual(resolveLayerFont(layers, NAME_LAYER), { file: null, source: 'default' });
  assert.deepEqual(resolveLayerFont(layers, DESCRIPTION_LAYER), { file: null, source: 'default' });
});
