import { createStorePopupContent } from '@/lib/store-map-popup';

describe('createStorePopupContent', () => {
  it('muestra nombre y categoría como texto literal', () => {
    const content = createStorePopupContent({
      name: 'Huellitas <b>Pet</b> & Co',
      category: { name: '<i>Veterinaria</i>' },
      featured: false,
    });

    expect(content.querySelector('b')).toBeNull();
    expect(content.querySelector('i')).toBeNull();
    expect(content.querySelector('strong')?.textContent).toBe('Huellitas <b>Pet</b> & Co');
    expect(content.textContent).toBe('Huellitas <b>Pet</b> & Co<i>Veterinaria</i>');
  });

  it('agrega la marca de destacado en una línea aparte', () => {
    const content = createStorePopupContent({
      name: 'Plaza Canina',
      category: { name: 'Plazas' },
      featured: true,
    });

    expect(content.querySelectorAll('br')).toHaveLength(2);
    expect(content.textContent).toBe('Plaza CaninaPlazasDestacado');
  });
});
