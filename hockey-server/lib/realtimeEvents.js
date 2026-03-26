/**
 * Realtime event emitter — foundation for future WebSocket integration.
 * Currently logs events; replace with WS broadcast when ready.
 */
function emitEvent(type, payload) {
  if (process.env.NODE_ENV !== "production") {
    console.log("[realtime]", type, JSON.stringify(payload));
  }
}

module.exports = { emitEvent };
