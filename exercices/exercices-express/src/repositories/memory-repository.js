// Dépôt générique en mémoire, réutilisé par chaque ressource.
export function createMemoryRepository() {
  const items = new Map();
  let nextId = 1;

  return {
    list({ filter = () => true, page = 1, limit = 10 } = {}) {
      const matching = [...items.values()].filter(filter);
      const start = (page - 1) * limit;
      return { items: matching.slice(start, start + limit), total: matching.length };
    },

    findById(id) {
      return items.get(id) ?? null;
    },

    create(data) {
      const item = { id: nextId++, ...data, createdAt: new Date().toISOString() };
      items.set(item.id, item);
      return item;
    },

    update(id, changes) {
      const current = items.get(id);
      if (!current) return null;
      const updated = { ...current, ...changes };
      items.set(id, updated);
      return updated;
    },

    remove(id) {
      return items.delete(id);
    },
  };
}
