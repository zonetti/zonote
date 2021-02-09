const hotkeys = require('hotkeys-js')

const menuElm = document.getElementById('menu')
const menuButtonElm = document.getElementById('menu-button')
const topButtonCloseAppElm = document.getElementById('close')
const fileElm = document.getElementById('file')

function createMenuButton (text, key) {
  const shortcut = process.platform === 'darwin' ? 'command' : 'ctrl'
  const buttonElm = document.createElement('li')
  buttonElm.innerHTML = text
  const span = document.createElement('span')
  span.innerHTML = `${shortcut} + ${key}`
  buttonElm.appendChild(span)
  return buttonElm
}

const menuButtonNewElm = createMenuButton('new', 'n')
const menuButtonOpenElm = createMenuButton('open...', 'o')
const menuButtonSaveElm = createMenuButton('save', 's')

const menuButtonTabsElm = document.createElement('li')
menuButtonTabsElm.id = 'tabs-menu-button'

const menuButtonExitElm = document.createElement('li')
menuButtonExitElm.innerHTML = 'exit'

menuElm.appendChild(menuButtonNewElm)
menuElm.appendChild(menuButtonOpenElm)
menuElm.appendChild(menuButtonSaveElm)
menuElm.appendChild(menuButtonTabsElm)
menuElm.appendChild(menuButtonExitElm)

EVENTS.on('render', () => {
  document.title = STATE.path || 'zonote'
  fileElm.innerHTML = `${STATE.isDirty ? '*' : ''}${STATE.file}`
  menuButtonTabsElm.innerHTML = STATE.tabs.length > 0 ? 'disable tabs' : 'enable tabs'
})

EVENTS.on('hide menu', () => {
  menuElm.style.display = 'none'
  menuButtonElm.className = ''
})

EVENTS.on('toggle menu', () => {
  if (menuButtonElm.className === 'open') return EVENTS.emit('hide menu')
  menuElm.style.display = 'block'
  menuButtonElm.className = 'open'
  menuElm.style.zIndex = 999 + NEXT_ZINDEX()
})

EVENTS.on('touch state', () => {
  STATE.isDirty = true
  fileElm.innerHTML = `*${STATE.file}`
})

EVENTS.on('lose focus', () => {
  EVENTS.emit('hide menu')
  EVENTS.emit('render')
})

async function handleCurrentState () {
  EVENTS.emit('hide menu')
  if (!STATE.isDirty) return 'continue'
  const chosenAction = DIALOG.showMessageBoxSync({
    message: 'You have unsaved changes in your current file.\nWhat do you want to do?',
    buttons: ['Save changes', 'Discard changes', 'Cancel']
  })
  if (chosenAction === 0) return EVENTS.emit('save file')
  if (chosenAction === 1) return 'continue'
  if (chosenAction === 2) return 'cancel'
}

EVENTS.on('new file', async () => {
  const action = await handleCurrentState()
  if (action === 'cancel') return
  IPC.send('new file')
})

EVENTS.on('open file', async () => {
  const action = await handleCurrentState()
  if (action === 'cancel') return
  let filePath = DIALOG.showOpenDialogSync({
    filters: [ { name: 'zonote files', extensions: ALLOWED_EXTENSIONS } ]
  })
  if (!filePath) return
  filePath = filePath[0]
  IPC.send('open file', filePath)
})

EVENTS.on('save file', async () => {
  EVENTS.emit('hide menu')

  if (!STATE.isDirty) return

  if (STATE.path) {
    await new Promise(resolve => {
      IPC.once('done', (event, filePath) => {
        if (filePath === 'save as') {
          delete STATE.path
          EVENTS.emit('save file')
          return resolve()
        }
        if (filePath) {
          STATE.path = filePath
          STATE.isDirty = false
        }
        resolve()
      })
      IPC.send('save file')
    })

    return EVENTS.emit('render')
  }

  const savePath = DIALOG.showSaveDialogSync({
    filters: [ { name: 'zonote files', extensions: ALLOWED_EXTENSIONS } ],
    properties: [ 'createDirectory' ]
  })

  if (!savePath) return

  await new Promise(resolve => {
    IPC.once('done', (event, filePath, fileName) => {
      if (filePath) {
        STATE.file = fileName
        STATE.path = filePath
        STATE.isDirty = false
      }
      resolve()
    })
    IPC.send('save file', savePath)
  })

  EVENTS.emit('render')
})

EVENTS.on('close', () => {
  EVENTS.emit('hide menu')
  IPC.send('close', STATE)
})

menuElm.onclick = event => event.stopPropagation()

menuButtonElm.onclick = event => {
  event.stopPropagation()
  EVENTS.emit('toggle menu')
}

menuButtonNewElm.onclick =  () => EVENTS.emit('new file')
menuButtonOpenElm.onclick =  () => EVENTS.emit('open file')
menuButtonSaveElm.onclick =  () => EVENTS.emit('save file')
menuButtonTabsElm.onclick = () => EVENTS.emit('toggle tabs')
menuButtonExitElm.onclick =  () => EVENTS.emit('close')
topButtonCloseAppElm.onclick =  () => EVENTS.emit('close')

hotkeys('esc', () => EVENTS.emit('lose focus'))
hotkeys('ctrl+n,command+n', () => EVENTS.emit('new file'))
hotkeys('ctrl+o,command+o', () => EVENTS.emit('open file'))
hotkeys('ctrl+s,command+s', () => EVENTS.emit('save file'))
