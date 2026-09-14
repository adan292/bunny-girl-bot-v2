import chalk from 'chalk'

class MessageQueue {
  constructor(chatId) {
    this.chatId       = chatId
    this.queue        = []
    this.isProcessing = false
    this.lastUsed     = Date.now()
  }

  async add(task) {
    this.lastUsed = Date.now()
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try { resolve(await task()) } catch (e) { reject(e) }
      })
      this.process()
    })
  }

  async process() {
    if (this.isProcessing) return
    this.isProcessing = true

    while (this.queue.length > 0) {
      const task = this.queue.shift()
      try {
        const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 60000))
        await Promise.race([task(), timeout])
      } catch (e) {
        console.error(chalk.bold.redBright(`[QUEUE:${this.chatId}]`), e.message)
      }
    }

    this.isProcessing = false
  }
}

export const chatQueues = new Map()

export function getChatQueue(chatId) {
  if (!chatQueues.has(chatId)) chatQueues.set(chatId, new MessageQueue(chatId))
  return chatQueues.get(chatId)
}

const IDLE_TTL = 3_600_000

setInterval(() => {
  const ahora = Date.now()
  for (const [chatId, q] of chatQueues.entries()) {
    if (q.queue.length === 0 && !q.isProcessing && ahora - q.lastUsed > IDLE_TTL) {
      chatQueues.delete(chatId)
    }
  }
}, IDLE_TTL)
