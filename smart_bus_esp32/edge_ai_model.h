// ============================================================================
// SMARTBUS+ EDGE AI / TINYML MODEL HEADER FOR ESP32
// Microcontroller: ESP32-WROOM-32 (Xtensa LX6 240MHz, 520KB SRAM)
// Purpose: On-Device Real-Time Movement Sequence & Anomaly Classification
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
#define SENSOR_TIMEOUT_MS    3000  // Max time for IR1->IR2 sequence

// Movement Event Types
enum EventType {
  EVENT_NO_EVENT = 0,
  EVENT_ENTRY    = 1,
  EVENT_EXIT     = 2,
  EVENT_ABNORMAL = 3
};

// ============================================================================
// 1. INPUT FEATURE VECTOR (11 Embedded Features)
// ============================================================================
struct EdgeAIFeatures {
  float ir1Triggered;         // 1.0 = IR1 (Outer) active, 0.0 = inactive
  float ir2Triggered;         // 1.0 = IR2 (Inner) active, 0.0 = inactive
  float sequenceOrder;        // +1.0 for IR1->IR2, -1.0 for IR2->IR1, 0.0 for unknown
  float timeDeltaMs;          // Time difference between sensor triggers (ms)
  float rapidTriggerCount;    // Number of rapid/repeated sensor hits
  float movementDurationMs;   // Total elapsed movement time (ms)
  float prevState;            // Previous movement state (0=none, 1=entry, 2=exit)
  float rfidAuthStatus;       // 1.0 = Valid RFID active, 0.0 = Unauthenticated
  float timeSinceRfidMs;      // Time elapsed since RFID tap (ms)
  float currentPassengers;    // Current physical count onboard
  float bookedPassengers;     // Total online/allocated booked passengers
};

// ============================================================================
// 2. EDGE AI PREDICTION OUTPUT STRUCT
// ============================================================================
struct EdgeAIPrediction {
  EventType eventType;
  float confidence;            // 0.0% to 100.0%
  String eventTypeName;        // "ENTRY", "EXIT", "ABNORMAL", "NO_EVENT"
  String sensorSequence;       // e.g. "IR1 -> IR2", "IR2 -> IR1", "IR1 -> IR1 -> IR2"
  String rfidStatus;           // "AUTHORIZED", "UNAUTHORIZED", "EXPIRED_MISMATCH"
  String occupancyStatus;      // "NORMAL" or "OCCUPANCY MISMATCH / REQUIRES VERIFICATION"
  bool isAuthorizedBoarding;
  bool isUnauthorizedEntry;
  bool isOccupancyMismatch;
  bool isAbnormal;
};

// ============================================================================
// 3. TINYML NEURAL NETWORK WEIGHTS & PARAMETERS
// Model Architecture: 11 Inputs -> 8 Hidden Neurons (ReLU) -> 4 Output Logits (Softmax)
// Quantized FP32 dense layer parameters embedded directly in C++ PROGMEM/RAM
// ============================================================================
#if USE_TINYML_NEURAL_NET

// Layer 1 Weights (11 x 8 = 88 float parameters)
const float PROGMEM W1[11][8] = {
  { 0.45f, -0.12f,  0.88f, -0.34f,  0.15f, -0.05f,  0.62f, -0.20f }, // ir1Triggered
  {-0.30f,  0.55f,  0.72f, -0.10f, -0.22f,  0.40f, -0.15f,  0.50f }, // ir2Triggered
  { 1.25f, -1.10f, -0.45f,  0.80f,  0.95f, -0.85f,  0.30f, -0.60f }, // sequenceOrder
  {-0.02f, -0.01f,  0.08f, -0.05f, -0.03f,  0.04f, -0.02f,  0.01f }, // timeDeltaMs
  {-0.60f, -0.55f,  1.40f, -0.30f, -0.50f,  1.10f, -0.40f,  0.90f }, // rapidTriggerCount
  {-0.01f, -0.01f,  0.05f, -0.02f, -0.01f,  0.03f, -0.02f,  0.02f }, // movementDurationMs
  { 0.10f, -0.15f,  0.20f,  0.05f, -0.10f,  0.15f,  0.05f, -0.08f }, // prevState
  { 0.85f,  0.10f, -0.90f,  0.75f,  0.60f, -0.70f,  0.95f,  0.20f }, // rfidAuthStatus
  {-0.01f, -0.01f,  0.03f, -0.01f, -0.01f,  0.02f, -0.01f,  0.01f }, // timeSinceRfidMs
  {-0.05f,  0.08f,  0.12f, -0.04f, -0.02f,  0.06f, -0.05f,  0.04f }, // currentPassengers
  { 0.04f, -0.06f, -0.10f,  0.03f,  0.02f, -0.05f,  0.04f, -0.03f }  // bookedPassengers
};

