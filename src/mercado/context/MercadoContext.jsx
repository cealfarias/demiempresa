import React, { createContext, useContext, useState, useEffect } from 'react';
import { MERCADOS_DISPONIBLES } from '../data/mockData';
import { apiService } from '../services/apiService';

const MercadoContext = createContext();

export const MercadoProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('msm_user_session');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return null;
  });

  const [currentRole, setCurrentRole] = useState(() => {
    const saved = localStorage.getItem('msm_user_session');
    if (saved) {
      try {
        const u = JSON.parse(saved);
        if (u.role) return u.role;
      } catch (e) {}
    }
    return 'cliente';
  });

  const loginUser = (userData) => {
    const userObj = {
      id: userData.id || `usr-${Date.now()}`,
      name: userData.name || (userData.email ? userData.email.split('@')[0] : 'Usuario'),
      email: userData.email || '',
      role: userData.role || 'cliente',
      phone: userData.phone || '',
      provider: userData.provider || 'email',
      loggedInAt: new Date().toISOString()
    };
    setCurrentUser(userObj);
    setCurrentRole(userObj.role);
    if (userObj.name) setCustomerName(userObj.name);
    if (userObj.phone) setCustomerPhone(userObj.phone);
    localStorage.setItem('msm_user_session', JSON.stringify(userObj));
    return userObj;
  };

  const registerUser = (userData) => {
    return loginUser(userData);
  };

  const logoutUser = () => {
    setCurrentUser(null);
    setCurrentRole('cliente');
    localStorage.removeItem('msm_user_session');
  };

  const [selectedMarket, setSelectedMarket] = useState('sanmiguelito');
  const [deliveryType, setDeliveryType] = useState('domicilio'); // 'domicilio' | 'pickup'
  const [cart, setCart] = useState([]);
  const [tipAmount, setTipAmount] = useState(1.00); // Default tip $1.00
  const [paymentMethod, setPaymentMethod] = useState('transfer365');
  const [customerAddress, setCustomerAddress] = useState('Colonia Layco, Pasaje 2, Casa #14, San Salvador');
  const [customerName, setCustomerName] = useState(currentUser?.name || 'Cliente San Miguelito');
  const [customerPhone, setCustomerPhone] = useState(currentUser?.phone || '7700-9900');
  const [paymentTxRef, setPaymentTxRef] = useState('');

  // Products state backed by apiService (real data persistence)
  const [products, setProducts] = useState(() => apiService.getProducts());

  const addProduct = (newProd) => {
    const updated = apiService.saveProduct(newProd);
    setProducts(updated);
  };

  const updateProduct = (prod) => {
    const updated = apiService.saveProduct(prod);
    setProducts(updated);
  };

  const deleteProduct = (prodId) => {
    const updated = apiService.deleteProduct(prodId);
    setProducts(updated);
  };

  const refreshDataFromService = () => {
    setProducts(apiService.getProducts());
    setRepartidores(apiService.getDrivers());
    setOrders(apiService.getOrders());
  };
  
  // Theme state: 'light' (día/blanco) | 'dark' (noche)
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('msm_theme') || 'light';
  });

  const toggleTheme = () => {
    setTheme((prev) => {
      const nextTheme = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('msm_theme', nextTheme);
      return nextTheme;
    });
  };

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
  }, [theme]);

  // Drivers registry backed by apiService
  const [repartidores, setRepartidores] = useState(() => apiService.getDrivers());

  // Active tracking order ID for live customer map tracking
  const [activeTrackingOrderId, setActiveTrackingOrderId] = useState('MSM-1001');

  // Initial orders backed by apiService
  const [orders, setOrders] = useState(() => {
    const savedOrders = apiService.getOrders();
    if (savedOrders && savedOrders.length > 0) return savedOrders;
    // Default initial demo order
    const defaultInitial = [
      {
        id: 'MSM-1001',
        date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'En Camino',
        paymentMethod: 'Transfer365 Móvil (Davivienda 6989-3101)',
        paymentTxRef: 'REF-DAV-982104',
        deliveryType: 'domicilio',
        qrCode: 'QR-MSM-1001-XYZ',
        address: 'Colonia Médica, Calle Juan Pablo II #402, San Salvador',
        customerName: 'María Elena Ramos',
        phone: '7854-1122',
        items: [
          {
            id: 'prod-1',
            name: 'Pupusa de Queso con Loroco',
            puestoName: 'Pupusería Doña Chilo',
            pasillo: 'Pasillo 3, Puesto #42',
            price: 0.85,
            quantity: 4,
            collected: true
          },
          {
            id: 'prod-4',
            name: 'Sopa de Gallina India con Arroz',
            puestoName: 'Sopas y Comedero El Güero',
            pasillo: 'Pasillo 2, Puesto #18',
            price: 4.50,
            quantity: 1,
            collected: true
          }
        ],
        subtotal: 7.90,
        appCommission: 0.79, // 10% App Commission
        deliveryFee: 1.75,
        tip: 1.50,
        tipCollector: 0.75,
        tipDispatcher: 0.75,
        total: 11.94,
        collectorId: 'rec-01',
        collectorName: 'Chepe Gómez (Runner)',
        dispatcherId: 'desp-01',
        dispatcherName: 'Kevin Rivera',
        dispatcherVehicle: 'Motocicleta Honda Cargo 150 - Placa M-492102',
        dispatcherPhone: '7822-4455',
        dispatcherTipo: 'moto',
        etaMinutes: 12,
        incidents: []
      }
    ];
    apiService.updateOrdersList(defaultInitial);
    return defaultInitial;
  });

  // Keep apiService in sync whenever orders update
  useEffect(() => {
    apiService.updateOrdersList(orders);
  }, [orders]);

  // Register new driver/repartidor
  const registrarRepartidor = (nuevo) => {
    const nuevoRep = {
      id: `desp-${Math.floor(100 + Math.random() * 900)}`,
      nombre: nuevo.nombre,
      telefono: nuevo.telefono,
      tipoTransporte: nuevo.tipoTransporte,
      vehiculo: nuevo.vehiculo || 'Sin vehículo registrado',
      estado: 'Disponible',
      entregasRealizadas: 0,
      rating: 5.0,
      foto: nuevo.foto || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'
    };
    const updated = apiService.saveDriver(nuevoRep);
    setRepartidores(updated);
    return nuevoRep;
  };

  // Cart operations
  const addToCart = (product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId, delta) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id === productId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean)
    );
  };

  const removeFromCart = (productId) => {
    setCart((prev) => prev.filter((item) => item.id !== productId));
  };

  const clearCart = () => setCart([]);

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const appCommission = Number((subtotal * 0.10).toFixed(2));
  const deliveryFee = deliveryType === 'domicilio' ? (subtotal > 0 ? 1.75 : 0) : 0;
  const tipCollector = Number((tipAmount / 2).toFixed(2));
  const tipDispatcher = Number((tipAmount - tipCollector).toFixed(2));
  const grandTotal = subtotal + appCommission + deliveryFee + tipAmount;

  const createOrder = (customClientInfo = {}) => {
    if (cart.length === 0) return null;

    const assignedDriver = repartidores.find(r => r.tipoTransporte === 'moto') || repartidores[0];
    const newOrderId = `MSM-${Math.floor(1000 + Math.random() * 9000)}`;

    const newOrder = {
      id: newOrderId,
      date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      createdAtTimestamp: Date.now(),
      status: 'Pago Confirmado',
      paymentMethod: paymentMethod === 'transfer365' 
        ? 'Transfer365 Móvil (Davivienda 6989-3101)' 
        : paymentMethod === 'chivo' ? 'Chivo Wallet' 
        : paymentMethod === 'cubo' ? 'El Cubo (Tarjetas)' : 'Efectivo contra entrega',
      paymentTxRef: customClientInfo.paymentTxRef || paymentTxRef || `TX-${Date.now().toString().slice(-6)}`,
      deliveryType,
      qrCode: `QR-${newOrderId}`,
      address: deliveryType === 'domicilio' ? (customClientInfo.address || customerAddress) : 'Retiro en Punto Acopio Mercado San Miguelito (Pickup)',
      customerName: customClientInfo.name || customerName || 'Cliente San Miguelito',
      phone: customClientInfo.phone || customerPhone || '7700-9900',
      items: cart.map(item => ({ ...item, collected: false })),
      subtotal: Number(subtotal.toFixed(2)),
      appCommission,
      deliveryFee,
      tip: tipAmount,
      tipCollector,
      tipDispatcher,
      total: Number(grandTotal.toFixed(2)),
      collectorId: 'rec-01',
      collectorName: 'Chepe Gómez (Runner)',
      dispatcherId: assignedDriver ? assignedDriver.id : 'desp-01',
      dispatcherName: assignedDriver ? assignedDriver.nombre : 'Kevin Rivera',
      dispatcherVehicle: assignedDriver ? assignedDriver.vehiculo : 'Motocicleta Honda Cargo 150',
      dispatcherPhone: assignedDriver ? assignedDriver.telefono : '7822-4455',
      dispatcherTipo: assignedDriver ? assignedDriver.tipoTransporte : 'moto',
      etaMinutes: deliveryType === 'domicilio' ? 15 : 0,
      incidents: []
    };

    setOrders((prev) => [newOrder, ...prev]);
    setActiveTrackingOrderId(newOrder.id);
    clearCart();
    return newOrder;
  };

  const cancelOrder = (orderId) => {
    setOrders((prev) =>
      prev.map((order) => {
        if (order.id === orderId) {
          const canCancel = order.status === 'Pago Confirmado' || order.status === 'En Recolección';
          if (!canCancel) return order;

          const penaltyFee = Number((order.total * 0.20).toFixed(2));
          const refundAmount = Number((order.total * 0.80).toFixed(2));

          return {
            ...order,
            status: 'Cancelado',
            cancellationPenalty: penaltyFee,
            refundAmount: refundAmount,
            cancelledAt: new Date().toLocaleTimeString()
          };
        }
        return order;
      })
    );
  };

  const reportIncident = (orderId, note) => {
    setOrders((prev) =>
      prev.map((order) => {
        if (order.id === orderId) {
          const newIncident = {
            id: `INC-${Date.now()}`,
            timestamp: new Date().toLocaleTimeString(),
            note,
            status: 'Atendiendo por Supervisor'
          };
          return {
            ...order,
            incidents: [...(order.incidents || []), newIncident]
          };
        }
        return order;
      })
    );
  };

  const toggleItemCollected = (orderId, productId) => {
    setOrders((prev) =>
      prev.map((order) => {
        if (order.id === orderId) {
          const updatedItems = order.items.map((item) =>
            item.id === productId ? { ...item, collected: !item.collected } : item
          );
          const allCollected = updatedItems.every((item) => item.collected);
          return {
            ...order,
            items: updatedItems,
            status: allCollected ? (order.deliveryType === 'pickup' ? 'Listo en Acopio (Pickup)' : 'En Centro Acopio') : 'En Recolección'
          };
        }
        return order;
      })
    );
  };

  const updateOrderStatus = (orderId, newStatus) => {
    setOrders((prev) =>
      prev.map((order) => (order.id === orderId ? { ...order, status: newStatus } : order))
    );
  };

  return (
    <MercadoContext.Provider
      value={{
        theme,
        toggleTheme,
        currentUser,
        loginUser,
        registerUser,
        logoutUser,
        currentRole,
        setCurrentRole,
        selectedMarket,
        setSelectedMarket,
        deliveryType,
        setDeliveryType,
        products,
        addProduct,
        updateProduct,
        deleteProduct,
        refreshDataFromService,
        cart,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        tipAmount,
        setTipAmount,
        paymentMethod,
        setPaymentMethod,
        customerAddress,
        setCustomerAddress,
        customerName,
        setCustomerName,
        customerPhone,
        setCustomerPhone,
        paymentTxRef,
        setPaymentTxRef,
        subtotal,
        appCommission,
        deliveryFee,
        tipCollector,
        tipDispatcher,
        grandTotal,
        orders,
        createOrder,
        cancelOrder,
        reportIncident,
        toggleItemCollected,
        updateOrderStatus,
        repartidores,
        registrarRepartidor,
        activeTrackingOrderId,
        setActiveTrackingOrderId
      }}
    >
      {children}
    </MercadoContext.Provider>
  );
};

export const useMercado = () => useContext(MercadoContext);
