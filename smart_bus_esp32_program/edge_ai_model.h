// ============================================================================
// SMARTBUS+ EDGE AI / TINYML MODEL HEADER FOR ESP32 (SINGLE IR SENSOR)
// Microcontroller: ESP32-WROOM-32 (Xtensa LX6 240MHz, 520KB SRAM)
// Purpose: On-Device Real-Time Single-IR Movement Pattern & Security Classification
// ============================================================================

#ifndef EDGE_AI_MODEL_H
#define EDGE_AI_MODEL_H

#include <Arduino.h>

// ============================================================================
// INFERENCE ENGINE MODE SELECTION
// 1 = Active TinyML Neural Network Classifier (2-Layer Dense MLP Model)
// 0 = Rule-Based Fallback Engine
// ============================================================================
#define USE_TINYML_NEURAL_NET 1

// Thresholds
#define CONFIDENCE_THRESHOLD 75.0f // Confidence < 75% -> Marked as ABNORMAL / UNCERTAIN
#define SENSOR_TIMEOUT_MS    3000  // Max time window

// Movement Event Types
enum EventType {
  EVENT_NO_EVENT = 0,
  EVENT_ENTRY    = 1,
  EVENT_EXIT     = 2,
  EVENT_ABNORMAL = 3
};

// ============================================================================
// 1. INPUT FEATURE VECTOR (Single IR Sensor Architecture - 8 Features)
// ============================================================================
struct EdgeAIFeatures {
  float irTriggered;          // 1.0 = IR Active, 0.0 = Inactive
  float pulseWidthMs;         // Pulse duration of sensor interruption (ms)
  float rapidTriggerCount;    // Count of rapid repeated spikes
  float rfidAuthStatus;       // 1.0 = Valid RFID active, 0.0 = Unauthenticated
  float timeSinceRfidMs;      // Time elapsed since RFID tap (ms)
  float currentPassengers;    // Current physical count onboard
  float bookedPassengers;     // Total allocated booked passengers
  float availableSeats;       // Remaining available seats
};

// ============================================================================
// 2. EDGE AI PREDICTION OUTPUT STRUCT
// ============================================================================
struct EdgeAIPrediction {
  EventType eventType;
  float confidence;            // 0.0% to 100.0%
  String eventTypeName;        // "ENTRY", "EXIT", "ABNORMAL", "NO_EVENT"
  String sensorSequence;       // e.g. "SINGLE_IR_PASS", "SINGLE_IR_RAPID"
  String rfidStatus;           // "AUTHORIZED", "UNAUTHORIZED", "EXPIRED_MISMATCH"
  String occupancyStatus;      // "NORMAL" or "OCCUPANCY MISMATCH / REQUIRES VERIFICATION"
  bool isAuthorizedBoarding;
  bool isUnauthorizedEntry;
  bool isOccupancyMismatch;
  bool isAbnormal;
};

// ============================================================================
// 3. TINYML NEURAL NETWORK WEIGHTS & PARAMETERS (SINGLE IR MODEL)
// Model Architecture: 8 Inputs -> 6 Hidden Neurons (ReLU) -> 4 Output Logits (Softmax)
// Quantized FP32 dense layer parameters embedded directly in C++ PROGMEM/RAM
// ============================================================================
#if USE_TINYML_NEURAL_NET

// Layer 1 Weights (8 x 6 = 48 float parameters)
const float PROGMEM W1[8][6] = {
  { 0.75f, -0.22f,  0.92f, -0.44f,  0.35f, -0.15f }, // irTriggered
  { 0.02f, -0.01f,  0.06f, -0.03f, -0.02f,  0.03f }, // pulseWidthMs
  {-0.70f, -0.65f,  1.50f, -0.40f, -0.60f,  1.20f }, // rapidTriggerCount
  { 1.15f,  0.20f, -1.10f,  0.85f,  0.75f, -0.80f }, // rfidAuthStatus
  {-0.01f, -0.01f,  0.04f, -0.01f, -0.01f,  0.02f }, // timeSinceRfidMs
  {-0.05f,  0.08f,  0.10f, -0.04f, -0.02f,  0.06f }, // currentPassengers
  { 0.04f, -0.06f, -0.08f,  0.03f,  0.02f, -0.05f }, // bookedPassengers
  {-0.03f,  0.05f,  0.07f, -0.02f, -0.01f,  0.04f }  // availableSeats
};

// Layer 1 Biases (6 parameters)
const float PROGMEM biasLayer1[6] = { 0.12f, 0.05f, -0.25f, 0.18f, 0.10f, -0.12f };

// Layer 2 Weights (6 x 4 = 24 float parameters)
const float PROGMEM W2[6][4] = {
  // NO_EVENT, ENTRY,   EXIT,   ABNORMAL
  { -0.85f,   1.55f, -0.60f, -0.30f },
  { -0.70f,  -0.55f,  1.30f, -0.25f },
  { -0.95f,  -0.45f, -0.50f,  1.95f },
  { -0.65f,   1.10f, -0.30f, -0.15f },
  { -0.75f,   1.25f, -0.70f, -0.25f },
  { -0.80f,  -0.35f,  1.10f,  0.75f }
};

// Layer 2 Biases (4 parameters)
const float PROGMEM biasLayer2[4] = { 0.85f, -0.15f, -0.30f, -0.40f };

// ReLU Activation Function
inline float relu(float v) {
  return v > 0.0f ? v : 0.0f;
}

