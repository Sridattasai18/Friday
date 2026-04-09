function pickRandom(options) {
  return options[Math.floor(Math.random() * options.length)];
}

export function getResponse(event, context = {}) {
  const {
    streak = 0,
    pendingCount = 0,
    name = 'Datta',
    timeOfDay,
    style = 'dry',
  } = context;

  if (event === 'greetingPreview') {
    if (style === 'warm') return "Good to have you here. Let's get things done.";
    if (style === 'casual') return 'Hey. Ready when you are.';
    return "Efficient. Let's keep it that way.";
  }

  if (event === 'habitDone') {
    if (streak >= 10) {
      return pickRandom([
        `${streak} days. That's not luck anymore.`,
        `${streak} straight. You know what you're doing.`,
      ]);
    }
    if (streak >= 5) {
      return pickRandom([
        `${streak} days in a row. Don't stop now.`,
        `${streak}d streak. Getting real.`,
      ]);
    }
    if (streak >= 2) {
      return pickRandom([
        `Day ${streak}. Keep the chain alive.`,
        `${streak} days. Early but it counts.`,
      ]);
    }
    return pickRandom([
      'Day 1. Everyone starts here.',
      'First one. Come back tomorrow.',
    ]);
  }

  if (event === 'greeting') {
    const suffix = pendingCount === 1 ? '' : 's';

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
      return pendingCount > 0
        ? `Evening, ${name}. ${pendingCount} left — close what you can, be kind to yourself about the rest.`
        : `Evening, ${name}. A quiet day — that counts too.`;
    }

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
      return pendingCount > 0
        ? `Evening, ${name}. ${pendingCount} left — no stress, just finish what you can.`
        : `Evening, ${name}. Chill day.`;
    }

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

    return pendingCount > 0
      ? `Evening, ${name}. ${pendingCount} left. Finish strong or carry it over.`
      : `Evening, ${name}. Clean day.`;
  }

  const responses = {
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
    taskDone: [
      "Done. What's next?",
      'Crossed off.',
      'One less thing.',
      'Good.',
    ],
    streakBroken: [
      "Streak's gone. Start a new one today.",
      'It reset. Happens. Go again.',
      "Back to zero. Doesn't erase what you did before.",
    ],
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
    skipped: [
      "Skipped. Don't make it a habit.",
      'Noted. Tomorrow counts more now.',
      'Alright. Moving on.',
    ],
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
    unknownCommand: [
      "That's not a command. Try /help.",
      "Didn't catch that. /help has the list.",
      'Not sure what that is.',
    ],
  };

  if (responses[event]) {
    return pickRandom(responses[event]);
  }

  return "Didn't catch that. /help has the list.";
}
