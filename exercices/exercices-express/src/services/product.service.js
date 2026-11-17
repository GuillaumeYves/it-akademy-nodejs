import { conflict, notFound } from "../errors.js";

// Mise en forme commune des listes paginées.
export function toPage({ items, total }, { page, limite }) {
  return { donnees: items, page, limite, total, pages: Math.ceil(total / limite) };
}

// Règles métier des produits et de leurs avis, indépendantes d'Express.
export function createProductService({ products, reviews }) {
  function getOrFail(id) {
    const product = products.findById(id);
    if (!product) throw notFound("Produit introuvable");
    return product;
  }

  return {
    getOrFail,

    list({ page, limite, categorie }) {
      const filter = categorie ? (product) => product.categorie === categorie : undefined;
      return toPage(products.list({ filter, page, limit: limite }), { page, limite });
    },

    create: (data) => products.create(data),

    update(id, changes) {
      getOrFail(id);
      return products.update(id, changes);
    },

    remove(id) {
      const product = getOrFail(id);
      if (product.stock !== 0) throw conflict("Impossible de supprimer un produit encore en stock");
      products.remove(id);
    },

    attachImage: (id, url) => products.update(id, { image: url }),

    listReviews(productId, pagination) {
      const filter = (review) => review.produitId === productId;
      return toPage(reviews.list({ filter, page: pagination.page, limit: pagination.limite }), pagination);
    },

    addReview: (productId, data) => reviews.create({ produitId: productId, ...data }),
  };
}
