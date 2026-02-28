/**
 * @fileOverview This file implements a mock for the Adversarial Prompt Search Tool.
 * In production, this would call a backend API that runs Genkit AI flows.
 *
 * - adversarialPromptGenerator - A function that generates an adversarially modified prompt.
 * - AdversarialPromptGeneratorInput - The input type for the adversarialPromptGenerator function.
 * - AdversarialPromptGeneratorOutput - The return type for the adversarialPromptGenerator function.
 */

import {z} from 'zod';

const AdversarialPromptGeneratorInputSchema = z.object({
  initialPrompt: z
    .string()
    .describe(
      'The initial text prompt, assumed to be unsafe, that needs to be modified to become safe.'
    ),
});
export type AdversarialPromptGeneratorInput = z.infer<
  typeof AdversarialPromptGeneratorInputSchema
>;

const AdversarialPromptGeneratorOutputSchema = z.object({
  modifiedPrompt: z
    .string()
    .describe('The minimally modified version of the prompt that is now considered safe.'),
  modificationsDescription: z
    .string()
    .describe('A description of the minimal changes made to the original prompt.'),
  isNowSafe: z
    .boolean()
    .describe('True if the modified prompt is assessed by the LLM as safe, false otherwise.'),
  reasoning: z
    .string()
    .describe(
      'The LLM\u0027s reasoning for why the modified prompt is considered safe and how the changes achieve this.'
    ),
});
export type AdversarialPromptGeneratorOutput = z.infer<
  typeof AdversarialPromptGeneratorOutputSchema
>;

/**
 * Implementation that calls the backend API endpoint: POST /api/adversarial-search
 */
export async function adversarialPromptGenerator(
  input: AdversarialPromptGeneratorInput
): Promise<AdversarialPromptGeneratorOutput> {
  try {
    const response = await fetch('/api/adversarial-search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initialPrompt: input.initialPrompt })
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error calling adversarial-search API:', error);
    throw error;
  }
}
