import { isJsonMode } from '../db.js'
import { createJsonModel } from '../json-adapter.js'
import { GROUP_DEFAULTS } from '../db-defaults.js'

let GroupDb

if (isJsonMode()) {
  GroupDb = createJsonModel('groups', GROUP_DEFAULTS)
} else {
  const mongoose = (await import('mongoose')).default

  const groupSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    welcome: { type: Boolean, default: false },
    goodbye: { type: Boolean, default: false },
    welcomeMsg: { type: String, default: '' },
    goodbyeMsg: { type: String, default: '' },
    antilink: { type: Boolean, default: false },
    antinotadevoz: { type: Boolean, default: false },
    antimenciongp: { type: Boolean, default: false },
    antisticker: { type: Boolean, default: false },
    antivideo: { type: Boolean, default: false },
    antiimagen: { type: Boolean, default: false },
    antidelete: { type: Boolean, default: false },
    antitoxic: { type: Boolean, default: false },
    nsfw: { type: Boolean, default: false },
    autorespuesta: { type: Boolean, default: false },
    autosticker: { type: Boolean, default: false },
    warnLimit: { type: Number, default: 3 },
    primaryBot: { type: String, default: '' },
    disabledBots: { type: [String], default: [] },
    mainBotSleeping: { type: Boolean, default: false },
    onlyadmin: { type: Boolean, default: false },
    disabledCmds: { type: [String], default: [] },
    disabledCategories: { type: [String], default: [] }
  })

  GroupDb = mongoose.models.Group || mongoose.model('Group', groupSchema)
}

export default GroupDb
