interface StorePopupData {
  name: string;
  category: { name: string };
  featured: boolean;
}

export function createStorePopupContent(store: StorePopupData): HTMLElement {
  const content = document.createElement('div');
  const name = document.createElement('strong');
  name.textContent = store.name;
  content.append(name, document.createElement('br'), store.category.name);
  if (store.featured) {
    content.append(document.createElement('br'), 'Destacado');
  }
  return content;
}
