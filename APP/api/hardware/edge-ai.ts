import type { VercelRequest, VercelResponse } from '@vercel/node';

// Global In-Memory Store for Real-Time ESP32 Edge AI State
let edgeAIState = {
  totalEntries: 0,
  totalExits: 0,
  currentPassengers: 0,
  availableSeats: 40,
  eventType: 'NO_EVENT',
  confidence: 99.0,
  sensorSequence: 'NONE',
  movementDuration: 0,
  lastEventTime: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
  abnormalCount: 0,
  unauthorizedEntryCount: 0,
  lastUnauthorizedEvent: 'None',
  authorizationStatus: 'AUTHORIZED',
  bookedPassengers: 5,
  actualPassengers: 0,
  occupancyMismatch: false,
  occupancyStatus: 'NORMAL',
  inferenceLocation: 'ESP32 Microcontroller (Local Hardware)',
  deviceStatus: 'ONLINE',
  lastSeen: new Date().toISOString()
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    return res.status(200).json(edgeAIState);
  }

  if (req.method === 'POST') {
    const data = req.body;
    if (!data) {
      return res.status(400).json({ error: 'Missing edge AI payload' });
    }

    edgeAIState = {
      ...edgeAIState,
      totalEntries: data.totalEntries ?? edgeAIState.totalEntries,
      totalExits: data.totalExits ?? edgeAIState.totalExits,
      currentPassengers: data.currentPassengers ?? edgeAIState.currentPassengers,
      availableSeats: data.availableSeats ?? edgeAIState.availableSeats,
      eventType: data.eventType || edgeAIState.eventType,
      confidence: data.confidence !== undefined ? parseFloat(data.confidence) : edgeAIState.confidence,
      sensorSequence: data.sensorSequence || edgeAIState.sensorSequence,
      movementDuration: data.movementDuration !== undefined ? parseInt(data.movementDuration) : edgeAIState.movementDuration,
      lastEventTime: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      abnormalCount: data.abnormalCount ?? edgeAIState.abnormalCount,
      unauthorizedEntryCount: data.unauthorizedEntryCount ?? edgeAIState.unauthorizedEntryCount,
      lastUnauthorizedEvent: data.lastUnauthorizedEvent || edgeAIState.lastUnauthorizedEvent,
      authorizationStatus: data.authorizationStatus || edgeAIState.authorizationStatus,
      bookedPassengers: data.bookedPassengers ?? edgeAIState.bookedPassengers,
      actualPassengers: data.currentPassengers ?? edgeAIState.currentPassengers,
      occupancyMismatch: (data.currentPassengers !== data.bookedPassengers && (data.bookedPassengers || 0) > 0),
      occupancyStatus: (data.currentPassengers !== data.bookedPassengers && (data.bookedPassengers || 0) > 0)
        ? 'OCCUPANCY MISMATCH / REQUIRES VERIFICATION'
        : 'NORMAL',
      lastSeen: new Date().toISOString()
    };

    return res.status(200).json({ success: true, state: edgeAIState });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
