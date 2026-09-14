import { PRODUCTOS as MOCK_PRODUCTS, REPARTIDORES_INICIALES as MOCK_DRIVERS } from '../data/mockData';

const STORAGE_KEYS = {
  PRODUCTS: 'msm_products_v1',
  ORDERS: 'msm_orders_v1',
  DRIVERS: 'msm_drivers_v1',
  CONFIG: 'msm_api_config_v1'
};

/**
 * Service adapter for real data persistence & API integration
 */
export const apiService = {
  // Get API Config (Base URL, Endpoint Auth Token)
  getApiConfig() {
    const saved = localStorage.getItem(STORAGE_KEYS.CONFIG);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // fallback
      }
    }
    return {
      baseUrl: import.meta.env.VITE_API_BASE_URL || '',
      apiKey: import.meta.env.VITE_API_KEY || '',
      mode: 'hybrid' // 'hybrid' (LocalStorage + Optional API) | 'api_only'
    };
  },

  setApiConfig(config) {
    localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(config));
  },

  // --- PRODUCTS MANAGEMENT ---
  getProducts() {
    const saved = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.error('Error reading saved products:', e);
      }
    }
    // Default initial mock products
    return MOCK_PRODUCTS;
  },

  saveProduct(product) {
    const current = this.getProducts();
    let updated;
    const existsIndex = current.findIndex(p => p.id === product.id);

    if (existsIndex >= 0) {
      updated = [...current];
      updated[existsIndex] = { ...updated[existsIndex], ...product, updatedAt: new Date().toISOString() };
    } else {
      const newProduct = {
        ...product,
        id: product.id || `prod-real-${Date.now()}`,
        createdAt: new Date().toISOString()
      };
      updated = [newProduct, ...current];
    }

    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(updated));
    return updated;
  },

  deleteProduct(productId) {
    const current = this.getProducts();
    const updated = current.filter(p => p.id !== productId);
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(updated));
    return updated;
  },

  // --- DRIVERS / MOTORISTAS MANAGEMENT ---
  getDrivers() {
    const saved = localStorage.getItem(STORAGE_KEYS.DRIVERS);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.error('Error reading saved drivers:', e);
      }
    }
    return MOCK_DRIVERS;
  },

  saveDriver(driver) {
    const current = this.getDrivers();
    const newDriver = {
      ...driver,
      id: driver.id || `desp-${Math.floor(100 + Math.random() * 900)}`,
      createdAt: new Date().toISOString()
    };
    const updated = [newDriver, ...current];
    localStorage.setItem(STORAGE_KEYS.DRIVERS, JSON.stringify(updated));
    return updated;
  },

  // --- ORDERS MANAGEMENT ---
  getOrders() {
    const saved = localStorage.getItem(STORAGE_KEYS.ORDERS);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Error reading saved orders:', e);
      }
    }
    return [];
  },

  saveOrder(order) {
    const current = this.getOrders();
    const updated = [order, ...current];
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(updated));
    return updated;
  },

  updateOrdersList(ordersList) {
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(ordersList));
  },

  // --- EXPORT & IMPORT DATA JSON ---
  exportAllData() {
    const data = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      products: this.getProducts(),
      drivers: this.getDrivers(),
      orders: this.getOrders(),
      config: this.getApiConfig()
    };
    return JSON.stringify(data, null, 2);
  },

  importAllData(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed.products && Array.isArray(parsed.products)) {
        localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(parsed.products));
      }
      if (parsed.drivers && Array.isArray(parsed.drivers)) {
        localStorage.setItem(STORAGE_KEYS.DRIVERS, JSON.stringify(parsed.drivers));
      }
      if (parsed.orders && Array.isArray(parsed.orders)) {
        localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(parsed.orders));
      }
      return { success: true, message: 'Datos importados correctamente.' };
    } catch (e) {
      return { success: false, message: `Error al importar JSON: ${e.message}` };
    }
  }
};
