const PRESENCE_TTL_MS = 60_000
const SUBSCRIPTION_WAIT_MS = 2_000
const MAX_TRACKED_GROUPS = 100
const socketPresence = new WeakMap()

function normalizeJid(jid) {
  return typeof jid === 'string' ? jid.split('@')[0].split(':')[0] : ''
}

function getSocketState(sock) {
  let state = socketPresence.get(sock)
  if (state) return state

  state = { groups: new Map() }
  sock.ev.on('presence.update', ({ id, presences }) => {
    const group = state.groups.get(id)
    if (!group || !presences) return

    const updatedAt = Date.now()
    for (const [jid, presence] of Object.entries(presences)) {
      group.presences.set(normalizeJid(jid), {
        status: presence.lastKnownPresence,
        updatedAt,
      })
    }
  })
  socketPresence.set(sock, state)
  return state
}

async function getOnlineGroupParticipants(sock, groupJid, participants) {
  const state = getSocketState(sock)
  let group = state.groups.get(groupJid)
  if (!group) {
    group = { presences: new Map() }
    state.groups.set(groupJid, group)
    if (state.groups.size > MAX_TRACKED_GROUPS) {
      state.groups.delete(state.groups.keys().next().value)
    }
  } else {
    state.groups.delete(groupJid)
    state.groups.set(groupJid, group)
  }

  await sock.presenceSubscribe(groupJid)
  await new Promise((resolve) => setTimeout(resolve, SUBSCRIPTION_WAIT_MS))

  const now = Date.now()
  return participants.filter((participant) => {
    const jids = [participant.jid, participant.id, participant.lid, participant.phoneNumber]
    return jids.some((jid) => {
      const presence = group.presences.get(normalizeJid(jid))
      return presence &&
        presence.status !== 'unavailable' &&
        now - presence.updatedAt <= PRESENCE_TTL_MS
    })
  })
}

module.exports = { getOnlineGroupParticipants }
