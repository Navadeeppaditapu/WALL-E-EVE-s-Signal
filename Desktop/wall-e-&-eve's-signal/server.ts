import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';

app.use(express.json({ limit: '1mb' }));

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
    timestamp: new Date().toISOString()
  });
});

// Optional Gemini Strategic Reasoning endpoint
app.post('/api/gemini/reason', async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(400).json({
        error: 'GEMINI_API_KEY is not configured on the server. Local autonomous planner will be used.',
        fallback: true
      });
    }

    const {
      step,
      position,
      batteryRemaining,
      timeRemaining,
      batteryCapacity,
      strategyMode,
      entropy,
      peakBelief,
      cluesDiscovered,
      candidateActions,
      recentPath
    } = req.body;

    // Strict validation: NEVER receive ground truth in payload
    if (req.body.groundTruth || req.body.eveActualLocation) {
      return res.status(400).json({
        error: 'Security violation: Ground truth data must never be transmitted to the reasoning layer.',
        fallback: true
      });
    }

    const ai = new GoogleGenAI({ apiKey });

    const systemInstruction = `You are the high-level cognitive coprocessor for WALL-E, an autonomous search rover looking for EVE in an unfamiliar wasteland.
WALL-E has:
- An internal Bayesian belief distribution over possible EVE locations.
- Limited battery and time constraints.
- A requirement to always preserve enough battery to return to base or reach a charging station.

Your task is to review WALL-E's current perception, candidate actions, and resource margin, and recommend the best strategic action from the provided candidate list.
CRITICAL RULES:
1. You can ONLY select an action from the provided Candidate Actions list.
2. If battery is critically close to the safe return threshold, prioritize recharging or returning to base.
3. If peak belief is high (confidence > 0.35) and distance is manageable, favor advancing toward the peak belief or scanning.
4. If uncertainty is high, favor information-gain exploration or clue investigation.
5. Provide a succinct 1-2 sentence rationale grounded in the numerical evidence.`;

    const prompt = `Current Mission State (Step ${step}):
- Current Coordinates: (${position.x}, ${position.y})
- Battery: ${batteryRemaining} / ${batteryCapacity}
- Time Remaining: ${timeRemaining} steps
- Current Tactical Mode: ${strategyMode}
- Belief Uncertainty (Shannon Entropy): ${Number(entropy).toFixed(2)} bits
- Peak Belief Target: (${peakBelief.x}, ${peakBelief.y}) with probability ${(peakBelief.probability * 100).toFixed(1)}%
- Discovered Clues: ${JSON.stringify(cluesDiscovered)}
- Recent Visited Coordinates: ${JSON.stringify(recentPath?.slice(-5) || [])}

Candidate Actions Evaluated by Local Planner:
${candidateActions.map((c: any, i: number) => 
  `${i + 1}. Action: ${c.action} | Utility: ${Number(c.utility).toFixed(2)} | Energy Cost: ${c.energyCost} | InfoGain: ${Number(c.expectedInfoGain || 0).toFixed(2)} | Safe: ${c.isSafe ? 'YES' : 'NO'} | Reason: ${c.explanation}`
).join('\n')}

Select the most rational action and output structured JSON.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            recommendedAction: {
              type: Type.STRING,
              description: 'The exact action name chosen from the candidate actions list'
            },
            strategicRationale: {
              type: Type.STRING,
              description: '1-2 sentence evidence-based explanation for why this action is optimal'
            },
            hypothesizedEveRegion: {
              type: Type.STRING,
              description: 'Brief geographic assessment (e.g., North-East sector beyond the scrap ridge)'
            },
            riskAssessment: {
              type: Type.STRING,
              description: 'Assessment of battery, time, or obstacle hazards'
            }
          },
          required: ['recommendedAction', 'strategicRationale']
        }
      }
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json({
      success: true,
      recommendation: parsed
    });
  } catch (err: any) {
    console.error('Gemini reasoning error:', err);
    return res.status(500).json({
      error: err.message || 'Gemini reasoning failed',
      fallback: true
    });
  }
});

// Vite middleware in dev or static files in production
async function startServer() {
  if (!isProduction) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`WALL-E autonomous agent server listening on port ${PORT}`);
  });
}

startServer();
