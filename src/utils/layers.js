export const NAME_LAYER = 'name';
export const DESCRIPTION_LAYER = 'description';
export const LAYER_KEYS = [NAME_LAYER, DESCRIPTION_LAYER];

export const LAYER_LABELS = {
  [NAME_LAYER]: 'Nombre',
  [DESCRIPTION_LAYER]: 'Descripción',
};

export function createDefaultLayers() {
  return {
    [NAME_LAYER]: {
      enabled: true,
      position: { x: 0.5, y: 0.45 },
      fontSize: 28,
      color: '#000000',
      customFont: null,
      isUnderline: false,
      underlineOffset: 5,
      underlineThickness: 2,
      margin: 40,
    },
    [DESCRIPTION_LAYER]: {
      enabled: false,
      position: { x: 0.5, y: 0.55 },
      fontSize: 16,
      color: '#000000',
      customFont: null,
      isUnderline: false,
      underlineOffset: 4,
      underlineThickness: 1,
      margin: 40,
    },
  };
}

export function updateLayer(layers, key, patch) {
  return {
    ...layers,
    [key]: { ...layers[key], ...patch },
  };
}

export function enabledLayers(layers) {
  return LAYER_KEYS.filter((key) => layers[key]?.enabled);
}
