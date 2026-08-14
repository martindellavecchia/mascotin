import {
  INTENT_LABELS,
  TEMPERAMENT_LABELS,
} from '@/components/pets/CompatibilityFields';

describe('passport labels', () => {
  it('maps temperament and intent ids to Spanish', () => {
    expect(TEMPERAMENT_LABELS.sociable).toBe('Sociable');
    expect(TEMPERAMENT_LABELS.playful).toBe('Juguetón');
    expect(INTENT_LABELS.walk).toBe('Compañero de paseo');
    expect(INTENT_LABELS.sit).toBe('Cuidado temporal');
  });
});