// ============================================================================
// TinyML Inference Execution (Single IR Sensor)
// ============================================================================
inline EdgeAIPrediction predictTinyML(const EdgeAIFeatures& f) {
  EdgeAIPrediction pred;

  // 1. Layer 1 Forward Pass (Input -> Hidden)
  float hidden[6];
  const float x[8] = {
    f.irTriggered, f.pulseWidthMs, f.rapidTriggerCount,
    f.rfidAuthStatus, f.timeSinceRfidMs, f.currentPassengers,
    f.bookedPassengers, f.availableSeats
  };

  for (int j = 0; j < 6; j++) {
    float sum = biasLayer1[j];
    for (int i = 0; i < 8; i++) {
      sum += x[i] * W1[i][j];
    }
    hidden[j] = relu(sum);
  }

  // 2. Layer 2 Forward Pass (Hidden -> Output Logits)
  float logits[4];
  for (int k = 0; k < 4; k++) {
    float sum = biasLayer2[k];
    for (int j = 0; j < 6; j++) {
      sum += hidden[j] * W2[j][k];
    }
    logits[k] = sum;
  }

  // 3. Softmax Activation Function
  float maxLogit = logits[0];
  for (int k = 1; k < 4; k++) {
    if (logits[k] > maxLogit) maxLogit = logits[k];
  }

  float expSum = 0.0f;
  float probs[4];
  for (int k = 0; k < 4; k++) {
    probs[k] = expf(logits[k] - maxLogit);
    expSum += probs[k];
  }

  int bestClass = 0;
  float maxProb = 0.0f;
  for (int k = 0; k < 4; k++) {
    probs[k] /= expSum;
    if (probs[k] > maxProb) {
      maxProb = probs[k];
      bestClass = k;
    }
  }

  pred.eventType = (EventType)bestClass;
  pred.confidence = maxProb * 100.0f;

  return pred;
}
#endif // USE_TINYML_NEURAL_NET

// ============================================================================
// 4. FALLBACK RULE-BASED PATTERN CLASSIFIER (SINGLE IR SENSOR)
// ============================================================================
inline EdgeAIPrediction predictRuleBased(const EdgeAIFeatures& f) {
  EdgeAIPrediction pred;

  if (f.rapidTriggerCount >= 3.0f || f.pulseWidthMs > 2500.0f) {
    pred.eventType = EVENT_ABNORMAL;
    pred.confidence = 88.0f;
  } else if (f.irTriggered > 0.5f && f.pulseWidthMs >= 100.0f && f.pulseWidthMs <= 2000.0f) {
    pred.eventType = EVENT_ENTRY;
    pred.confidence = 94.0f;
  } else if (f.irTriggered > 0.5f) {
    pred.eventType = EVENT_ABNORMAL;
    pred.confidence = 65.0f;
  } else {
    pred.eventType = EVENT_NO_EVENT;
    pred.confidence = 99.0f;
  }

  return pred;
}

// ============================================================================
// 5. UNIFIED EDGE AI INFERENCE & CORRELATION FUNCTION (SINGLE IR)
// ============================================================================
inline EdgeAIPrediction runEdgeAIInference(const EdgeAIFeatures& f) {
  EdgeAIPrediction pred;

#if USE_TINYML_NEURAL_NET
  pred = predictTinyML(f);
#else
  pred = predictRuleBased(f);
#endif

  // Confidence Thresholding: Low confidence predictions are flagged as ABNORMAL
  if (pred.confidence < CONFIDENCE_THRESHOLD && pred.eventType != EVENT_NO_EVENT) {
    pred.eventType = EVENT_ABNORMAL;
    pred.isAbnormal = true;
  } else {
    pred.isAbnormal = (pred.eventType == EVENT_ABNORMAL);
  }

  // Set Type Name String
  switch (pred.eventType) {
    case EVENT_ENTRY:    pred.eventTypeName = "ENTRY"; break;
    case EVENT_EXIT:     pred.eventTypeName = "EXIT"; break;
    case EVENT_ABNORMAL: pred.eventTypeName = "ABNORMAL"; break;
    default:             pred.eventTypeName = "NO_EVENT"; break;
  }

  // Format Sensor Sequence string
  if (f.rapidTriggerCount >= 3.0f) {
    pred.sensorSequence = "SINGLE_IR_RAPID_SPIKE";
  } else if (f.irTriggered > 0.5f) {
    pred.sensorSequence = "SINGLE_IR_PASS (" + String((int)f.pulseWidthMs) + "ms)";
  } else {
    pred.sensorSequence = "NONE";
  }

  // RFID Correlation
  if (pred.eventType == EVENT_ENTRY) {
    if (f.rfidAuthStatus > 0.5f) {
      pred.rfidStatus = "AUTHORIZED";
      pred.isAuthorizedBoarding = true;
      pred.isUnauthorizedEntry = false;
    } else {
      pred.rfidStatus = "UNAUTHORIZED";
      pred.isAuthorizedBoarding = false;
      pred.isUnauthorizedEntry = true;
    }
  } else {
    pred.rfidStatus = (f.rfidAuthStatus > 0.5f) ? "AUTHORIZED_PENDING" : "UNAUTHENTICATED";
    pred.isAuthorizedBoarding = false;
    pred.isUnauthorizedEntry = false;
  }

  // Seat Occupancy Validation
  if (f.currentPassengers != f.bookedPassengers && f.bookedPassengers > 0) {
    pred.occupancyStatus = "OCCUPANCY MISMATCH / REQUIRES VERIFICATION";
    pred.isOccupancyMismatch = true;
  } else {
    pred.occupancyStatus = "NORMAL";
    pred.isOccupancyMismatch = false;
  }

  return pred;
}

#endif // EDGE_AI_MODEL_H
