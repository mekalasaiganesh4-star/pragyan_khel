'use server';
/**
 * @fileOverview This file implements a Genkit flow to detect temporal inconsistencies
 * and track ball trajectory in video streams, specifically optimized for sports like cricket.
 *
 * - detectMotionInconsistencies - A function that processes two consecutive frames
 *   to classify their temporal consistency and track object movement.
 * - DetectMotionInconsistenciesInput - The input type for the detectMotionInconsistencies function.
 * - DetectMotionInconsistenciesOutput - The return type for the detectMotionInconsistencies function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const DetectMotionInconsistenciesInputSchema = z.object({
  previousFrameDataUri: z
    .string()
    .describe(
      "A data URI of the previous video frame, including MIME type and Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  currentFrameDataUri: z
    .string()
    .describe(
      "A data URI of the current video frame, including MIME type and Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  frameNumber: z
    .number()
    .int()
    .min(0)
    .describe('The sequential number of the current frame being analyzed.'),
});

export type DetectMotionInconsistenciesInput = z.infer<
  typeof DetectMotionInconsistenciesInputSchema
>;

const DetectMotionInconsistenciesOutputSchema = z.object({
  classification: z
    .union([
      z.literal('Normal'),
      z.literal('Frame Drop'),
      z.literal('Frame Merge'),
    ])
    .describe('The classification of the temporal consistency for the current frame.'),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe('A confidence score (0.0 to 1.0) for the classification.'),
  reasoning: z
    .string()
    .describe('A detailed explanation for the classification.'),
  ballTracking: z.object({
    isDetected: z.boolean().describe('Whether a ball (e.g., a cricket ball) is detected in the current frame.'),
    x: z.number().min(0).max(1).optional().describe('The X coordinate of the ball center, normalized 0.0 to 1.0.'),
    y: z.number().min(0).max(1).optional().describe('The Y coordinate of the ball center, normalized 0.0 to 1.0.'),
  }).optional().describe('Tracking information for a ball in the scene.'),
});

export type DetectMotionInconsistenciesOutput = z.infer<
  typeof DetectMotionInconsistenciesOutputSchema
>;

export async function detectMotionInconsistencies(
  input: DetectMotionInconsistenciesInput
): Promise<DetectMotionInconsistenciesOutput> {
  return detectMotionInconsistenciesFlow(input);
}

const detectMotionInconsistenciesPrompt = ai.definePrompt({
  name: 'detectMotionInconsistenciesPrompt',
  input: { schema: DetectMotionInconsistenciesInputSchema },
  output: { schema: DetectMotionInconsistenciesOutputSchema },
  prompt: `You are an expert video motion analyst specializing in sports physics and temporal consistency. 

Your task is to compare two consecutive video frames (Previous and Current) and:
1. Determine if there's a temporal inconsistency ('Frame Drop', 'Frame Merge', or 'Normal').
2. Identify and track a ball (like a cricket ball) in the 'Current Frame'.

Analysis Criteria:
* **Frame Drop**: Sudden, abrupt jumps in motion. Objects teleport without smooth transition.
* **Frame Merge**: Blurry, ghosting, or blended objects where multiple moments are visible in one frame.
* **Ball Tracking**: Locate the center of the ball in the 'Current Frame'. Provide coordinates normalized from 0.0 (top/left) to 1.0 (bottom/right). This is especially important after a cricketer hits the ball to track its trajectory.

Previous Frame: {{media url=previousFrameDataUri contentType="image/jpeg"}}
Current Frame: {{media url=currentFrameDataUri contentType="image/jpeg"}}
Frame Number: {{{frameNumber}}}`,
});

const detectMotionInconsistenciesFlow = ai.defineFlow(
  {
    name: 'detectMotionInconsistenciesFlow',
    inputSchema: DetectMotionInconsistenciesInputSchema,
    outputSchema: DetectMotionInconsistenciesOutputSchema,
  },
  async (input) => {
    const { output } = await detectMotionInconsistenciesPrompt(input);
    return output!;
  }
);
