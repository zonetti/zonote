const fs = require('fs')
const path = require('path')
const Store = require('electron-store')
const formatter = require('./formatter')

const store = new Store()

const NEW_STATE = {
  file: 'new file',
  path: null,
  isDirty: false,
  activeTab: 0,
  tabs: [],
  notes: []
}

function saveState (state) {
  store.set('state', state)
}

function getNewState () {
  return JSON.parse(JSON.stringify(NEW_STATE))
}

function getInitialState () {
  const state = store.get('state')

  if (!state) return getNewState()

  state.notes = state.notes.map(note => {
    delete note.id
    return note
  })

  if (state.path) {
    try {
      fs.readFileSync(state.path)
    } catch (err) {
      state.isDirty = true
    }
  }

  return state
}

function saveStateToFile (filePath, state) {
  fs.writeFileSync(filePath, formatter.toText(state))
}

function getStateFromFile (filePath) {
  const parsed = formatter.fromText(fs.readFileSync(filePath).toString())
  return {
    file: path.basename(filePath),
    path: filePath,
    isDirty: false,
    activeTab: 0,
    tabs: parsed.tabs,
    notes: parsed.notes
  }
}

function saveWindowState (data) {
  store.set('win-state', data)
}

function getWindowState () {
  return store.get('win-state')
}

module.exports = {
  saveState,
  getNewState,
  getInitialState,
  saveStateToFile,
  getStateFromFile,
  saveWindowState,
  getWindowState
}
