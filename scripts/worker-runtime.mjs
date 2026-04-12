export function createWorkerRuntime(input) {
  const {
    intervalMs,
    logger,
    runSync
  } = input;

  let started = false;
  let stopping = false;
  let activeRun = null;
  let nextTimer = null;
  let resolveCompletion;

  const completion = new Promise((resolve) => {
    resolveCompletion = resolve;
  });

  function finishIfStopped() {
    if (stopping && !activeRun && nextTimer === null) {
      resolveCompletion();
    }
  }

  async function executeCycle() {
    try {
      activeRun = Promise.resolve(runSync());
      await activeRun;
    } finally {
      activeRun = null;
      if (stopping) {
        finishIfStopped();
        return;
      }

      nextTimer = setTimeout(() => {
        nextTimer = null;
        void executeCycle();
      }, intervalMs);
    }
  }

  return {
    start() {
      if (started) {
        return completion;
      }

      started = true;
      queueMicrotask(() => {
        if (stopping) {
          finishIfStopped();
          return;
        }

        void executeCycle();
      });

      return completion;
    },
    async stop(signal) {
      if (stopping) {
        return completion;
      }

      stopping = true;
      logger.info("worker.shutdown.start", { signal });

      if (nextTimer !== null) {
        clearTimeout(nextTimer);
        nextTimer = null;
      }

      finishIfStopped();
      return completion;
    }
  };
}
