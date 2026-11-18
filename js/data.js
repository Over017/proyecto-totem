/* SkyFlow · Tótem de check-in — datos de demostración y reglas de negocio.
   En un tótem real estos datos vendrían del sistema de reservas de la aerolínea. */
(function () {
  'use strict';

  // Reglas de equipaje y cobros (CLP)
  const RULES = {
    checkedIncluded: 1,        // maletas de bodega incluidas en la tarifa
    checkedIncludedKg: 23,     // peso incluido por maleta de bodega
    checkedMaxKg: 32,          // peso máximo aceptado por maleta de bodega
    excessFee: 15000,          // cobro por exceso de peso (23,1 a 32 kg)
    extraBagFee: 35000,        // cobro por maleta de bodega adicional
    handMaxKg: 10,             // maleta de mano gratis hasta este peso
    maxChecked: 2,             // máximo de maletas de bodega en el tótem
    maxHand: 1,                // máximo de maletas de mano
    clpPerMile: 5,             // 1 milla = $5 al pagar con millas
  };

  // Hora de salida "en vivo": siempre unas 2 horas después de ahora, redondeada a 5 minutos
  function liveDeparture(offsetMin) {
    const d = new Date(Date.now() + offsetMin * 60000);
    d.setSeconds(0, 0);
    d.setMinutes(Math.ceil(d.getMinutes() / 5) * 5);
    return d;
  }

  // Reservas de demostración
  const BOOKINGS = {
    HJSUDK: {
      code: 'HJSUDK',
      lastName: 'PÉREZ',
      firstName: 'Camila',
      fullName: 'Camila Pérez Rojas',
      doc: 'rut',
      docMasked: '••.•••.678-5',
      flight: 'SF 1234',
      from: { code: 'SCL', city: { es: 'Santiago', en: 'Santiago' } },
      to: { code: 'LIM', city: { es: 'Lima', en: 'Lima' } },
      duration: { h: 3, m: 35 },
      departureOffsetMin: 135,
      boardingBeforeMin: 40,
      gate: '12',
      seat: '18C',
      seq: '042',
      cabin: { es: 'Económica', en: 'Economy' },
      account: {
        email: 'c•••••@correo.com',
        initials: 'CP',
        pin: '1234',
        miles: 45000,
        cards: [
          { id: 'visa', brand: 'Visa', last4: '1234', exp: '08/28', default: true },
          { id: 'mc', brand: 'Mastercard', last4: '5678', exp: '03/27' },
        ],
      },
    },
    QX7M2P: {
      code: 'QX7M2P',
      lastName: 'SMITH',
      firstName: 'John',
      fullName: 'John Smith',
      doc: 'passport',
      docMasked: 'P•••••4821',
      flight: 'SF 2087',
      from: { code: 'SCL', city: { es: 'Santiago', en: 'Santiago' } },
      to: { code: 'MIA', city: { es: 'Miami', en: 'Miami' } },
      duration: { h: 8, m: 40 },
      departureOffsetMin: 165,
      boardingBeforeMin: 45,
      gate: '24',
      seat: '3A',
      seq: '017',
      cabin: { es: 'Premium Economy', en: 'Premium Economy' },
      account: null,
    },
  };

  // Secuencias de peso de la balanza (demo). El panel de operador puede fijar el próximo peso.
  const SCALE_SEQUENCE = {
    checked: [24.6, 18.2, 21.4, 16.8, 22.7],
    hand: [11.2, 8.4, 7.6, 9.1],
  };

  window.SKY_DATA = { RULES, BOOKINGS, SCALE_SEQUENCE, liveDeparture };
})();
