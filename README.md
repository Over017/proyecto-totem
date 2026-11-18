# SkyFlow · Tótem de check-in

Tótem de autoservicio para una aerolínea: check-in, pesaje de equipaje y pago. Está hecho solo con **HTML, CSS y JavaScript**, sin librerías ni internet, para que funcione igual en cualquier computador o tótem.

## Cómo abrirlo

- **Directo:** doble clic en `index.html`. Se recomienda Chrome o Edge.
- **Modo tótem real:** `chrome --kiosk "ruta/a/index.html?kiosk=1"` abre la página a pantalla completa y oculta el cursor.
- **GitHub Pages:** en el repositorio, *Settings → Pages → Deploy from a branch → main / (root)*.

La pantalla está diseñada a 1280 × 800 y se escala sola a cualquier resolución (1920 × 1080, 1366 × 768, etc.).

## Flujo

1. **Bienvenida:** el pasajero elige español o inglés. Mientras espera, el título alterna entre los dos idiomas. También puede activar el modo accesible.
2. **Reserva:** el pasajero escanea el QR o ingresa el código y el apellido con el teclado en pantalla. Al apellido no le importan las tildes ni las mayúsculas.
3. **Documento:** elige cédula o pasaporte y el tótem simula la lectura del documento.
4. **Vuelo:** se muestra el pase de abordar con la hora de salida en vivo, la puerta, el asiento y el equipaje incluido.
5. **Equipaje:** se pesan las maletas en la balanza, se agregan o se quitan (con opción de deshacer) y el total se recalcula.
6. **Pago:** con tarjeta (lector con clave) o con la cuenta SkyFlow (PIN, tarjeta guardada o millas). **Si no hay nada que cobrar, el tótem se salta el pago.**
7. **Impresión:** imprime el pase de abordar y una etiqueta por cada maleta de bodega.
8. **Listo:** muestra las instrucciones finales y vuelve solo al inicio a los 30 segundos.

El idioma se puede cambiar en cualquier momento con el botón **ES / EN** de arriba. Cambian todos los textos y también el formato de la moneda ($15.000 ↔ CLP 15,000), del peso (24,6 ↔ 24.6 kg) y de las fechas.

## Reglas de equipaje

| Concepto | Valor |
|---|---|
| Maleta de bodega incluida | 1, hasta 23 kg |
| Exceso de peso (23,1 a 32 kg) | $ 15.000 |
| Más de 32 kg | No se acepta: hay que redistribuir y volver a pesar |
| Maleta de bodega adicional | $ 35.000 |
| Maleta de mano | Gratis hasta 10 kg. Si pesa más, se vuelve a pesar o se envía a bodega |
| Máximo por pasajero en el tótem | 2 de bodega + 1 de mano |
| Pago con millas | 1 milla = $ 5 |

Las reglas están en `js/data.js` (objeto `RULES`) y se cambian ahí.

## Datos de prueba

| Reserva | Apellido | Pasajero | Vuelo | Cuenta SkyFlow |
|---|---|---|---|---|
| `HJSUDK` | `PEREZ` | Camila Pérez Rojas · cédula | SCL → LIM | Sí · PIN **1234** · 45.000 millas |
| `QX7M2P` | `SMITH` | John Smith · pasaporte | SCL → MIA | No |

La balanza sigue una secuencia de demostración:

- **Bodega:** 24,6 kg (incluida con exceso), luego 18,2 kg (adicional), etc.
- **Mano:** 11,2 kg (supera el límite), luego 8,4 kg.

## Panel de operador (para la presentación)

Se abre con **Ctrl + Shift + D**, o tocando 5 veces el logo de SkyFlow. Desde ahí se puede:

- Elegir qué reserva entrega el lector QR.
- Fijar el próximo peso de la balanza: 18,2, 24,6 o 33,5 kg en bodega, y 8,4 u 11,2 kg en mano.
- Hacer que el banco **rechace** el próximo pago con tarjeta.
- Mostrar u ocultar las ayudas de demostración, encender o apagar los sonidos y ocultar el cursor.
- Poner pantalla completa o reiniciar la sesión.

## Detalles de un tótem real

- **Inactividad:** si nadie toca la pantalla en 75 s, aparece «¿Sigues ahí?» con una cuenta regresiva. Si nadie responde, se borran los datos y vuelve al inicio.
- **Privacidad:** cancelar, finalizar o la inactividad borran todos los datos. Cada sesión nueva parte en español.
- **Errores de ingreso:** si la reserva no existe, el formulario se sacude y lo avisa. Al tercer intento sugiere pedir ayuda.
- **PIN de la cuenta:** se bloquea tras 3 intentos fallidos y ofrece pagar con tarjeta.
- **Tarjeta rechazada:** se muestra el aviso y se puede reintentar o cambiar de método.
- **Botones de apoyo:** «Necesito ayuda» avisa al personal y «Cancelar» pide confirmación.
- **Sonidos:** los genera el navegador (Web Audio), sin archivos de audio.
- **Teclado físico:** también funciona al presentar desde un notebook, en el código de reserva y en el PIN.

## Accesibilidad

- **Modo accesible:** letra más grande y más contraste.
- **Menos movimiento:** respeta la preferencia «reducir movimiento» del sistema, o el parámetro `?reduce=1`.
- **Lectores de pantalla:** la interfaz tiene etiquetas y anuncios para ellos. Se revisó con axe-core sin observaciones.

## Parámetros de URL (pruebas)

| Parámetro | Efecto |
|---|---|
| `?kiosk=1` | Oculta el cursor |
| `?reduce=1` | Desactiva las animaciones |
| `?speed=5` | Acelera los tiempos (solo para pruebas) |
| `?idle=20` | Segundos de inactividad antes del aviso |
| `?done=10` | Segundos antes de volver al inicio desde «Listo» |

## Estructura

```
index.html          Estructura base
css/styles.css      Diseño, componentes y microanimaciones
css/fonts.css       Fuente Poppins incrustada (funciona sin internet)
js/i18n.js          Textos ES/EN y formatos (moneda, peso, fecha, hora)
js/data.js          Reglas de negocio y reservas de prueba
js/sound.js         Sonidos del tótem
js/icons.js         Íconos (Lucide) y códigos QR
js/app.js           Lógica: pantallas, balanza, pagos, ventanas e inactividad
assets/favicon.svg  Ícono de la pestaña
```

## Créditos

- Íconos: [Lucide](https://lucide.dev), licencia ISC.
- Tipografía: Poppins, de Indian Type Foundry, licencia SIL Open Font License 1.1.

Los textos de ambas licencias están en `LICENSES.md`.
