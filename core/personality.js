/**
 * ════════════════════════════════════════════════════════════════════════════
 * PERSONALITY.JS - Response Generation Engine
 * ════════════════════════════════════════════════════════════════════════════
 * 
 * Generates all user-facing messages with personality variation.
 * Friday has three personality styles:
 * - dry: efficient, minimal, direct (default)
 * - warm: supportive, compassionate, encouraging
 * - casual: relaxed, friendly, laid-back
 * 
 * The personality applies to:
 * - Greeting messages (time-of-day + pending count aware)
 * - Action confirmations (task added, marked done, etc.)
 * - Habit streak messages (scaled to streak length)
 * 
 * ════════════════════════════════════════════════════════════════════════════
 */

// ─────────────────────────────────────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Pick a random string from an array
 * @param {Array<string>} options - Array of possible responses
 * @returns {string} Random selection
 * @private
 */
function pickRandom(options) {
  return options[Math.floor(Math.random() * options.length)];
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate a response message based on event and context
 * 
 * @param {string} event - Event type (e.g., 'greeting', 'taskAdded', 'habitDone')
 * @param {Object} context - Context data for response generation
 * @param {number} context.streak - Current habit streak (for 'habitDone')
 * @param {number} context.pendingCount - Number of pending tasks (for 'greeting')
 * @param {string} context.name - User's name (for 'greeting')
 * @param {string} context.timeOfDay - 'morning' | 'afternoon' | 'evening' (for 'greeting')
 * @param {string} context.style - 'dry' | 'warm' | 'casual' (greeting personality)
 * @returns {string} Generated response message
 */
export function getResponse(event, context = {}) {
  const {
    streak = 0,
    pendingCount = 0,
    name = 'Datta',
    timeOfDay,
    style = 'dry',
  } = context;

  // ───────────────────────────────────────────────────────────────────────────
  // SPECIAL EVENTS - Dynamic responses based on context
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Greeting preview (shown in onboarding settings)
   * - Short, static preview for each style
   */
  if (event === 'greetingPreview') {
    if (style === 'warm') return "Good to have you here. Let's get things done.";
    if (style === 'casual') return 'Hey. Ready when you are.';
    return "Efficient. Let's keep it that way.";
  }

  /**
   * Habit completion message (scaled to streak length)
   * - Longer streaks get more impressive messages
   * - Day 1 is encouraging but realistic
   */
  if (event === 'habitDone') {
    // 10+ days: Expert level
    if (streak >= 10) {
      return pickRandom([
        `${streak} days. That's not luck anymore.`,
        `${streak} straight. You know what you're doing.`,
      ]);
    }
    // 5-9 days: Getting serious
    if (streak >= 5) {
      return pickRandom([
        `${streak} days in a row. Don't stop now.`,
        `${streak}d streak. Getting real.`,
      ]);
    }
    // 2-4 days: Early momentum
    if (streak >= 2) {
      return pickRandom([
        `Day ${streak}. Keep the chain alive.`,
        `${streak} days. Early but it counts.`,
      ]);
    }
    // Day 1: Starting out
    return pickRandom([
      'Day 1. Everyone starts here.',
      'First one. Come back tomorrow.',
    ]);
  }

  /**
   * Main greeting (shown on app screen)
   * - Varies by time of day (morning/afternoon/evening)
   * - Varies by pending count (0 vs 1 vs multiple)
   * - Varies by personality style (dry/warm/casual)
   */
  if (event === 'greeting') {
    const suffix = pendingCount === 1 ? '' : 's'; // Pluralization

    // ─── WARM STYLE ───
    if (style === 'warm') {
      if (timeOfDay === 'morning') {
        return pendingCount > 0
          ? `Good morning, ${name}. ${pendingCount} thing${suffix} waiting — one step at a time.`
          : `Good morning, ${name}. Nothing on the list yet — a gentle start.`;
      }
      if (timeOfDay === 'afternoon') {
        return pendingCount > 0
          ? `Afternoon, ${name}. ${pendingCount} still open — you've got time.`
          : `Afternoon, ${name}. All clear so far — nice pace.`;
      }
      // Evening
      return pendingCount > 0
        ? `Evening, ${name}. ${pendingCount} left — close what you can, be kind to yourself about the rest.`
        : `Evening, ${name}. A quiet day — that counts too.`;
    }

    // ─── CASUAL STYLE ───
    if (style === 'casual') {
      if (timeOfDay === 'morning') {
        return pendingCount > 0
          ? `Hey ${name}, morning. ${pendingCount} thing${suffix} on the list.`
          : `Hey ${name}. List's empty — slow morning.`;
      }
      if (timeOfDay === 'afternoon') {
        return pendingCount > 0
          ? `Hey ${name}. Still ${pendingCount} hanging there.`
          : `Hey ${name}. Nothing pending — smooth afternoon.`;
      }
      // Evening
      return pendingCount > 0
        ? `Evening, ${name}. ${pendingCount} left — no stress, just finish what you can.`
        : `Evening, ${name}. Chill day.`;
    }

    // ─── DRY STYLE (default) ───
    if (timeOfDay === 'morning') {
      return pendingCount > 0
        ? `Morning, ${name}. ${pendingCount} thing${suffix} to get through.`
        : `Morning, ${name}. Nothing on the list yet.`;
    }
    if (timeOfDay === 'afternoon') {
      return pendingCount > 0
        ? `Afternoon, ${name}. ${pendingCount} still pending.`
        : `Afternoon, ${name}. Clear so far.`;
    }
    // Evening
    return pendingCount > 0
      ? `Evening, ${name}. ${pendingCount} left. Finish strong or carry it over.`
      : `Evening, ${name}. Clean day.`;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // STANDARD EVENTS - Random selection from predefined responses
  // ───────────────────────────────────────────────────────────────────────────

  const responses = {
    // Task/habit creation
    taskAdded: [
      'Added. Now actually do it.',
      'On the list.',
      'Got it.',
      'Noted.',
      'Logged.',
    ],
    habitAdded: [
      'New habit. Day 1 starts now.',
      'Logged. Show up tomorrow too.',
      'Added. Consistency is the whole game.',
    ],
    
    // Status changes
    taskDone: [
      "Done. What's next?",
      'Crossed off.',
      'One less thing.',
      'Good.',
    ],
    taskStarted: [
      'On it. Finish strong.',
      'Started. Don't let it linger.',
      'Working on it.',
      'In progress.',
    ],
    taskUpdated: [
      'Updated.',
      'Changed.',
      'Noted the edit.',
    ],
    skipped: [
      "Skipped. Don't make it a habit.",
      'Noted. Tomorrow counts more now.',
      'Alright. Moving on.',
    ],
    
    // Streak management
    streakBroken: [
      "Streak's gone. Start a new one today.",
      'It reset. Happens. Go again.',
      "Back to zero. Doesn't erase what you did before.",
    ],
    
    // List states
    allTasksDone: [
      "List is clear. That's a real day.",
      'Everything done. Rare.',
      'Clean list.',
    ],
    noTasks: [
      'Nothing on the list. Add something worth doing.',
      'Clean slate. Fill it.',
      'No tasks yet.',
    ],
    
    // Deletion & cleanup
    deleted: [
      'Gone.',
      'Removed.',
      'Deleted.',
    ],
    cleared: [
      'Cleared out the done ones.',
      'Cleaned up.',
      'Done tasks removed.',
    ],
    
    // Errors
    unknownCommand: [
      "That's not a command. Try /help.",
      "Didn't catch that. /help has the list.",
      'Not sure what that is.',
    ],
  };

  // Return random response for known events, fallback for unknown
  if (responses[event]) {
    return pickRandom(responses[event]);
  }

  return "Didn't catch that. /help has the list.";
}
