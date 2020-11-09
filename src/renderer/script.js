const EventEmitter = require('events')
const electron = require('electron')

window.STATE = {}
window.GUI_STATE = { zIndex: 1 }
window.EVENTS = new EventEmitter()
window.DIALOG = electron.remote.dialog
window.IPC = electron.ipcRenderer
window.NEXT_ZINDEX = () => '' + ++GUI_STATE.zIndex

// REFACTOR ->
window.CANVAS_PADDING = () => 20
window.TOP_OFFSET = () => {
  const topBarElm = document.getElementById('top')
  const tabsElm = document.getElementById('tabs')
  return topBarElm.offsetHeight + tabsElm.offsetHeight
}
window.ALLOWED_EXTENSIONS = ['znt', 'txt']
window.KEY_ESC = 27
window.KEY_TAB = 9
window.NOTE_MIN_HEIGHT = 100
window.NOTE_MIN_WIDTH = 100
window.GET_NOTE_BY_ID = id => {
  for (let i = 0; i < STATE.notes.length; i++) {
    if (STATE.notes[i].id === id) return STATE.notes[i]
  }
  return null
}
// <- REFACTOR

require('../src/renderer/top_menu')
require('../src/renderer/tabs')
require('../src/renderer/notes')

document.body.onclick = () => EVENTS.emit('lose focus')
document.body.onresize = () => EVENTS.emit('render tab scroll')

EVENTS.on('render', () => IPC.send('update state', STATE))

IPC.on('update state', (event, newState) => {
  STATE = newState
  EVENTS.emit('render')
})

IPC.send('get state')
