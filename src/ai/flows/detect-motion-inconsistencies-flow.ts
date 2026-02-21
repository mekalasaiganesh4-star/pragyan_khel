'use server';
/**
 * @fileOverview This file implements a Genkit flow to detect temporal inconsistencies
 * (frame drops or merges) in video streams by analyzing motion patterns between consecutive frames.
 *
 * - detectMotionInconsistencies - A function that processes two consecutive frames
 *   to classify their temporal consistency.
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
  prompt: `You are an expert video motion analyst. Your task is to compare two consecutive video frames and determine if there's a temporal inconsistency, specifically a 'Frame Drop' or 'Frame Merge'.

Analyze the motion, objects, and overall visual continuity between the 'Previous Frame' and 'Current Frame'. Consider the following definitions:

*   **Frame Drop**: This occurs when one or more frames are missing. Visually, this might look like a sudden, abrupt jump in motion or scene content, where objects appear to teleport or skip positions without smooth transition. There is a clear discontinuity that suggests intermediate frames are absent.
*   **Frame Merge**: This occurs when multiple frames are blended or incorrectly combined. Visually, this might look like blurry, ghosting, or blended objects, where elements from different moments in time are visible in a single frame. This often results in a smeared or overlapping appearance.
*   **Normal**: The transition between frames is smooth and consistent with expected motion, indicating no temporal inconsistency.

Based on your analysis, classify the 'Current Frame' (Frame number: {{{frameNumber}}}) relative to the 'Previous Frame'. Provide a confidence score (0.0 to 1.0) and a detailed reasoning for your classification.

Previous Frame: {{media url=previousFrameDataUri}}
Current Frame: {{media url=currentFrameDataUri}}`,
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