// Layer 1 Biases (8 parameters)
const float PROGMEM B1[8] = { 0.10f, 0.05f, -0.20f, 0.15f, 0.08f, -0.15f, 0.12f, 0.02f };

// Layer 2 Weights (8 x 4 = 32 float parameters)
const float PROGMEM W2[8][4] = {
  // NO_EVENT, ENTRY,   EXIT,   ABNORMAL
  { -0.80f,   1.45f, -0.70f, -0.40f },
  { -0.75f,  -0.65f,  1.50f, -0.35f },
  { -0.90f,  -0.50f, -0.60f,  1.85f },
  { -0.60f,   0.90f, -0.40f, -0.20f },
  { -0.70f,   1.10f, -0.80f, -0.30f },
  { -0.85f,  -0.45f,  1.20f,  0.65f },
  { -0.50f,   0.80f, -0.30f, -0.25f },
  { -0.65f,  -0.40f,  0.95f, -0.15f }
};

// Layer 2 Biases (4 parameters)
const float PROGMEM B2[4] = { 0.80f, -0.20f, -0.20f, -0.50f };

// ReLU Activation Function
inline float relu(float v) {
  return v > 0.0f ? v : 0.0f;
}

// ============================================================================
// TinyML Inference Execution
// ============================================================================
inline EdgeAIPrediction predictTinyML(const EdgeAIFeatures& f) {
  EdgeAIPrediction pred;

  // 1. Layer 1 Forward Pass (Input -> Hidden)
  float hidden[8];
  const float x[11] = {
    f.ir1Triggered, f.ir2Triggered, f.sequenceOrder, f.timeDeltaMs,
    f.rapidTriggerCount, f.movementDurationMs, f.prevState,
    f.rfidAuthStatus, f.timeSinceRfidMs, f.currentPassengers, f.bookedPassengers
  };

  for (int j = 0; j < 8; j++) {
    float sum = B1[j];
    for (int i = 0; i < 11; i++) {
      sum += x[i] * W1[i][j];
    }
    hidden[j] = relu(sum);
  }

  // 2. Layer 2 Forward Pass (Hidden -> Output Logits)
  float logits[4];
  for (int k = 0; k < 4; k++) {
    float sum = B2[k];
    for (int j = 0; j < 8; j++) {
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
// 4. FALLBACK RULE-BASED PATTERN CLASSIFIER
// ============================================================================
inline EdgeAIPrediction predictRuleBased(const EdgeAIFeatures& f) {
  EdgeAIPrediction pred;

  if (f.rapidTriggerCount >= 3.0f) {
    pred.eventType = EVENT_ABNORMAL;
    pred.confidence = 90.0f;
  } else if (f.sequenceOrder > 0.5f && f.movementDurationMs < 4000.0f) {
    pred.eventType = EVENT_ENTRY;
    pred.confidence = 94.5f;
  } else if (f.sequenceOrder < -0.5f && f.movementDurationMs < 4000.0f) {
    pred.eventType = EVENT_EXIT;
    pred.confidence = 92.0f;
  } else if (f.ir1Triggered > 0.5f || f.ir2Triggered > 0.5f) {
    pred.eventType = EVENT_ABNORMAL;
    pred.confidence = 65.0f; // Low confidence
  } else {
    pred.eventType = EVENT_NO_EVENT;
    pred.confidence = 99.0f;
  }

  return pred;
}

// ============================================================================
// 5. UNIFIED EDGE AI INFERENCE & CORRELATION FUNCTION
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

  // Format Sensor Sequence string based on feature vector
  if (f.rapidTriggerCount >= 3.0f) {
    pred.sensorSequence = "IR1 -> IR1 -> IR2 (REPEATED)";
  } else if (f.sequenceOrder > 0.5f) {
    pred.sensorSequence = "IR1 -> IR2";
  } else if (f.sequenceOrder < -0.5f) {
    pred.sensorSequence = "IR2 -> IR1";
  } else if (f.ir1Triggered > 0.5f) {
    pred.sensorSequence = "IR1 ONLY";
  } else if (f.ir2Triggered > 0.5f) {
    pred.sensorSequence = "IR2 ONLY";
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
  } else if (pred.eventType == EVENT_EXIT) {
    pred.rfidStatus = "PASSENGER_ALIGHTING";
    pred.isAuthorizedBoarding = false;
    pred.isUnauthorizedEntry = false;
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
