import React, { createContext, useContext, useState } from 'react';
import { PRODUCTOS, REPARTIDORES_INICIALES } from '../data/mockData';

const MercadoContext = createContext();

export const MercadoProvider = ({ children }) => {
  const [currentRole, setCurrentRole] = useState('cliente'); // 'cliente' | 'recolector' | 'despachador' | 'admin'
  const [cart, setCart] = useState([]);
  const [tipAmount, setTipAmount] = useState(1.00); // Default tip $1.00
  const [paymentMethod, setPaymentMethod] = useState('transfer365');
  const [customerAddress, setCustomerAddress] = useState('Colonia Layco, Pasaje 2, Casa #14, San Salvador');
  
  // Drivers registry
  const [repartidores, setRepartidores] = useState(REPARTIDORES_INICIALES);

  // Active tracking order ID for live customer map tracking
  const [activeTrackingOrderId, setActiveTrackingOrderId] = useState('MSM-1001');

  // Initial demo order with rich details
  const [orders, setOrders] = useState([
    {
      id: 'MSM-1001',
      date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'En Camino', // 'Pago Confirmado' | 'En Recolección' | 'En Centro Acopio' | 'En Camino' | 'Entregado'
      paymentMethod: 'Transfer365 Móvil',
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
        },
        {
          id: 'prod-6',
          name: 'Aguacate Criollo de Ahuachapán',
          puestoName: 'Frutería El Carmen',
          pasillo: 'Pasillo 1, Puesto #05',
          price: 1.25,
          quantity: 2,
          collected: true
        }
      ],
      subtotal: 10.40,
      deliveryFee: 1.75,
      tip: 1.50,
      tipCollector: 0.75,
      tipDispatcher: 0.75,
      total: 13.65,
      collectorId: 'rec-01',
      collectorName: 'Chepe Gómez (Runner Mercado)',
      dispatcherId: 'desp-01',
      dispatcherName: 'Kevin Rivera',
      dispatcherVehicle: 'Motocicleta Honda Cargo 150 - Placa M-492102',
      dispatcherPhone: '7822-4455',
      dispatcherTipo: 'moto',
      etaMinutes: 12
    }
  ]);

  // Register new driver/repartidor
  const registrarRepartidor = (nuevo) => {
    const nuevoRep = {
      id: `desp-${Math.floor(100 + Math.random() * 900)}`,
      nombre: nuevo.nombre,
      telefono: nuevo.telefono,
      tipoTransporte: nuevo.tipoTransporte, // 'apie' | 'bicicleta' | 'moto' | 'carro'
      vehiculo: nuevo.vehiculo || 'Sin vehículo registrado',
      estado: 'Disponible',
      entregasRealizadas: 0,
      rating: 5.0,
      foto: nuevo.foto || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'
    };
    setRepartidores((prev) => [nuevoRep, ...prev]);
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

  // Calculate cart totals
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const deliveryFee = subtotal > 0 ? 1.75 : 0;
  const tipCollector = Number((tipAmount / 2).toFixed(2));
  const tipDispatcher = Number((tipAmount - tipCollector).toFixed(2));
  const grandTotal = subtotal + deliveryFee + tipAmount;

  // Create new Order
  const createOrder = () => {
    if (cart.length === 0) return null;

    // Pick first available moto or car driver for demo assignment
    const assignedDriver = repartidores.find(r => r.tipoTransporte === 'moto') || repartidores[0];

    const newOrder = {
      id: `MSM-${Math.floor(1000 + Math.random() * 9000)}`,
      date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'En Recolección',
      paymentMethod: paymentMethod === 'transfer365' ? 'Transfer365 Móvil' : paymentMethod === 'chivo' ? 'Chivo Wallet' : 'Cubo Pago',
      address: customerAddress,
      customerName: 'Cliente San Miguelito',
      phone: '7700-9900',
      items: cart.map(item => ({ ...item, collected: false })),
      subtotal: Number(subtotal.toFixed(2)),
      deliveryFee,
      tip: tipAmount,
      tipCollector,
      tipDispatcher,
      total: Number(grandTotal.toFixed(2)),
      collectorId: 'rec-01',
      collectorName: 'Chepe Gómez (Runner Mercado)',
      dispatcherId: assignedDriver ? assignedDriver.id : 'desp-01',
      dispatcherName: assignedDriver ? assignedDriver.nombre : 'Kevin Rivera',
      dispatcherVehicle: assignedDriver ? assignedDriver.vehiculo : 'Motocicleta Honda Cargo 150',
      dispatcherPhone: assignedDriver ? assignedDriver.telefono : '7822-4455',
      dispatcherTipo: assignedDriver ? assignedDriver.tipoTransporte : 'moto',
      etaMinutes: 15
    };

    setOrders((prev) => [newOrder, ...prev]);
    setActiveTrackingOrderId(newOrder.id);
    clearCart();
    return newOrder;
  };

  // Collector actions
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
            status: allCollected ? 'En Centro Acopio' : 'En Recolección'
          };
        }
        return order;
      })
    );
  };

  // Status transitions
  const updateOrderStatus = (orderId, newStatus) => {
    setOrders((prev) =>
      prev.map((order) => (order.id === orderId ? { ...order, status: newStatus } : order))
    );
  };

  return (
    <MercadoContext.Provider
      value={{
        currentRole,
        setCurrentRole,
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
        subtotal,
        deliveryFee,
        tipCollector,
        tipDispatcher,
        grandTotal,
        orders,
        createOrder,
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
