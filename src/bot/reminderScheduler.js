const { Op } = require('sequelize')
const { Reminder } = require('../database')
const logger = require('../logger')

const timers = new Map()
const MAX_TIMEOUT_MS = 2_147_000_000

async function deliverReminder(reminder, sock) {
  try {
    await sock.sendMessage(reminder.jid, {
      text: `⏰ Reminder:\n${reminder.message}`,
    })
    await reminder.update({ sentAt: new Date() })
    logger.info({ numero: reminder.numero, reminderId: reminder.id }, 'reminder delivered')
  } catch (error) {
    logger.error({ numero: reminder.numero, reminderId: reminder.id, err: error }, 'failed to deliver reminder')
  } finally {
    timers.delete(reminder.id)
  }
}

function scheduleReminder(reminder, sock) {
  if (timers.has(reminder.id) || reminder.sentAt) return
  const remaining = new Date(reminder.dueAt).getTime() - Date.now()
  const timer = setTimeout(() => {
    timers.delete(reminder.id)
    if (Date.now() < new Date(reminder.dueAt).getTime()) {
      scheduleReminder(reminder, sock)
      return
    }
    deliverReminder(reminder, sock)
  }, Math.min(Math.max(0, remaining), MAX_TIMEOUT_MS))
  timers.set(reminder.id, { numero: reminder.numero, timer })
}

function cancelScheduledReminders(numero) {
  for (const [id, scheduled] of timers) {
    if (scheduled.numero !== numero) continue
    clearTimeout(scheduled.timer)
    timers.delete(id)
  }
}

async function schedulePendingReminders(numero, sock) {
  const reminders = await Reminder.findAll({
    where: { numero, sentAt: { [Op.is]: null } },
    order: [['dueAt', 'ASC']],
  })
  for (const reminder of reminders) scheduleReminder(reminder, sock)
}

module.exports = { scheduleReminder, schedulePendingReminders, cancelScheduledReminders }
