// Error handler utilities for consistent error reporting

import { botLogger } from "./modernLogger.js";

export const ErrorCategory = {
  MUSIC: 'music',
  AGENT: 'agent',
  STORAGE: 'storage',
  PERMISSION: 'permission',
  VALIDATION: 'validation',
  VOICE: 'voice',
  UNKNOWN: 'unknown'
};

export const ErrorSeverity = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

export function handleInteractionError(error, context = {}) {
  const category = context.category || ErrorCategory.UNKNOWN;
  botLogger.error({ err: error, category, context }, `${category.toUpperCase()}_ERROR`);
}

export function handleSafeError(error, interaction, fallbackMessage = 'An error occurred') {
  handleInteractionError(error, { interaction: interaction?.id });
  
  if (interaction?.isRepliable?.()) {
    return interaction.reply({
      content: fallbackMessage,
      ephemeral: true
    }).catch(e => botLogger.error({ err: e }, 'Failed to reply with error'));
  }
}

export function handleCriticalError(error, context = {}) {
  botLogger.error({ err: error, context }, 'CRITICAL_ERROR');
}

export function handleVoiceError(error, context = {}) {
  const severity = context.severity || ErrorSeverity.MEDIUM;
  botLogger.error({ err: error, severity, context }, 'VOICE_ERROR');
}
