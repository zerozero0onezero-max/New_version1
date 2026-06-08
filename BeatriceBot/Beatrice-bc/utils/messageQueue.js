"use strict";
/**
 * utils/messageQueue.js — Per-Thread Message Queue
 *
 * Ensures that when multiple users send messages to the bot at the same
 * time (within the same thread), the bot processes and replies to them
 * in order — one at a time per thread — rather than interleaving.
 *
 * Creator/developer messages always bypass the queue and execute immediately.
 *
 * Usage:
 *   const { enqueue, enqueueCreator, clearThread } = require("./messageQueue.js");
 *   await enqueue(threadID, async () => { ... });
 *   await enqueueCreator(threadID, async () => { ... }); // bypass queue
 */

// Map<threadID, Promise> — tracks the current processing chain per thread
const _chains = new Map();

/**
 * Enqueue a task for a specific thread.
 * The task runs after all previously queued tasks for that thread complete.
 */
function enqueue(threadID, task) {
    const tid = String(threadID);
    const prev = _chains.get(tid) || Promise.resolve();
    const next = prev.then(() => {
        try { return task(); }
        catch (e) { return Promise.reject(e); }
    }).catch(() => {}); // never let one failure break the chain
    _chains.set(tid, next);
    next.finally(() => {
        if (_chains.get(tid) === next) _chains.delete(tid);
    });
    return next;
}

/**
 * Execute a task immediately, bypassing the queue.
 * Used for creator/developer messages and urgent commands.
 * Does NOT affect the existing queue for other users.
 */
function enqueueCreator(threadID, task) {
    // Run immediately without queuing
    return Promise.resolve().then(() => task()).catch(() => {});
}

/**
 * Clear all pending tasks for a thread (e.g. when stfu is triggered).
 * The currently running task cannot be stopped, but new ones are dropped.
 */
function clearThread(threadID) {
    const tid = String(threadID);
    // Replace the chain with a resolved promise so next task starts fresh
    _chains.delete(tid);
}

/**
 * Clear ALL pending queues (e.g. on full bot restart/stfu).
 */
function clearAll() {
    _chains.clear();
}

module.exports = { enqueue, enqueueCreator, clearThread, clearAll };
