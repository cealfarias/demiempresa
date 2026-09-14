import React, { createContext, useContext, useState, useEffect } from 'react';
import { PRODUCTOS, REPARTIDORES_INICIALES, MERCADOS_DISPONIBLES } from '../data/mockData';

const MercadoContext = createContext();

export const MercadoProvider = ({ children }) => {
  const [currentRole, setCurrentRole] = useState('cliente'); // 'cliente' | 'recolector' | 'despachador' | 'admin'
  const [selectedMarket, setSelectedMarket] = useState('sanmiguelito');
  const [deliveryType, setDeliveryType] = useState('domicilio'); // 'domicilio' | 'pickup'
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
      status: 'En Camino', // 'Pago Confirmado' | 'En Recolección' | 'En Centro Acopio' | 'En Camino' | 'Entregado' | 'Cancelado'
      paymentMethod: 'Transfer365 Móvil (Davivienda 6989-3101)',
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
  ]);

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

  // Calculate cart totals with 10% App Commission
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const appCommission = Number((subtotal * 0.10).toFixed(2)); // 10% App Commission
  const deliveryFee = deliveryType === 'domicilio' ? (subtotal > 0 ? 1.75 : 0) : 0;
  const tipCollector = Number((tipAmount / 2).toFixed(2));
  const tipDispatcher = Number((tipAmount - tipCollector).toFixed(2));
  const grandTotal = subtotal + appCommission + deliveryFee + tipAmount;

  // Create new Order
  const createOrder = () => {
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
      deliveryType,
      qrCode: `QR-${newOrderId}`,
      address: deliveryType === 'domicilio' ? customerAddress : 'Retiro en Punto Acopio Mercado San Miguelito (Pickup)',
      customerName: 'Cliente San Miguelito',
      phone: '7700-9900',
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

  // Cancel order logic with 20% admin fee
  const cancelOrder = (orderId) => {
    setOrders((prev) =>
      prev.map((order) => {
        if (order.id === orderId) {
          // Cancellation only allowed if runner hasn't collected items yet
          const canCancel = order.status === 'Pago Confirmado' || order.status === 'En Recolección';
          if (!canCancel) return order;

          const penaltyFee = Number((order.total * 0.20).toFixed(2)); // 20% Fee
          const refundAmount = Number((order.total * 0.80).toFixed(2)); // 80% Refund

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

  // Emergency Incident Protocol
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
            status: allCollected ? (order.deliveryType === 'pickup' ? 'Listo en Acopio (Pickup)' : 'En Centro Acopio') : 'En Recolección'
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
        selectedMarket,
        setSelectedMarket,
        deliveryType,
        setDeliveryType,
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
