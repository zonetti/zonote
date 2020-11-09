const path = require('path')
const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const stateManager = require('./state_manager')

let state = stateManager.getInitialState()

function close () {
  if (process.platform === 'darwin') return
  app.quit()
}

function start () {
  const minWidth = 800
  const minHeight = 600

  const browserWindowOptions = {
    minWidth,
    minHeight,
    width: minWidth,
    height: minHeight,
    autoHideMenuBar: true,
    frame: false,
    webPreferences: {
      nodeIntegration: true,
      enableRemoteModule: true
    }
  }

  const previousWindowState = stateManager.getWindowState()

  if (previousWindowState) {
    browserWindowOptions.x = previousWindowState.x
    browserWindowOptions.y = previousWindowState.y
    browserWindowOptions.width = previousWindowState.w
    browserWindowOptions.height = previousWindowState.h
  }

  const win = new BrowserWindow(browserWindowOptions)

  if (previousWindowState && previousWindowState.isMaximized) {
    win.maximize()
  }

  win.on('close', () => {
    stateManager.saveWindowState({
      isMaximized: win.isMaximized(),
      x: win.getPosition()[0],
      y: win.getPosition()[1],
      w: win.getSize()[0],
      h: win.getSize()[1]
    })
  })

  ipcMain.on('minimize', () => win.isMinimized() ? win.restore() : win.minimize())
  ipcMain.on('maximize', () => win.isMaximized() ? win.restore() : win.maximize())
  ipcMain.on('get state', event => event.reply('update state', state))
  ipcMain.on('close', close)

  ipcMain.on('update state', (event, guiState) => {
    state = guiState
    stateManager.saveState(state)
  })

  ipcMain.on('new file', event => {
    state = stateManager.getNewState()
    event.reply('update state', state)
  })

  ipcMain.on('open file', (event, filePath) => {
    try {
      state = stateManager.getStateFromFile(filePath)
      event.reply('update state', state)
    } catch (err) {
      console.log(err)
      dialog.showMessageBoxSync({ message: 'Oh no... something is not right' })
      event.reply('done')
    }
  })

  ipcMain.on('save file', (event, savePath) => {
    try {
      const filePath = savePath || state.path
      stateManager.saveStateToFile(filePath, state)
      event.reply('done', filePath, path.basename(filePath))
    } catch (err) {
      console.log(err)
      dialog.showMessageBoxSync({ message: 'Oh no... something is not right' })
      event.reply('done')
    }
  })

  win.setMenu(null)
  win.loadFile(path.join(__dirname, '..', '..', 'static', 'index.html'))
  if (process.argv.includes('--dev')) {
    win.webContents.openDevTools()
  }
}

app.on('window-all-closed', close)

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length !== 0) return
  start()
})

app.whenReady().then(start)
