/* SkyFlow · textos en español e inglés y formatos según idioma (moneda, peso, fecha y hora). */
(function () {
  'use strict';

  const plural = (n, one, many) => (Number(n) === 1 ? one : many);

  const DICT = {
    es: {
      chrome: {
        checkin: 'Check-in', progress: 'Progreso del check-in', help: 'Necesito ayuda', back: 'Volver', cancel: 'Cancelar',
        language: 'Idioma', langChanged: 'Idioma cambiado a español',
      },
      steps: { booking: 'Reserva', bags: 'Equipaje', payment: 'Pago', done: 'Listo', notNeeded: 'No aplica' },
      welcome: {
        chip: 'Check-in en tótem', title: 'Bienvenido a SkyFlow',
        lead: 'Haz tu check-in, pesa tu equipaje y paga en pocos minutos, sin hacer fila.',
        a11y: 'Modo accesible', a11yOn: 'Modo accesible activado', a11yOff: 'Modo accesible desactivado',
        location: 'Aeropuerto de Santiago · Terminal 1 · Tótem 04',
      },
      find: {
        title: 'Escanea el código QR de tu reserva', sub: 'Desde tu celular o impreso. Aceptamos códigos de cualquier canal de venta.',
        phoneTitle: 'En tu celular', phoneText: 'Sube el brillo de la pantalla', printTitle: 'Ticket impreso', printText: 'Mantén el papel plano y sin dobleces',
        readerTitle: 'Acerca el código al lector', readerSub: 'Lo detectamos automáticamente', demoHint: 'Toca el lector para simular la lectura',
        readerAria: 'Lector de código QR. Toca para simular la lectura.',
        reading: 'Leyendo código…', readingSub: 'No retires el código', found: p => `¡Hola, ${p.name}!`, foundSub: 'Encontramos tu reserva',
        manual: 'Ingresar código de reserva',
      },
      manual: {
        title: 'Ingresa tu código de reserva', sub: 'Lo encuentras en el correo de confirmación de tu compra.',
        code: 'Código de reserva', codePh: 'Ej: ABC123', codeHint: p => `${p.n} de 6 caracteres`,
        last: 'Apellido del pasajero', lastPh: 'Como aparece en tu documento', lastHint: 'Sin tildes también funciona',
        info: 'Toca un campo para escribir en él.', keyboard: 'Teclado en pantalla',
        del: 'Borrar', clear: 'Limpiar', space: 'Espacio', nextField: 'Siguiente',
        validate: 'Buscar reserva', demoTip: 'Demo: HJSUDK + PÉREZ o QX7M2P + SMITH',
        error: 'No encontramos una reserva con esos datos. Revisa el código y el apellido.',
        errorHelp: 'Seguimos sin encontrar tu reserva. Toca «Necesito ayuda» y un agente te atenderá.',
      },
      doc: {
        title: '¿Con qué documento viajas?', sub: p => `${p.name}, lo validaremos en el lector del tótem.`,
        rut: 'Cédula de identidad', rutDesc: 'Para pasajeros chilenos o residentes', passport: 'Pasaporte', passportDesc: 'Para pasajeros extranjeros',
        select: 'Seleccionar', suggested: 'Según tu reserva', privacy: 'Tus datos solo se usan para este check-in y se borran al terminar.',
      },
      scan: {
        titleRut: 'Coloca tu cédula en el lector', titlePassport: 'Coloca tu pasaporte en el lector', sub: 'Con la foto hacia arriba y sin moverlo.',
        reading: 'Leyendo documento…', okTitle: 'Documento validado', okSub: 'Los datos coinciden con tu reserva.',
        okLine: p => `${p.name} · ${p.doc}`,
      },
      flight: {
        title: 'Confirma los datos de tu vuelo', sub: 'Revisa que todo esté correcto antes de continuar.',
        duration: p => `${p.h} h ${p.m} min · Directo`, passenger: 'Pasajero', flight: 'Vuelo', date: 'Fecha', departure: 'Salida', boarding: 'Embarque',
        gate: 'Puerta', seat: 'Asiento', cabin: 'Cabina', onTime: 'A tiempo', allowance: 'Equipaje incluido en tu tarifa',
        allowChecked: p => `1 maleta de bodega de ${p.kg} kg`, included: 'Incluida', allowHand: p => `1 maleta de mano de ${p.kg} kg`, handFree: p => `Gratis hasta ${p.kg} kg`,
        confirm: 'Confirmar', notMine: 'Estos no son mis datos', notMineToast: 'Escanea nuevamente o ingresa tu código de reserva.',
        next: 'Después vas a pesar tu equipaje y, si corresponde, pagar los cargos en este mismo tótem.',
      },
      bags: {
        title: 'Equipaje', what: '¿Qué vas a pesar?', checked: 'Bodega', hand: 'De mano',
        free: 'Balanza libre', placeBag: 'Coloca la maleta de pie y presiona Pesar', weigh: 'Pesar maleta',
        weighing: 'Pesando…', weighingBtn: 'Pesando…', dontMove: 'No muevas la maleta', stabilizing: 'Estabilizando el peso…', stable: 'Peso estable', waiting: 'Esperando maleta',
        checkedWeighed: 'Maleta de bodega · peso registrado', handWeighed: 'Maleta de mano · peso registrado',
        checkedOk: p => `Dentro de los ${p.kg} kg incluidos`, checkedOver: p => `Supera los ${p.kg} kg incluidos`, handOk: p => `Dentro del límite de ${p.kg} kg`,
        overHand: p => `Supera el límite de ${p.kg} kg`, overMax: p => `Supera el máximo de ${p.kg} kg`,
        overHandTitle: p => `Pesa ${p.kg}: el máximo en cabina es ${p.max} kg`, overHandText: 'Saca algunas cosas y vuelve a pesarla, o envíala a bodega.',
        overMaxTitle: 'No podemos recibir esta maleta', overMaxText: p => `Supera los ${p.kg} kg permitidos. Redistribuye el contenido y vuelve a pesarla.`,
        reweigh: 'Volver a pesar', reweighing: 'Volviendo a pesar', toChecked: 'Enviar a bodega', noSlots: 'Sin cupo',
        kindFree: 'Maleta de mano gratis', kindIncluded: 'Incluida en tu tarifa', kindIncludedExcess: p => `Incluida con exceso de ${p.kg}`, kindExtra: 'Maleta adicional', kindExtraExcess: 'Adicional con exceso de peso',
        noCost: 'sin costo', add: 'Agregar', limits: p => `Máximo ${p.c} maletas de bodega y ${p.h} de mano por pasajero.`,
        limitChecked: 'Ya registraste el máximo de maletas de bodega', limitHand: 'Ya registraste tu maleta de mano',
        mine: 'Mi equipaje', count: p => (p.n === 0 ? 'Sin maletas' : `${p.n} ${plural(p.n, 'maleta', 'maletas')}`), fare: p => `Tarifa: bodega ${p.c} kg + mano ${p.h} kg`,
        empty: 'Aún no agregas maletas. Pesa la primera en la balanza.',
        handBag: 'Maleta de mano', checkedBag: p => `Maleta de bodega ${p.n}`, cabin: 'Va en la cabina', hold: 'Va en la bodega', fromHand: 'Era de mano',
        chipFree: p => `Gratis · hasta ${p.kg} kg`, chipIncluded: 'Incluida', chipIncludedExcess: p => `Incluida · exceso ${p.kg}`, chipExtra: 'Adicional', chipExtraExcess: 'Adicional + exceso',
        removeOne: p => `Quitar ${p.name}`, removed: 'Maleta quitada', undo: 'Deshacer', removeAll: 'Quitar todo',
        nInfoTitle: p => `Tu tarifa incluye 1 maleta de bodega (${p.kg} kg) y 1 de mano (${p.h} kg)`, nInfoText: p => `Maleta adicional: ${p.extra} · Exceso de peso: ${p.excess}`,
        nHandTitle: 'Maleta de mano registrada sin costo', nHandText: 'Llévala contigo a la cabina: no se entrega en el mesón.',
        nHandOverTitle: 'Tu maleta de mano supera el límite', nHandOverText: p => `Solo es gratis hasta ${p.kg} kg.`,
        nFullTitle: 'Llegaste al máximo de maletas de bodega', nFullText: 'Si necesitas despachar más, acércate al mesón de atención.',
        total: 'Total a pagar', payNext: 'Se paga en el siguiente paso', nothingToPay: 'No tienes nada que pagar',
        continuePay: 'Continuar al pago', continueFree: 'Continuar sin pagos', noBags: 'Viajo sin maletas',
        weighedAnnounce: p => `Peso registrado: ${p.kg}`, addedAnnounce: p => `Maleta agregada. Total a pagar: ${p.total}`, removedAnnounce: p => `Maleta quitada. Total a pagar: ${p.total}`,
      },
      pay: {
        title: 'Elige cómo pagar', sub: 'Revisa el detalle del cobro y elige un método de pago.', detail: 'Detalle del cobro',
        lineExtra: p => `Maleta de bodega adicional · maleta ${p.n} (${p.kg})`, lineExcess: p => `Exceso de peso · maleta ${p.n} (+${p.kg})`, lineHand: p => `Maleta de mano (${p.kg})`,
        free: 'Gratis', total: 'Total a pagar', taxes: 'Valores en pesos chilenos (CLP), impuestos incluidos.', secure: 'Pago seguro: el tótem no guarda los datos de tu tarjeta.',
        card: 'Tarjeta de crédito o débito', cardDesc: 'Inserta, desliza o acerca tu tarjeta al lector', debit: 'Débito', credit: 'Crédito', contactless: 'Sin contacto',
        account: 'Mi cuenta SkyFlow', accountDesc: 'Paga con una tarjeta guardada o con tus millas', noAccount: 'Esta reserva no tiene una cuenta asociada',
        savedCards: 'Tarjetas guardadas', miles: 'Millas', linked: 'Asociada a tu reserva', counter: '¿Prefieres pagar en efectivo? Hazlo en el mesón de atención.',
      },
      card: {
        title: 'Paga con tarjeta', sub: 'Sigue las instrucciones del lector.', total: 'Total', posReading: 'Leyendo…', posPin: 'Ingrese clave', posOk: 'Aprobada',
        posAria: 'Lector de tarjetas. Toca para simular que acercas tu tarjeta.', demoHint: 'Toca el lector para simular tu tarjeta',
        step1: 'Inserta, desliza o acerca tu tarjeta', step2: 'Ingresa tu clave si el lector la pide', step3: 'Espera la confirmación',
        change: 'Cambiar método de pago', declinedTitle: 'El banco rechazó el pago', declinedText: 'No se hizo ningún cargo. Intenta con otra tarjeta o elige otro método.',
      },
      pin: {
        title: 'Ingresa a tu cuenta SkyFlow', sub: 'Para pagar con los medios guardados en tu cuenta de la aerolínea.',
        linked: 'Cuenta asociada a tu reserva', enter: 'Ingresa tu PIN de 4 dígitos', progress: p => `${p.n} de 4 dígitos ingresados`, keypad: 'Teclado numérico',
        private: 'Tu PIN nunca se muestra en pantalla.', wrong: p => `PIN incorrecto. Te ${plural(p.n, 'queda', 'quedan')} ${p.n} ${plural(p.n, 'intento', 'intentos')}.`,
        locked: 'Bloqueamos el ingreso por seguridad. Paga con tarjeta o pide ayuda.', useCard: 'Pagar con tarjeta', login: 'Ingresar',
        forgot: '¿Olvidaste tu PIN? Pide ayuda al personal.', clear: 'Limpiar',
        otherTitle: '¿Otra cuenta?', otherText: 'Escanea este código con la app SkyFlow e ingresa desde tu celular.', otherAria: 'Código QR para ingresar con la app SkyFlow', app: 'App SkyFlow',
        demoTip: p => `Demo: el PIN es ${p.pin}`,
      },
      methods: {
        title: p => `Hola, ${p.name}. ¿Cómo quieres pagar?`, sub: 'Medios guardados en tu cuenta SkyFlow',
        default: p => `Predeterminada · vence ${p.exp}`, expires: p => `Vence ${p.exp}`, miles: 'Millas SkyFlow',
        milesSub: p => `Tienes ${p.have} millas · este pago usa ${p.need}`, milesShort: p => `Tienes ${p.have} millas · necesitas ${p.need}`,
        addCard: 'Agregar otra tarjeta', toPay: 'Total a pagar', willDeduct: 'Se descontarán', milesAmount: p => `${p.n} millas`,
        chargedTo: 'Se cargará a', equivalent: 'Equivale a', milesLeft: p => `${p.total} · te quedarán ${p.left} millas`,
        receiptTo: p => `Comprobante a ${p.email}`, history: 'Quedará en el historial de tu cuenta',
        pay: p => `Pagar ${p.total}`, payMiles: p => `Pagar con ${p.n} millas`, protected: 'Pago protegido · SkyFlow nunca guarda tu clave',
      },
      proc: {
        title: 'Procesando tu pago', stage1: 'Conectando con tu banco…', stage2: 'Autorizando el pago…', stage3: 'Confirmando…',
        milesStage1: 'Validando tus millas…', milesStage2: 'Descontando millas…', wait: 'No te alejes del tótem.',
      },
      approved: {
        title: '¡Pago aprobado!', sentTo: p => `Enviamos el comprobante a ${p.email}.`, printable: 'Puedes imprimir tu comprobante si lo necesitas.',
        amount: 'Monto pagado', method: 'Medio de pago', op: 'N° de operación', date: 'Fecha y hora', cardReader: 'Tarjeta (lector)',
        print: 'Imprimir comprobante', printed: 'Comprobante impreso', printing: 'Imprimiendo tu comprobante…', continue: 'Continuar',
      },
      print: {
        title: 'Imprimiendo tus documentos', sub: 'Retíralos de la ranura que está bajo la pantalla.',
        pass: 'Pase de abordar', tag: p => `Etiqueta de equipaje ${p.n} de ${p.total}`, printer: 'Impresora',
      },
      done: {
        title: p => `¡Todo listo, ${p.name}!`, sub: 'Tu check-in está completo. ¡Buen viaje!', before: 'Antes de ir a la puerta de embarque',
        s1: 'Retira tu pase de abordar', s1tags: p => `Retira tu pase de abordar y ${p.n === 1 ? 'la etiqueta' : `las ${p.n} etiquetas`}`, s1sub: 'Salen por la ranura de impresión del tótem.',
        s2: p => (p.n === 1 ? 'Pega la etiqueta en tu maleta de bodega' : 'Pega cada etiqueta en su maleta de bodega'), s2sub: 'Cada etiqueta tiene el número de su maleta.',
        s3: p => (p.n === 1 ? 'Entrega tu maleta en el mesón de equipaje' : 'Entrega tus maletas en el mesón de equipaje'), s3sub: 'Mesones 18 a 24, a tu derecha.',
        s4: 'Tu maleta de mano va contigo a la cabina', s4sub: p => `Recuerda: gratis hasta ${p.kg} kg.`,
        s5: p => `Embarque a las ${p.time} por la puerta ${p.gate}`, s5sub: 'Pasa por el control de seguridad con tiempo.',
        boardingPass: 'Pase de abordar', tagsPrinted: p => `${p.n} ${plural(p.n, 'etiqueta impresa', 'etiquetas impresas')}`,
        finish: 'Finalizar', countdown: p => `Esta pantalla vuelve al inicio en ${p.s} s`,
      },
      help: { title: 'Avisamos al personal', text: 'Un agente se acercará a este tótem en unos minutos. Puedes seguir con tu check-in mientras tanto.', ticket: p => `Atención N° ${p.n} · agente en camino`, ok: 'Entendido' },
      cancel: { title: '¿Quieres cancelar tu check-in?', text: 'Se borrarán los datos que ingresaste en este tótem.', stay: 'Seguir aquí', yes: 'Sí, cancelar' },
      removeAll: { title: '¿Quitar todas las maletas?', text: 'Tendrás que pesarlas de nuevo si cambias de opinión.', no: 'No, mantener', yes: 'Sí, quitar todo' },
      idle: { title: '¿Sigues ahí?', text: 'Por tu seguridad, borraremos tus datos y volveremos al inicio en', seconds: 'segundos', stay: 'Sí, sigo aquí' },
      app: { title: 'Confirma en tu celular', text: 'Abre la app SkyFlow y aprueba el ingreso a este tótem.', waiting: 'Esperando confirmación…', okTitle: 'Cuenta verificada', okText: 'Ingresaste con tu app SkyFlow.', cancel: 'Cancelar' },
      addCard: { title: 'Agrega tarjetas desde la app', text: 'Por seguridad, las tarjetas nuevas se agregan en la app o en skyflow.example. Mientras tanto, puedes pagar con el lector.', ok: 'Entendido' },
    },

    en: {
      chrome: {
        checkin: 'Check-in', progress: 'Check-in progress', help: 'I need help', back: 'Back', cancel: 'Cancel',
        language: 'Language', langChanged: 'Language changed to English',
      },
      steps: { booking: 'Booking', bags: 'Baggage', payment: 'Payment', done: 'Done', notNeeded: 'Not needed' },
      welcome: {
        chip: 'Self check-in kiosk', title: 'Welcome to SkyFlow',
        lead: 'Check in, weigh your bags and pay in just a few minutes, no lines.',
        a11y: 'Accessible mode', a11yOn: 'Accessible mode on', a11yOff: 'Accessible mode off',
        location: 'Santiago Airport · Terminal 1 · Kiosk 04',
      },
      find: {
        title: 'Scan your booking QR code', sub: 'From your phone or printed. We accept codes from any sales channel.',
        phoneTitle: 'On your phone', phoneText: 'Turn up the screen brightness', printTitle: 'Printed ticket', printText: 'Keep the paper flat and unfolded',
        readerTitle: 'Hold the code to the reader', readerSub: 'We detect it automatically', demoHint: 'Tap the reader to simulate a scan',
        readerAria: 'QR code reader. Tap to simulate a scan.',
        reading: 'Reading code…', readingSub: 'Keep the code still', found: p => `Hi, ${p.name}!`, foundSub: 'We found your booking',
        manual: 'Enter booking code',
      },
      manual: {
        title: 'Enter your booking code', sub: 'You can find it in your booking confirmation email.',
        code: 'Booking code', codePh: 'e.g. ABC123', codeHint: p => `${p.n} of 6 characters`,
        last: 'Passenger last name', lastPh: 'As shown on your ID', lastHint: 'Accents are optional',
        info: 'Tap a field to type in it.', keyboard: 'On-screen keyboard',
        del: 'Delete', clear: 'Clear', space: 'Space', nextField: 'Next',
        validate: 'Find booking', demoTip: 'Demo: HJSUDK + PÉREZ or QX7M2P + SMITH',
        error: "We couldn't find a booking with those details. Check the code and last name.",
        errorHelp: "We still can't find your booking. Tap “I need help” and an agent will assist you.",
      },
      doc: {
        title: 'Which ID are you traveling with?', sub: p => `${p.name}, we'll verify it with the kiosk reader.`,
        rut: 'Chilean ID card', rutDesc: 'For Chilean citizens and residents', passport: 'Passport', passportDesc: 'For international travelers',
        select: 'Select', suggested: 'Based on your booking', privacy: 'Your data is only used for this check-in and is deleted when you finish.',
      },
      scan: {
        titleRut: 'Place your ID card on the reader', titlePassport: 'Place your passport on the reader', sub: 'Photo side up, and hold it still.',
        reading: 'Reading document…', okTitle: 'Document verified', okSub: 'The details match your booking.',
        okLine: p => `${p.name} · ${p.doc}`,
      },
      flight: {
        title: 'Confirm your flight details', sub: 'Make sure everything is correct before you continue.',
        duration: p => `${p.h} h ${p.m} min · Nonstop`, passenger: 'Passenger', flight: 'Flight', date: 'Date', departure: 'Departure', boarding: 'Boarding',
        gate: 'Gate', seat: 'Seat', cabin: 'Cabin', onTime: 'On time', allowance: 'Baggage included in your fare',
        allowChecked: p => `1 checked bag up to ${p.kg} kg`, included: 'Included', allowHand: p => `1 carry-on bag up to ${p.kg} kg`, handFree: p => `Free up to ${p.kg} kg`,
        confirm: 'Confirm', notMine: "These aren't my details", notMineToast: 'Scan again or enter your booking code.',
        next: "Next, you'll weigh your bags and, if needed, pay any fees right here at the kiosk.",
      },
      bags: {
        title: 'Baggage', what: 'What are you weighing?', checked: 'Checked', hand: 'Carry-on',
        free: 'Scale ready', placeBag: 'Stand the bag upright and tap Weigh', weigh: 'Weigh bag',
        weighing: 'Weighing…', weighingBtn: 'Weighing…', dontMove: "Don't move the bag", stabilizing: 'Stabilizing weight…', stable: 'Weight stable', waiting: 'Waiting for a bag',
        checkedWeighed: 'Checked bag · weight recorded', handWeighed: 'Carry-on · weight recorded',
        checkedOk: p => `Within the ${p.kg} kg included`, checkedOver: p => `Over the ${p.kg} kg included`, handOk: p => `Within the ${p.kg} kg limit`,
        overHand: p => `Over the ${p.kg} kg limit`, overMax: p => `Over the ${p.kg} kg maximum`,
        overHandTitle: p => `It weighs ${p.kg}: the cabin limit is ${p.max} kg`, overHandText: 'Take a few things out and weigh it again, or check it in.',
        overMaxTitle: "We can't accept this bag", overMaxText: p => `It's over the ${p.kg} kg allowed. Repack it and weigh it again.`,
        reweigh: 'Weigh again', reweighing: 'Weighing again', toChecked: 'Check it in', noSlots: 'No space left',
        kindFree: 'Free carry-on', kindIncluded: 'Included in your fare', kindIncludedExcess: p => `Included, ${p.kg} overweight`, kindExtra: 'Additional bag', kindExtraExcess: 'Additional and overweight',
        noCost: 'no charge', add: 'Add', limits: p => `Up to ${p.c} checked bags and ${p.h} carry-on per passenger.`,
        limitChecked: "You've reached the checked bag limit", limitHand: "You've already added your carry-on",
        mine: 'My bags', count: p => (p.n === 0 ? 'No bags' : `${p.n} ${plural(p.n, 'bag', 'bags')}`), fare: p => `Fare: checked ${p.c} kg + carry-on ${p.h} kg`,
        empty: "You haven't added any bags yet. Weigh the first one on the scale.",
        handBag: 'Carry-on bag', checkedBag: p => `Checked bag ${p.n}`, cabin: 'In the cabin', hold: 'In the hold', fromHand: 'Was a carry-on',
        chipFree: p => `Free · up to ${p.kg} kg`, chipIncluded: 'Included', chipIncludedExcess: p => `Included · ${p.kg} over`, chipExtra: 'Additional', chipExtraExcess: 'Additional + overweight',
        removeOne: p => `Remove ${p.name}`, removed: 'Bag removed', undo: 'Undo', removeAll: 'Remove all',
        nInfoTitle: p => `Your fare includes 1 checked bag (${p.kg} kg) and 1 carry-on (${p.h} kg)`, nInfoText: p => `Additional bag: ${p.extra} · Overweight fee: ${p.excess}`,
        nHandTitle: 'Carry-on added at no charge', nHandText: "Keep it with you in the cabin; it isn't dropped off at the counter.",
        nHandOverTitle: 'Your carry-on is over the limit', nHandOverText: p => `It's only free up to ${p.kg} kg.`,
        nFullTitle: "You've reached the checked bag limit", nFullText: 'If you need to check more bags, please go to the service counter.',
        total: 'Total due', payNext: "You'll pay in the next step", nothingToPay: 'Nothing to pay',
        continuePay: 'Continue to payment', continueFree: 'Continue, no charges', noBags: "I'm not checking bags",
        weighedAnnounce: p => `Weight recorded: ${p.kg}`, addedAnnounce: p => `Bag added. Total due: ${p.total}`, removedAnnounce: p => `Bag removed. Total due: ${p.total}`,
      },
      pay: {
        title: 'Choose how to pay', sub: 'Review the charges and choose a payment method.', detail: 'Charges',
        lineExtra: p => `Additional checked bag · bag ${p.n} (${p.kg})`, lineExcess: p => `Overweight fee · bag ${p.n} (+${p.kg})`, lineHand: p => `Carry-on bag (${p.kg})`,
        free: 'Free', total: 'Total due', taxes: 'Amounts in Chilean pesos (CLP), taxes included.', secure: "Secure payment: the kiosk doesn't store your card details.",
        card: 'Credit or debit card', cardDesc: 'Insert, swipe or tap your card on the reader', debit: 'Debit', credit: 'Credit', contactless: 'Contactless',
        account: 'My SkyFlow account', accountDesc: 'Pay with a saved card or your miles', noAccount: 'No account is linked to this booking',
        savedCards: 'Saved cards', miles: 'Miles', linked: 'Linked to your booking', counter: 'Prefer to pay cash? You can do so at the service counter.',
      },
      card: {
        title: 'Pay by card', sub: 'Follow the instructions on the reader.', total: 'Total', posReading: 'Reading…', posPin: 'Enter PIN', posOk: 'Approved',
        posAria: 'Card reader. Tap to simulate presenting your card.', demoHint: 'Tap the reader to simulate your card',
        step1: 'Insert, swipe or tap your card', step2: 'Enter your PIN if the reader asks', step3: 'Wait for confirmation',
        change: 'Change payment method', declinedTitle: 'Your bank declined the payment', declinedText: 'You were not charged. Try another card or choose another method.',
      },
      pin: {
        title: 'Sign in to your SkyFlow account', sub: 'To pay with the methods saved in your airline account.',
        linked: 'Account linked to your booking', enter: 'Enter your 4-digit PIN', progress: p => `${p.n} of 4 digits entered`, keypad: 'Numeric keypad',
        private: 'Your PIN is never shown on screen.', wrong: p => `Incorrect PIN. ${p.n} ${plural(p.n, 'attempt', 'attempts')} left.`,
        locked: "For your security, sign-in is locked. Pay by card or ask for help.", useCard: 'Pay by card', login: 'Sign in',
        forgot: 'Forgot your PIN? Ask a staff member.', clear: 'Clear',
        otherTitle: 'Different account?', otherText: 'Scan this code with the SkyFlow app to sign in from your phone.', otherAria: 'QR code to sign in with the SkyFlow app', app: 'SkyFlow app',
        demoTip: p => `Demo: the PIN is ${p.pin}`,
      },
      methods: {
        title: p => `Hi, ${p.name}. How would you like to pay?`, sub: 'Saved in your SkyFlow account',
        default: p => `Default · expires ${p.exp}`, expires: p => `Expires ${p.exp}`, miles: 'SkyFlow Miles',
        milesSub: p => `You have ${p.have} miles · this payment uses ${p.need}`, milesShort: p => `You have ${p.have} miles · you need ${p.need}`,
        addCard: 'Add another card', toPay: 'Total due', willDeduct: "We'll deduct", milesAmount: p => `${p.n} miles`,
        chargedTo: 'Charged to', equivalent: 'Equivalent to', milesLeft: p => `${p.total} · ${p.left} miles left`,
        receiptTo: p => `Receipt sent to ${p.email}`, history: 'Saved to your account history',
        pay: p => `Pay ${p.total}`, payMiles: p => `Pay with ${p.n} miles`, protected: 'Protected payment · SkyFlow never stores your PIN',
      },
      proc: {
        title: 'Processing your payment', stage1: 'Connecting to your bank…', stage2: 'Authorizing payment…', stage3: 'Confirming…',
        milesStage1: 'Checking your miles…', milesStage2: 'Deducting miles…', wait: 'Please stay at the kiosk.',
      },
      approved: {
        title: 'Payment approved!', sentTo: p => `We sent the receipt to ${p.email}.`, printable: 'You can print your receipt if you need it.',
        amount: 'Amount paid', method: 'Payment method', op: 'Transaction no.', date: 'Date and time', cardReader: 'Card (reader)',
        print: 'Print receipt', printed: 'Receipt printed', printing: 'Printing your receipt…', continue: 'Continue',
      },
      print: {
        title: 'Printing your documents', sub: 'Collect them from the slot below the screen.',
        pass: 'Boarding pass', tag: p => `Bag tag ${p.n} of ${p.total}`, printer: 'Printer',
      },
      done: {
        title: p => `You're all set, ${p.name}!`, sub: 'Your check-in is complete. Have a great flight!', before: 'Before heading to your gate',
        s1: 'Collect your boarding pass', s1tags: p => `Collect your boarding pass and ${p.n === 1 ? 'bag tag' : `${p.n} bag tags`}`, s1sub: 'They come out of the kiosk printer slot.',
        s2: p => (p.n === 1 ? 'Attach the tag to your checked bag' : 'Attach each tag to its checked bag'), s2sub: 'Each tag shows the number of its bag.',
        s3: p => (p.n === 1 ? 'Drop off your bag at the baggage counter' : 'Drop off your bags at the baggage counter'), s3sub: 'Counters 18 to 24, on your right.',
        s4: 'Your carry-on travels with you in the cabin', s4sub: p => `Remember: free up to ${p.kg} kg.`,
        s5: p => `Boarding at ${p.time} at gate ${p.gate}`, s5sub: 'Allow enough time for security.',
        boardingPass: 'Boarding pass', tagsPrinted: p => `${p.n} ${plural(p.n, 'bag tag printed', 'bag tags printed')}`,
        finish: 'Finish', countdown: p => `This screen returns to the start in ${p.s} s`,
      },
      help: { title: "We've notified our staff", text: 'An agent will come to this kiosk in a few minutes. You can keep checking in meanwhile.', ticket: p => `Request no. ${p.n} · agent on the way`, ok: 'Got it' },
      cancel: { title: 'Cancel your check-in?', text: 'The details you entered on this kiosk will be deleted.', stay: 'Stay here', yes: 'Yes, cancel' },
      removeAll: { title: 'Remove all bags?', text: "You'll have to weigh them again if you change your mind.", no: 'No, keep them', yes: 'Yes, remove all' },
      idle: { title: 'Are you still there?', text: "For your security, we'll delete your details and return to the start in", seconds: 'seconds', stay: "Yes, I'm here" },
      app: { title: 'Confirm on your phone', text: 'Open the SkyFlow app and approve signing in to this kiosk.', waiting: 'Waiting for confirmation…', okTitle: 'Account verified', okText: 'You signed in with your SkyFlow app.', cancel: 'Cancel' },
      addCard: { title: 'Add cards in the app', text: 'For security, new cards are added in the app or at skyflow.example. Meanwhile, you can pay with the card reader.', ok: 'Got it' },
    },
  };

  const LOCALE = { es: 'es-CL', en: 'en-GB' };
  let lang = 'es';
  const cache = {};
  const fmt = (key, make) => { const k = lang + key; return cache[k] || (cache[k] = make()); };

  function lookup(l, key) {
    return key.split('.').reduce((o, k) => (o && o[k] !== undefined ? o[k] : undefined), DICT[l]);
  }
  function tIn(l, key, p) {
    const v = lookup(l, key);
    if (v === undefined) { console.warn('[i18n] falta', l, key); return '⟦' + key + '⟧'; }
    return typeof v === 'function' ? v(p || {}) : v;
  }

  window.SKY_I18N = {
    DICT,
    get lang() { return lang; },
    setLang(l) { if (DICT[l]) lang = l; },
    t: (key, p) => tIn(lang, key, p),
    tIn,
    money: n => (lang === 'es'
      ? fmt('money', () => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' })).format(n)
      : fmt('money', () => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'CLP', currencyDisplay: 'code' })).format(n).replace(/ /g, ' ')),
    num: n => fmt('num', () => new Intl.NumberFormat(lang === 'es' ? 'es-CL' : 'en-US')).format(n),
    kgNum: n => fmt('kg', () => new Intl.NumberFormat(lang === 'es' ? 'es-CL' : 'en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })).format(n),
    kg(n) { return this.kgNum(n) + ' kg'; },
    time: d => fmt('time', () => new Intl.DateTimeFormat(LOCALE[lang], { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })).format(d),
    dateShort: d => fmt('ds', () => new Intl.DateTimeFormat(LOCALE[lang], { day: 'numeric', month: 'short', year: 'numeric' })).format(d),
    dateLong: d => { const s = fmt('dl', () => new Intl.DateTimeFormat(LOCALE[lang], { weekday: 'long', day: 'numeric', month: 'long' })).format(d); return s.charAt(0).toUpperCase() + s.slice(1); },
  };
})();
